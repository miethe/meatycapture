/**
 * Indexed Search
 *
 * Uses the catalog + BM25 text index for fast search when available.
 * Falls back to full document scan when index artifacts are missing.
 */

import { promises as fs } from 'node:fs';
import type { RequestLogItem } from '@core/models';
import type { SearchMatch, MatchedField } from '@cli/formatters';
import {
  readCatalog,
  getIndexPaths,
  type CatalogRecord,
  readCatalogMeta,
} from '@cli/indexing/catalog.js';
import { readTextIndex, tokenizeText, type TextIndex } from '@cli/indexing/text-index.js';
import { parseQuery, type MatchMode, type QueryComponent } from '@cli/handlers/search.js';

export interface IndexedSearchOptions {
  matchMode: MatchMode;
  limit: number;
}

interface ScoredMatch {
  record: CatalogRecord;
  matchedFields: MatchedField[];
  score?: number;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

function matchString(haystack: string, needle: string, mode: MatchMode): boolean {
  const lowerHaystack = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();

  switch (mode) {
    case 'full':
      return lowerHaystack === lowerNeedle;
    case 'starts':
      return lowerHaystack.startsWith(lowerNeedle);
    case 'contains':
      return lowerHaystack.includes(lowerNeedle);
  }
}

function matchComponent(
  record: CatalogRecord,
  component: QueryComponent,
  mode: MatchMode
): MatchedField | null {
  switch (component.type) {
    case 'tag': {
      const matched = record.tags.find((tag) => matchString(tag, component.value, mode));
      return matched ? { field: 'tags', match_text: matched } : null;
    }
    case 'item_type': {
      return matchString(record.type, component.value, mode)
        ? { field: 'type', match_text: record.type }
        : null;
    }
    case 'status': {
      return matchString(record.status, component.value, mode)
        ? { field: 'status', match_text: record.status }
        : null;
    }
    case 'domain': {
      const matched = record.domain.find((entry) => matchString(entry, component.value, mode));
      return matched ? { field: 'domain', match_text: matched } : null;
    }
    case 'subdomain': {
      const matched = record.subdomain.find((entry) => matchString(entry, component.value, mode));
      return matched ? { field: 'subdomain', match_text: matched } : null;
    }
    case 'context': {
      if (!record.context) {
        return null;
      }
      return matchString(record.context, component.value, mode)
        ? { field: 'context', match_text: record.context }
        : null;
    }
    case 'text':
      return null;
  }
}

function matchStructuredComponents(
  record: CatalogRecord,
  components: QueryComponent[],
  mode: MatchMode
): MatchedField[] | null {
  const matchedFields: MatchedField[] = [];

  for (const component of components) {
    if (component.type === 'text') {
      continue;
    }
    const matched = matchComponent(record, component, mode);
    if (!matched) {
      return null;
    }
    matchedFields.push(matched);
  }

  return matchedFields;
}

function expandQueryTerms(index: TextIndex, queryTerms: string[], mode: MatchMode): string[] {
  if (mode === 'full') {
    return Array.from(new Set(queryTerms));
  }

  const indexTerms = Object.keys(index.doc_freq);
  const expanded = new Set<string>();

  for (const term of queryTerms) {
    const lowerTerm = term.toLowerCase();
    for (const candidate of indexTerms) {
      if (mode === 'starts' && candidate.startsWith(lowerTerm)) {
        expanded.add(candidate);
      }
      if (mode === 'contains' && candidate.includes(lowerTerm)) {
        expanded.add(candidate);
      }
    }
  }

  return Array.from(expanded);
}

function scoreDoc(index: TextIndex, docId: string, terms: string[]): number {
  const doc = index.docs[docId];
  if (!doc || terms.length === 0 || index.doc_count === 0 || index.avg_doc_length === 0) {
    return 0;
  }

  const { k1, b } = index.config;
  const docLen = doc.length || 0;
  const avgLen = index.avg_doc_length || 1;
  let score = 0;

  for (const term of terms) {
    const tf = (doc.title_terms[term] ?? 0) + (doc.notes_terms[term] ?? 0);
    if (tf === 0) {
      continue;
    }

    const df = index.doc_freq[term] ?? 0;
    const idf = Math.log(1 + (index.doc_count - df + 0.5) / (df + 0.5));
    const denom = tf + k1 * (1 - b + b * (docLen / avgLen));
    score += idf * ((tf * (k1 + 1)) / denom);
  }

  return score;
}

function buildTextMatches(
  index: TextIndex,
  record: CatalogRecord,
  terms: string[]
): MatchedField[] {
  const doc = index.docs[record.item_id];
  if (!doc) {
    return [];
  }

  const titleMatches = terms.filter((term) => doc.title_terms[term] !== undefined);
  const notesMatches = terms.filter((term) => doc.notes_terms[term] !== undefined);
  const matched: MatchedField[] = [];

  if (titleMatches.length > 0) {
    matched.push({
      field: 'title',
      match_text: titleMatches.slice(0, 5).join(' '),
    });
  }

  if (notesMatches.length > 0) {
    matched.push({
      field: 'notes',
      match_text: notesMatches.slice(0, 5).join(' '),
    });
  }

  return matched;
}

function recordToItem(record: CatalogRecord): RequestLogItem {
  const item: RequestLogItem = {
    id: record.item_id,
    title: record.title,
    type: record.type,
    domain: record.domain,
    subdomain: record.subdomain,
    priority: record.priority,
    status: record.status,
    tags: record.tags,
    created_at: new Date(record.created),
    modified_at: new Date(record.updated),
  };
  if (record.context) {
    item.context = record.context;
  }
  return item;
}

export async function searchCatalogIndex(
  query: string,
  projectPath: string,
  options: IndexedSearchOptions
): Promise<SearchMatch[] | null> {
  const paths = getIndexPaths(projectPath);
  const catalogExists = await fileExists(paths.catalogPath);
  if (!catalogExists) {
    return null;
  }

  const records = await readCatalog(paths.catalogPath);
  if (records.length === 0) {
    return [];
  }

  const components = parseQuery(query);
  if (components.length === 0) {
    return [];
  }

  const textComponents = components.filter((component) => component.type === 'text');
  const structuredComponents = components.filter((component) => component.type !== 'text');

  let textIndex: TextIndex | null = null;
  if (textComponents.length > 0) {
    const textIndexExists = await fileExists(paths.textIndexPath);
    if (!textIndexExists) {
      return null;
    }
    textIndex = await readTextIndex(paths.textIndexPath);
    if (!textIndex) {
      return null;
    }
    const catalogMeta = await readCatalogMeta(paths.metaPath);
    if (catalogMeta) {
      const catalogGenerated = Date.parse(catalogMeta.generated_at);
      const textCreated = Date.parse(textIndex.created_at);
      if (!Number.isNaN(catalogGenerated) && !Number.isNaN(textCreated)) {
        if (textCreated < catalogGenerated) {
          return null;
        }
      }
    }
  }

  const structuredMatches: ScoredMatch[] = [];

  for (const record of records) {
    const matchedFields = matchStructuredComponents(record, structuredComponents, options.matchMode);
    if (matchedFields === null) {
      continue;
    }
    structuredMatches.push({ record, matchedFields });
  }

  if (textComponents.length === 0 || !textIndex) {
    const limited = applyLimit(structuredMatches, options.limit);
    return limited.map((match) => ({
      item: recordToItem(match.record),
      doc_id: match.record.doc_id,
      doc_path: match.record.doc_path,
      matched_fields: match.matchedFields,
    }));
  }

  const queryTerms = textComponents.flatMap((component) => tokenizeText(component.value));
  const expandedTerms = expandQueryTerms(textIndex, queryTerms, options.matchMode);

  const scored: ScoredMatch[] = [];

  for (const match of structuredMatches) {
    const score = scoreDoc(textIndex, match.record.item_id, expandedTerms);
    if (score <= 0) {
      continue;
    }

    const textMatches = buildTextMatches(textIndex, match.record, expandedTerms);
    scored.push({
      record: match.record,
      matchedFields: [...match.matchedFields, ...textMatches],
      score,
    });
  }

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const limited = applyLimit(scored, options.limit);

  return limited.map((match) => ({
    item: recordToItem(match.record),
    doc_id: match.record.doc_id,
    doc_path: match.record.doc_path,
    matched_fields: match.matchedFields,
  }));
}

function applyLimit(matches: ScoredMatch[], limit: number): ScoredMatch[] {
  if (!limit || limit <= 0) {
    return matches;
  }
  return matches.slice(0, limit);
}
