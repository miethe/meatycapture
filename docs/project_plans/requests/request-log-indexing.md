---
title: "Request Log Indexing for AI-Agent Retrieval"
description: "Initial feature request and design for lightweight, file-first indexing across request logs with optional text search."
audience: [ai-agents, developers, pm]
tags: [indexing, search, cli, request-logs, catalog]
created: 2026-01-06
updated: 2026-01-06
category: "product-planning"
status: draft
related:
  - /docs/project_plans/initialization/prd.md
  - /docs/project_plans/requests/cli-v1.md
---

# Feature Request

## Summary

Add lightweight, file-first indexing to help AI agents and humans quickly find relevant requests within a project based on structured fields (tags, context, domain, status, etc.) with optional text search over titles and notes.

## Problem

Request logs are stored as markdown files. As volume grows, scanning every file for relevant context becomes slow and expensive for AI agents. We need fast, deterministic filtering without introducing a database or always-on server.

## Goals

- Enable fast, field-based filtering within a single project.
- Provide a stable, streamable index format for AI agents.
- Support optional text search without breaking the file-first model.
- Keep startup and configuration near-zero for CLI-only usage.

## Non-goals

- Cross-project global indexing (can be layered later).
- Always-on background indexing service.
- Heavy dependencies or a hard database requirement.

## Constraints

- Must remain file-first, serverless-capable, and CLI-friendly.
- Must be easy to rebuild from source markdown.
- Index artifacts must be optional and disposable.

# Design Overview

This request proposes two complementary enhancements:

1) **Project Catalog (NDJSON)**: An append-only catalog file with one structured record per request item.
2) **Optional Text Index (BM25 JSON)**: A lightweight search index built from the catalog for fast keyword search.

## Enhancement 1: Project Catalog (NDJSON)

### Intent

Provide a canonical, file-based, streamable index of all request items in a project. This is the primary source for AI agent filtering and relevance selection.

### Location

- Default: `<project_path>/.meatycapture/index/catalog.ndjson`
- Auxiliary: `<project_path>/.meatycapture/index/catalog.meta.json`

### Record Shape (Initial)

Each line is a single JSON object.

```json
{
  "doc_id": "REQ-20260106-meatycapture",
  "item_id": "REQ-20260106-meatycapture-02",
  "title": "Add NDJSON catalog for indexing",
  "type": "enhancement",
  "domain": "cli",
  "context": "indexing",
  "priority": "medium",
  "status": "triage",
  "tags": ["search", "indexing", "ai-agents"],
  "note_count": 3,
  "note_types": ["progress", "decision"],
  "note_last_updated": "2026-01-06",
  "note_tags": ["perf", "api"],
  "note_char_count": 812,
  "created": "2026-01-06",
  "updated": "2026-01-06",
  "doc_path": "/Users/miethe/.meatycapture/meatycapture/REQ-20260106.md"
}
```

### Update Rules

- **Append on write/append**: When a new item is captured, append a new record.
- **Update via tombstone**: If an item changes, append a new record with the same `item_id` and a `tombstone: true` for the old record (or a `superseded_by` field for the new record). Compact later.
- **Rebuild**: A CLI command can rebuild the catalog from markdown when missing or stale.

### Catalog Metadata

`catalog.meta.json` stores doc mtimes/hashes to detect staleness and support incremental rebuilds.

### CLI Operations

- `mc index --rebuild [project]` (rebuild catalog)
- `mc index --update [project]` (incremental update based on mtimes)
- `mc search --filter [field=value]` (stream filter from catalog)

### Why NDJSON

- Streamable (agents can read top N matches).
- Easy to append, compact, and rebuild.
- Simple, human-readable, and versionable.

## Enhancement 2: Optional Text Index (BM25 JSON)

### Intent

Accelerate keyword search over `title` and `notes` while keeping all artifacts file-based and disposable.

### Location

- Default: `<project_path>/.meatycapture/index/text-index.json`

### Data Source

The text index is built from the catalog (not from raw markdown directly), ensuring a single canonical source of truth.

### Implementation Choice

- **Preferred**: MiniSearch or FlexSearch with JSON serialization.
- **Fallback**: Full scan over catalog when index missing.

### Note Text Indexing

- Include `title` and note bodies in the BM25 corpus.
- Keep full note text in markdown; the catalog stores only note metadata.

### Update Rules

- Rebuild on demand or when `catalog.meta.json` indicates stale docs.
- Safe to delete at any time; always rebuildable.

### CLI Operations

- `mc search "query" --project X` (uses text index if available)
- `mc index --rebuild --text` (rebuild text index)

## AI Agent Retrieval Flow

1) Use catalog filters for strict matching (project, domain, context, status, tags).
2) If a text query is present, use text index to narrow results.
3) Return top N item IDs with brief fields; only load full markdown for final candidates.

## Data Integrity and Recovery

- Index files are always optional and rebuildable from markdown.
- Stale detection uses `catalog.meta.json`.
- Corruption recovery: delete index directory and run `mc index --rebuild`.

## Performance Notes

- Catalog reads are O(n) but streamable and fast for typical project sizes.
- Text index provides sublinear search for keywords when needed.
- Write overhead is minimal: one NDJSON append per new item.

## Risks

- Schema drift between catalog records and markdown fields.
- Accumulated tombstones without periodic compaction.
- Inconsistent updates if external edits bypass CLI.

## Open Questions

- Should note metadata be stored as a list of types or a frequency map?
- Do we need a global index directory in addition to per-project?
- What default compaction threshold is acceptable?

## Milestones (Initial)

1) Define catalog schema + metadata format.
2) Add `mc index` + `mc search` CLI commands (catalog-only).
3) Add optional text index build/search.
4) Add compaction and stale detection polish.
