/**
 * Text Index Utilities (BM25)
 *
 * Builds a lightweight BM25-style index for keyword search
 * over item titles and note bodies.
 */

import { promises as fs } from 'node:fs';
import type { DocStore } from '@core/ports';
import type { RequestLogDoc } from '@core/models';

export const TEXT_INDEX_VERSION = 1;
export const DEFAULT_BM25 = {
  k1: 1.5,
  b: 0.75,
  title_weight: 2,
} as const;

export interface TextIndexDoc {
  item_id: string;
  doc_id: string;
  doc_path: string;
  title_terms: Record<string, number>;
  notes_terms: Record<string, number>;
  length: number;
}

export interface TextIndex {
  version: number;
  created_at: string;
  avg_doc_length: number;
  doc_count: number;
  doc_freq: Record<string, number>;
  docs: Record<string, TextIndexDoc>;
  config: typeof DEFAULT_BM25;
}

export function tokenizeText(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9]+/g);
  return matches ? matches.filter((token) => token.length > 0) : [];
}

function addTerms(
  target: Record<string, number>,
  tokens: string[],
  weight: number
): number {
  let length = 0;
  for (const token of tokens) {
    target[token] = (target[token] ?? 0) + weight;
    length += weight;
  }
  return length;
}

function buildIndexDoc(
  doc: RequestLogDoc,
  docPath: string,
  titleWeight: number
): TextIndexDoc[] {
  return doc.items.map((item) => {
    const titleTokens = tokenizeText(item.title);
    const notesText = item.notes?.map((note) => note.content).join('\n') ?? '';
    const notesTokens = tokenizeText(notesText);

    const titleTerms: Record<string, number> = {};
    const notesTerms: Record<string, number> = {};

    const titleLength = addTerms(titleTerms, titleTokens, titleWeight);
    const notesLength = addTerms(notesTerms, notesTokens, 1);

    return {
      item_id: item.id,
      doc_id: doc.doc_id,
      doc_path: docPath,
      title_terms: titleTerms,
      notes_terms: notesTerms,
      length: titleLength + notesLength,
    };
  });
}

export async function buildTextIndex(
  docStore: DocStore,
  projectPath: string
): Promise<TextIndex> {
  const docMetas = await docStore.list(projectPath);
  const docs: Record<string, TextIndexDoc> = {};
  const docFreq: Record<string, number> = {};
  let totalLength = 0;
  let docCount = 0;

  for (const meta of docMetas) {
    try {
      const doc = await docStore.read(meta.path);
      const indexDocs = buildIndexDoc(doc, meta.path, DEFAULT_BM25.title_weight);
      for (const indexDoc of indexDocs) {
        docs[indexDoc.item_id] = indexDoc;
        docCount += 1;
        totalLength += indexDoc.length;

        const terms = new Set<string>([
          ...Object.keys(indexDoc.title_terms),
          ...Object.keys(indexDoc.notes_terms),
        ]);
        for (const term of terms) {
          docFreq[term] = (docFreq[term] ?? 0) + 1;
        }
      }
    } catch {
      // Skip documents that fail to read or parse
    }
  }

  const avgDocLength = docCount > 0 ? totalLength / docCount : 0;

  return {
    version: TEXT_INDEX_VERSION,
    created_at: new Date().toISOString(),
    avg_doc_length: avgDocLength,
    doc_count: docCount,
    doc_freq: docFreq,
    docs,
    config: DEFAULT_BM25,
  };
}

export async function writeTextIndex(index: TextIndex, path: string): Promise<void> {
  await fs.writeFile(path, JSON.stringify(index, null, 2), 'utf-8');
}

export async function readTextIndex(path: string): Promise<TextIndex | null> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    const parsed = JSON.parse(content) as TextIndex;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
