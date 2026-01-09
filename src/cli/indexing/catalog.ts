/**
 * Catalog Indexing Utilities
 *
 * Builds and maintains a lightweight NDJSON catalog for request-log items.
 * The catalog is designed for fast filtering and AI-agent retrieval.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { DocStore, DocMeta } from '@core/ports';
import type { Note, RequestLogDoc, RequestLogItem } from '@core/models';

export const CATALOG_VERSION = 1;

export interface IndexPaths {
  indexDir: string;
  catalogPath: string;
  metaPath: string;
  textIndexPath: string;
}

export interface CatalogRecord {
  doc_id: string;
  item_id: string;
  title: string;
  type: string;
  domain: string[];
  subdomain: string[];
  context?: string;
  priority: string;
  status: string;
  tags: string[];
  note_count: number;
  note_types: string[];
  note_last_updated?: string | undefined;
  note_tags: string[];
  note_char_count: number;
  created: string;
  updated: string;
  doc_path: string;
}

export interface CatalogDocumentMeta {
  updated_at: string;
  mtime_ms?: number;
  size_bytes?: number;
}

export interface CatalogMeta {
  version: number;
  generated_at: string;
  documents: Record<string, CatalogDocumentMeta>;
}

export interface CatalogChanges {
  added: string[];
  removed: string[];
  changed: string[];
}

export interface CatalogBuildResult {
  records: CatalogRecord[];
  meta: CatalogMeta;
  paths: IndexPaths;
  doc_count: number;
}

export interface CatalogUpdateResult {
  updated: boolean;
  records: CatalogRecord[];
  meta: CatalogMeta;
  paths: IndexPaths;
  doc_count: number;
  changes: CatalogChanges;
}

export function getIndexPaths(projectPath: string): IndexPaths {
  const indexDir = join(projectPath, '.meatycapture', 'index');
  return {
    indexDir,
    catalogPath: join(indexDir, 'catalog.ndjson'),
    metaPath: join(indexDir, 'catalog.meta.json'),
    textIndexPath: join(indexDir, 'text-index.json'),
  };
}

async function ensureIndexDir(indexDir: string): Promise<void> {
  await fs.mkdir(indexDir, { recursive: true });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeArray(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

function extractNoteTags(notes: Note[]): string[] {
  const tags = new Set<string>();
  const tagPattern = /(^|\s)#([a-zA-Z0-9_-]+)/g;
  for (const note of notes) {
    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(note.content)) !== null) {
      const tag = match[2];
      if (tag) {
        tags.add(tag.toLowerCase());
      }
    }
  }
  return Array.from(tags).sort();
}

function extractNoteMetadata(notes: Note[] | undefined): {
  note_count: number;
  note_types: string[];
  note_last_updated?: string | undefined;
  note_tags: string[];
  note_char_count: number;
} {
  const safeNotes = Array.isArray(notes) ? notes : [];
  const noteCount = safeNotes.length;
  const noteTypes = Array.from(new Set(safeNotes.map((note) => note.type))).sort();
  const noteLastUpdated =
    noteCount > 0
      ? new Date(Math.max(...safeNotes.map((note) => note.updated_at.getTime()))).toISOString()
      : undefined;
  const noteCharCount = safeNotes.reduce((sum, note) => sum + note.content.length, 0);
  const noteTags = extractNoteTags(safeNotes);

  return {
    note_count: noteCount,
    note_types: noteTypes,
    note_last_updated: noteLastUpdated,
    note_tags: noteTags,
    note_char_count: noteCharCount,
  };
}

function buildRecordFromItem(
  doc: RequestLogDoc,
  item: RequestLogItem,
  docPath: string
): CatalogRecord {
  const { note_count, note_types, note_last_updated, note_tags, note_char_count } =
    extractNoteMetadata(item.notes);
  const updatedAt = item.modified_at ?? item.created_at;

  const record: CatalogRecord = {
    doc_id: doc.doc_id,
    item_id: item.id,
    title: item.title,
    type: item.type,
    domain: normalizeArray(item.domain),
    subdomain: normalizeArray(item.subdomain),
    priority: item.priority,
    status: item.status,
    tags: normalizeArray(item.tags),
    note_count,
    note_types,
    note_tags,
    note_char_count,
    created: item.created_at.toISOString(),
    updated: updatedAt.toISOString(),
    doc_path: docPath,
  };
  if (item.context) {
    record.context = item.context;
  }
  if (note_last_updated) {
    record.note_last_updated = note_last_updated;
  }
  return record;
}

function buildRecordsFromDoc(doc: RequestLogDoc, docPath: string): CatalogRecord[] {
  return doc.items.map((item) => buildRecordFromItem(doc, item, docPath));
}

async function createDocumentMeta(path: string, updatedAt: Date): Promise<CatalogDocumentMeta> {
  const meta: CatalogDocumentMeta = {
    updated_at: updatedAt.toISOString(),
  };

  try {
    const stats = await fs.stat(path);
    meta.mtime_ms = stats.mtimeMs;
    meta.size_bytes = stats.size;
  } catch {
    // Ignore stat failures (API-backed docs or missing files)
  }

  return meta;
}

async function buildMetaFromDocMetas(docMetas: DocMeta[]): Promise<CatalogMeta> {
  const documents: Record<string, CatalogDocumentMeta> = {};
  for (const meta of docMetas) {
    documents[meta.path] = await createDocumentMeta(meta.path, meta.updated_at);
  }

  return {
    version: CATALOG_VERSION,
    generated_at: new Date().toISOString(),
    documents,
  };
}

async function writeCatalogMeta(meta: CatalogMeta, metaPath: string): Promise<void> {
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

export async function readCatalogMeta(metaPath: string): Promise<CatalogMeta | null> {
  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(content) as CatalogMeta;
  } catch {
    return null;
  }
}

export async function readCatalog(catalogPath: string): Promise<CatalogRecord[]> {
  try {
    const content = await fs.readFile(catalogPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    const records: CatalogRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as CatalogRecord);
      } catch {
        // Skip malformed entries
      }
    }
    return records;
  } catch {
    return [];
  }
}

export async function writeCatalog(records: CatalogRecord[], catalogPath: string): Promise<void> {
  const lines = records.map((record) => JSON.stringify(record));
  const content = lines.join('\n') + (lines.length > 0 ? '\n' : '');
  await fs.writeFile(catalogPath, content, 'utf-8');
}

export async function rebuildCatalog(
  docStore: DocStore,
  projectPath: string
): Promise<CatalogBuildResult> {
  const paths = getIndexPaths(projectPath);
  const docMetas = await docStore.list(projectPath);
  const records: CatalogRecord[] = [];

  for (const meta of docMetas) {
    try {
      const doc = await docStore.read(meta.path);
      records.push(...buildRecordsFromDoc(doc, meta.path));
    } catch {
      // Skip documents that fail to read or parse
    }
  }

  const catalogMeta = await buildMetaFromDocMetas(docMetas);

  await ensureIndexDir(paths.indexDir);
  await writeCatalog(records, paths.catalogPath);
  await writeCatalogMeta(catalogMeta, paths.metaPath);

  return {
    records,
    meta: catalogMeta,
    paths,
    doc_count: docMetas.length,
  };
}

async function createSnapshot(
  docStore: DocStore,
  projectPath: string
): Promise<{ meta: CatalogMeta; docMetas: DocMeta[] }> {
  const docMetas = await docStore.list(projectPath);
  const meta = await buildMetaFromDocMetas(docMetas);
  return { meta, docMetas };
}

function diffCatalogMeta(meta: CatalogMeta, current: CatalogMeta): CatalogChanges {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  const previousPaths = new Set(Object.keys(meta.documents));
  const currentPaths = new Set(Object.keys(current.documents));

  for (const path of currentPaths) {
    if (!previousPaths.has(path)) {
      added.push(path);
      continue;
    }

    const prev = meta.documents[path];
    const next = current.documents[path];
    if (!prev || !next) {
      continue;
    }

    if (prev.updated_at !== next.updated_at) {
      changed.push(path);
      continue;
    }

    if (
      prev.mtime_ms !== undefined &&
      next.mtime_ms !== undefined &&
      prev.mtime_ms !== next.mtime_ms
    ) {
      changed.push(path);
      continue;
    }

    if (
      prev.size_bytes !== undefined &&
      next.size_bytes !== undefined &&
      prev.size_bytes !== next.size_bytes
    ) {
      changed.push(path);
    }
  }

  for (const path of previousPaths) {
    if (!currentPaths.has(path)) {
      removed.push(path);
    }
  }

  return { added, removed, changed };
}

export async function updateCatalog(
  docStore: DocStore,
  projectPath: string
): Promise<CatalogUpdateResult> {
  const paths = getIndexPaths(projectPath);
  const catalogExists = await fileExists(paths.catalogPath);
  const meta = await readCatalogMeta(paths.metaPath);

  if (!catalogExists || !meta) {
    const rebuilt = await rebuildCatalog(docStore, projectPath);
    return {
      updated: true,
      records: rebuilt.records,
      meta: rebuilt.meta,
      paths: rebuilt.paths,
      doc_count: rebuilt.doc_count,
      changes: {
        added: Object.keys(rebuilt.meta.documents),
        removed: [],
        changed: [],
      },
    };
  }

  const currentSnapshot = await createSnapshot(docStore, projectPath);
  const changes = diffCatalogMeta(meta, currentSnapshot.meta);

  if (
    changes.added.length === 0 &&
    changes.removed.length === 0 &&
    changes.changed.length === 0
  ) {
    const existingRecords = await readCatalog(paths.catalogPath);
    return {
      updated: false,
      records: existingRecords,
      meta,
      paths,
      doc_count: Object.keys(meta.documents).length,
      changes,
    };
  }

  const existingRecords = await readCatalog(paths.catalogPath);
  const updatedRecords = existingRecords.filter(
    (record) => !changes.removed.includes(record.doc_path) && !changes.changed.includes(record.doc_path)
  );

  for (const path of [...changes.added, ...changes.changed]) {
    try {
      const doc = await docStore.read(path);
      updatedRecords.push(...buildRecordsFromDoc(doc, path));
    } catch {
      // Skip documents that fail to read or parse
    }
  }

  const nextMeta: CatalogMeta = {
    ...currentSnapshot.meta,
    generated_at: new Date().toISOString(),
  };

  await ensureIndexDir(paths.indexDir);
  await writeCatalog(updatedRecords, paths.catalogPath);
  await writeCatalogMeta(nextMeta, paths.metaPath);

  return {
    updated: true,
    records: updatedRecords,
    meta: nextMeta,
    paths,
    doc_count: Object.keys(nextMeta.documents).length,
    changes,
  };
}

export async function updateCatalogForDocument(
  docStore: DocStore,
  projectPath: string,
  doc: RequestLogDoc,
  docPath: string
): Promise<void> {
  const paths = getIndexPaths(projectPath);
  const catalogExists = await fileExists(paths.catalogPath);
  const meta = await readCatalogMeta(paths.metaPath);

  if (!catalogExists || !meta) {
    await rebuildCatalog(docStore, projectPath);
    return;
  }

  const existingRecords = await readCatalog(paths.catalogPath);
  const updatedRecords = existingRecords.filter((record) => record.doc_path !== docPath);
  updatedRecords.push(...buildRecordsFromDoc(doc, docPath));

  const updatedMeta = {
    ...meta,
    generated_at: new Date().toISOString(),
    documents: {
      ...meta.documents,
      [docPath]: await createDocumentMeta(docPath, doc.updated_at),
    },
  };

  await ensureIndexDir(paths.indexDir);
  await writeCatalog(updatedRecords, paths.catalogPath);
  await writeCatalogMeta(updatedMeta, paths.metaPath);
}

export async function removeCatalogForDocument(
  projectPath: string,
  docPath: string
): Promise<void> {
  const paths = getIndexPaths(projectPath);
  const catalogExists = await fileExists(paths.catalogPath);
  const meta = await readCatalogMeta(paths.metaPath);

  if (!catalogExists) {
    return;
  }

  const existingRecords = await readCatalog(paths.catalogPath);
  const updatedRecords = existingRecords.filter((record) => record.doc_path !== docPath);
  await writeCatalog(updatedRecords, paths.catalogPath);

  if (meta) {
    const { [docPath]: _, ...rest } = meta.documents;
    const updatedMeta = {
      ...meta,
      generated_at: new Date().toISOString(),
      documents: rest,
    };
    await writeCatalogMeta(updatedMeta, paths.metaPath);
  }
}
