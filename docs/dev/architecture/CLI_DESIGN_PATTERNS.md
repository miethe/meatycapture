# CLI Design Patterns & Reusability Guide

This document outlines how to extend the MeatyCapture CLI while maintaining architectural consistency with the headless core.

---

## 1. CLI Architecture Overview

### 1.1 Design Principle

The CLI is a **thin wrapper around the headless core** that:
- Validates command-line inputs
- Creates store instances (no React/UI dependencies)
- Calls core domain functions
- Formats output for terminal users

### 1.2 Data Flow

```
User Input (Command Args)
    ↓
readCliInput() / Validation
    ↓
Core Functions (no I/O awareness)
    ↓
Store Methods (adapters handle actual I/O)
    ↓
Output to console
    ↓
process.exit(0 or 1)
```

### 1.3 Dependency Tree

```
CLI (src/cli/index.ts)
├── @core/* (models, validation, serializer, catalog)
├── @adapters/* (fs-local, config-local, clock)
└── commander (CLI parsing)

NOT USED:
  ✗ @ui/* (React components)
  ✗ @platform (runtime detection)
  ✗ React / DOM
```

---

## 2. Command Structure Pattern

### 2.1 Anatomy of a CLI Command

```typescript
import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

// Step 1: Define input/output types
interface MyCommandInput {
  field1: string;
  field2?: number;
  items: Array<{ /* nested structure */ }>;
}

// Step 2: Create validation function
function isValidMyInput(obj: unknown): obj is MyCommandInput {
  // Type guard validation
  if (!obj || typeof obj !== 'object') return false;
  const input = obj as Partial<MyCommandInput>;

  // Validate each required field
  if (!input.field1 || typeof input.field1 !== 'string') return false;
  if (input.field2 !== undefined && typeof input.field2 !== 'number') return false;
  if (!Array.isArray(input.items)) return false;

  return true;
}

// Step 3: Create async command handler
async function myCommand(
  argName: string,
  options: { optionName?: string }
): Promise<void> {
  try {
    // 3a. Resolve file paths
    const inputPath = resolve(argName);

    // 3b. Read and validate input
    const content = await fs.readFile(inputPath, 'utf-8');
    const input = JSON.parse(content) as unknown;

    if (!isValidMyInput(input)) {
      throw new Error('Invalid input format. Expected: { field1: string, ... }');
    }

    // 3c. Create store instances
    const projectStore = createProjectStore();
    const docStore = createFsDocStore();
    const fieldStore = createFieldCatalogStore();

    // 3d. Use core domain logic
    const result = await doSomething(input, projectStore, docStore);

    // 3e. Output success
    console.log(`✓ Operation completed: ${result.id}`);
    console.log(`  Details: ${result.summary}`);

    process.exit(0);
  } catch (error) {
    // 3f. Handle errors
    console.error('Error in myCommand:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Step 4: Register with program
const program = new Command();
program
  .command('my-command')
  .description('Description of what this command does')
  .argument('<input-file>', 'Path to input JSON file')
  .option('-o, --output <path>', 'Output file path (optional)')
  .action(myCommand);

program.parse();
```

### 2.2 Error Handling Pattern

```typescript
// Pattern: Validate → Try → Output → Exit
async function commandHandler(
  arg: string,
  options: Record<string, unknown>
): Promise<void> {
  try {
    // Validation phase
    const input = await readInput(arg);
    if (!isValid(input)) {
      throw new Error(`Invalid format: expected { ... }, got: ${JSON.stringify(input)}`);
    }

    // Business logic phase
    const result = await doWork(input);

    // Success output
    console.log('✓ Success:', result);
    process.exit(0);
  } catch (error) {
    // Error output
    console.error('✗ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
```

---

## 3. Reusing Core Domain Logic

### 3.1 Models & Validation

```typescript
// Import from @core/models
import type { Project, ItemDraft, RequestLogDoc } from '@core/models';
import { isProject, isItemDraft } from '@core/models';

// Use type guards for runtime safety
const data = JSON.parse(userInput);
if (isItemDraft(data)) {
  // TypeScript knows data is ItemDraft here
  console.log(data.title);
}
```

### 3.2 ID Generation & Validation

```typescript
import {
  generateDocId,
  generateItemId,
  parseDocId,
  parseItemId,
  isValidDocId,
  isValidItemId,
  getNextItemNumber,
  slugify,
  sanitizePathSegment,
} from '@core/validation';

// Generate IDs for new documents
const now = realClock.now();
const docId = generateDocId('my-project', now);
const itemId = generateItemId(docId, 1);

// Validate existing IDs
if (isValidDocId(userProvidedId)) {
  const info = parseDocId(userProvidedId);
  console.log(`Document from ${info.date}, project: ${info.projectSlug}`);
}

// Normalize text
const slug = slugify(userProjectName);
const safePath = sanitizePathSegment(userPath);
```

### 3.3 Serialization

```typescript
import { serialize, parse, aggregateTags, updateItemsIndex } from '@core/serializer';

// Building documents
const items = /* ItemDraft[] -> RequestLogItem[] */;
const doc: RequestLogDoc = {
  doc_id: generateDocId('project', now),
  title: 'My Document',
  project_id: 'project',
  items,
  items_index: updateItemsIndex(items), // Auto-create index
  tags: aggregateTags(items), // Auto-aggregate tags
  item_count: items.length,
  created_at: now,
  updated_at: now,
};

// Convert to markdown
const markdown = serialize(doc);
await docStore.write(path, doc); // Adapter handles serialization

// Parse markdown back
const parsed = parse(markdown);
```

### 3.4 Catalog Filtering

```typescript
import {
  filterByProject,
  filterByType,
  filterByPriority,
  applyFilters,
  groupByProject,
  sortDocuments,
} from '@core/catalog';
import type { FilterState, CatalogEntry } from '@core/catalog';

// List and filter documents
const allDocs = await listAllDocuments(projectStore, docStore);
const filtered = applyFilters(allDocs, {
  project: 'my-project',
  type: 'bug',
  priority: 'high',
});

// Group and sort
const grouped = groupByProject(filtered);
const sorted = sortDocuments(filtered, { field: 'updated_at', order: 'desc' });

// Output
filtered.forEach((entry) => {
  console.log(`${entry.doc.doc_id}: ${entry.doc.title}`);
});
```

---

## 4. Store Management Pattern

### 4.1 Creating Stores

```typescript
// Always create stores within command handler (lazy initialization)
async function myCommand(): Promise<void> {
  try {
    // Create once per command
    const projectStore = createProjectStore();
    const docStore = createFsDocStore();
    const fieldStore = createFieldCatalogStore();
    const clock = realClock;

    // Use stores throughout handler
    const project = await projectStore.get('my-project');
    const docs = await docStore.list(project.default_path);

    // ...
  } catch (error) {
    // ...
  }
}
```

### 4.2 ProjectStore Operations

```typescript
import { createProjectStore } from '@adapters/config-local';

const projectStore = createProjectStore();

// List
const projects = await projectStore.list();
projects.forEach((p) => {
  console.log(`${p.id}: ${p.name} (enabled: ${p.enabled})`);
});

// Get
const project = await projectStore.get('my-project');
if (!project) {
  throw new Error('Project not found: my-project');
}

// Create
const newProject = await projectStore.create({
  name: 'New Project',
  default_path: '~/projects/new',
  enabled: true,
});

// Update
await projectStore.update('my-project', { enabled: false });

// Delete
await projectStore.delete('old-project');
```

### 4.3 DocStore Operations

```typescript
import { createFsDocStore } from '@adapters/fs-local';

const docStore = createFsDocStore();

// List documents in directory
const docs = await docStore.list('~/projects/my-project');
docs.forEach((meta) => {
  console.log(`${meta.doc_id}: ${meta.item_count} items (${meta.updated_at})`);
});

// Read document
const doc = await docStore.read('~/projects/my-project/REQ-20251227-app.md');
console.log(`Loaded: ${doc.item_count} items`);

// Write document
await docStore.write(path, doc);
console.log(`Saved to: ${path}`);

// Append to document
const updated = await docStore.append(path, itemDraft, realClock);
console.log(`Now has ${updated.item_count} items`);

// Check writability
const isWritable = await docStore.isWritable(path);
if (!isWritable) {
  throw new Error(`Cannot write to: ${path}`);
}

// Manual backup
const backupPath = await docStore.backup(path);
console.log(`Backup created: ${backupPath}`);
```

### 4.4 FieldCatalogStore Operations

```typescript
import { createFieldCatalogStore } from '@adapters/config-local';

const fieldStore = createFieldCatalogStore();

// Get global options (for display in help)
const global = await fieldStore.getGlobal();
const types = global.filter((o) => o.field === 'type');
console.log(`Available types: ${types.map((t) => t.value).join(', ')}`);

// Get project-specific options
const projectOptions = await fieldStore.getForProject('my-project');

// Add custom option for project
const newOption = await fieldStore.addOption({
  field: 'domain',
  value: 'mobile',
  scope: 'project',
  project_id: 'my-project',
});

// Remove option
await fieldStore.removeOption(newOption.id);
```

---

## 5. Input/Output Patterns

### 5.1 Reading JSON Input Files

```typescript
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

async function readJsonInput<T>(
  filePath: string,
  validator: (obj: unknown) => obj is T
): Promise<T> {
  try {
    const resolvedPath = resolve(filePath);
    const content = await fs.readFile(resolvedPath, 'utf-8');

    const data = JSON.parse(content) as unknown;

    if (!validator(data)) {
      throw new Error(`Invalid JSON structure in ${filePath}`);
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`JSON parsing error in ${filePath}: ${error.message}`);
    }
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

// Usage
const input = await readJsonInput(arg, isValidMyInput);
```

### 5.2 Console Output Formatting

```typescript
// Success messages
console.log('✓ Operation completed successfully');
console.log(`  Created: ${result.id}`);
console.log(`  Location: ${result.path}`);

// Tabular output
docs.forEach((doc) => {
  console.log(`${doc.doc_id}`);
  console.log(`  Title: ${doc.title}`);
  console.log(`  Path: ${doc.path}`);
  console.log(`  Items: ${doc.item_count}`);
  console.log(`  Updated: ${doc.updated_at.toISOString()}`);
  console.log('');
});

// List formatting
const items = result.items.map((item, idx) => `${idx + 1}. ${item.title}`);
console.log('Items:');
console.log(items.join('\n'));

// Error messages
console.error('✗ Error: description of what went wrong');
console.error('  Details: additional context');
```

### 5.3 Help Text with Examples

```typescript
const program = new Command();

program
  .command('create')
  .description('Create a new request-log document from JSON input')
  .argument('<json-file>', 'Path to JSON input file')
  .option('-o, --output <path>', 'Output path for the document')
  .helpOption('-h, --help', 'Display help for this command')
  .addHelpText(
    'after',
    `
Example JSON input (my-items.json):
{
  "project": "my-project",
  "title": "Request Log - December 27",
  "items": [
    {
      "title": "Add dark mode",
      "type": "enhancement",
      "domain": "web",
      "context": "Settings page",
      "priority": "medium",
      "status": "triage",
      "tags": ["ux", "ui"],
      "notes": "Users request dark mode for nighttime reading."
    }
  ]
}

Usage examples:
  $ meatycapture create my-items.json
  $ meatycapture create my-items.json -o /path/to/document.md
    `
  )
  .action(createCommand);
```

---

## 6. Path Handling Pattern

### 6.1 Tilde Expansion

```typescript
import { join } from 'node:path';
import { homedir } from 'node:os';

function expandPath(path: string): string {
  const baseDir = process.env.MEATYCAPTURE_DATA_DIR || homedir();
  if (path.startsWith('~/')) {
    return join(baseDir, path.slice(2));
  }
  if (path === '~') {
    return baseDir;
  }
  return path;
}

// Usage
const docPath = expandPath('~/projects/my-project/REQ-20251227-app.md');
// Becomes: /Users/name/projects/my-project/REQ-20251227-app.md
```

### 6.2 Path Resolution

```typescript
import { resolve } from 'node:path';

// Always resolve relative paths
const inputFile = resolve(process.argv[2]); // Relative → absolute
const outputFile = options.output ? resolve(options.output) : generatedPath;
```

### 6.3 Project Path Lookup

```typescript
async function getProjectDocPath(projectSlug: string): Promise<string> {
  // 1. Check project config
  const projectStore = createProjectStore();
  const project = await projectStore.get(projectSlug);
  if (project) {
    return project.default_path;
  }

  // 2. Check environment variable
  const envPath = process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];
  if (envPath) {
    return join(envPath, projectSlug);
  }

  // 3. Fallback to default
  return join(homedir(), '.meatycapture', 'docs', projectSlug);
}

const path = await getProjectDocPath('my-project');
```

---

## 7. Common CLI Extensions

### 7.1 Adding a New Command (Template)

```typescript
// STEP 1: Define input type
interface MyNewCommandInput {
  requiredField: string;
  optionalField?: string;
}

// STEP 2: Create validator
function isValidMyInput(obj: unknown): obj is MyNewCommandInput {
  if (!obj || typeof obj !== 'object') return false;
  const input = obj as Partial<MyNewCommandInput>;
  return typeof input.requiredField === 'string';
}

// STEP 3: Implement handler
async function myNewCommand(
  arg: string,
  options: { option?: string }
): Promise<void> {
  try {
    // Read input
    const input = await readJsonInput(arg, isValidMyInput);

    // Create stores
    const projectStore = createProjectStore();
    const docStore = createFsDocStore();

    // Call core logic
    const result = await myBusinessLogic(input, projectStore, docStore);

    // Output
    console.log(`✓ Success: ${result}`);
    process.exit(0);
  } catch (error) {
    console.error(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// STEP 4: Register command
program
  .command('my-new-command')
  .description('Description of the command')
  .argument('<arg>', 'Description of argument')
  .option('-opt, --option <value>', 'Description of option')
  .action(myNewCommand);
```

### 7.2 Adding Logging to Commands

```typescript
import { logger } from '@core/logging';

async function myCommand(arg: string): Promise<void> {
  try {
    logger.info('Command started', { arg });

    const input = await readJsonInput(arg, validator);
    logger.debug('Input parsed', { fields: Object.keys(input) });

    const projectStore = createProjectStore();
    const result = await projectStore.list();
    logger.info('Projects loaded', { count: result.length });

    console.log(`✓ Found ${result.length} projects`);
    process.exit(0);
  } catch (error) {
    logger.error('Command failed', { error: error instanceof Error ? error.message : String(error) });
    console.error(`✗ Error: ${error}`);
    process.exit(1);
  }
}
```

---

## 8. Testing CLI Commands

### 8.1 Unit Test Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { isValidMyInput } from '../cli/index';

describe('CLI Input Validation', () => {
  it('validates correct input', () => {
    const input = {
      requiredField: 'value',
      optionalField: 'optional',
    };
    expect(isValidMyInput(input)).toBe(true);
  });

  it('rejects missing required field', () => {
    const input = { optionalField: 'optional' };
    expect(isValidMyInput(input)).toBe(false);
  });

  it('rejects wrong field types', () => {
    const input = { requiredField: 123 }; // Should be string
    expect(isValidMyInput(input)).toBe(false);
  });
});
```

### 8.2 Integration Test Pattern

```typescript
import { createFsDocStore } from '@adapters/fs-local';
import { createProjectStore } from '@adapters/config-local';
import { realClock } from '@adapters/clock';
import { generateDocId } from '@core/validation';
import path from 'node:path';
import fs from 'node:fs/promises';

describe('CLI create command', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test
    tempDir = await fs.mkdtemp('/tmp/test-');
  });

  it('creates document from valid input', async () => {
    const docStore = createFsDocStore();
    const projectStore = createProjectStore();

    // Create test project
    const project = await projectStore.create({
      name: 'Test Project',
      default_path: tempDir,
      enabled: true,
    });

    // Create document
    const now = realClock.now();
    const docId = generateDocId(project.id, now);
    const docPath = path.join(tempDir, `${docId}.md`);

    const doc = {
      doc_id: docId,
      title: 'Test',
      project_id: project.id,
      items: [],
      items_index: [],
      tags: [],
      item_count: 0,
      created_at: now,
      updated_at: now,
    };

    await docStore.write(docPath, doc);

    // Verify
    const read = await docStore.read(docPath);
    expect(read.doc_id).toBe(docId);
  });
});
```

---

## 9. Best Practices Checklist

### Design
- [ ] Single responsibility: command handler does validation → business logic → output
- [ ] Type safety: use type guards for all input
- [ ] Error handling: try/catch with meaningful error messages
- [ ] Exit codes: 0 for success, 1 for failure

### Implementation
- [ ] Lazy initialization: create stores inside command handler
- [ ] Path resolution: always use `resolve()` for relative paths, handle tilde
- [ ] Validation: validate before using data from external sources
- [ ] Logging: add debug logs for development (LOG_LEVEL=debug)

### Output
- [ ] Success messages: use "✓" prefix, show key info
- [ ] Error messages: use "✗" prefix, explain what went wrong
- [ ] Formatting: use indentation for related info
- [ ] Help text: include examples of input format and usage

### Testing
- [ ] Unit tests: validate type guards and input parsing
- [ ] Integration tests: test with real adapters and temp directories
- [ ] Edge cases: empty input, missing files, permission errors

---

## 10. Example: Extending CLI with New Feature

**Goal:** Add `query` command to search documents by filter criteria

```typescript
// STEP 1: Define input
interface QueryInput {
  project?: string;
  type?: string;
  priority?: string;
  tags?: string[];
  text?: string;
}

function isValidQueryInput(obj: unknown): obj is QueryInput {
  if (!obj || typeof obj !== 'object') return false;
  const input = obj as Partial<QueryInput>;
  return (
    (input.project === undefined || typeof input.project === 'string') &&
    (input.type === undefined || typeof input.type === 'string') &&
    (input.priority === undefined || typeof input.priority === 'string') &&
    (input.tags === undefined || (Array.isArray(input.tags) && input.tags.every((t) => typeof t === 'string'))) &&
    (input.text === undefined || typeof input.text === 'string')
  );
}

// STEP 2: Implement handler
async function queryCommand(jsonPath: string): Promise<void> {
  try {
    const input = await readJsonInput(jsonPath, isValidQueryInput);

    const projectStore = createProjectStore();
    const docStore = createFsDocStore();

    // List all documents
    const allEntries = await listAllDocuments(projectStore, docStore);

    // Apply filters
    const filtered = applyFilters(allEntries, {
      project: input.project,
      type: input.type,
      priority: input.priority,
      tags: input.tags,
      text: input.text,
    });

    // Output results
    console.log(`Found ${filtered.length} matching items:\n`);
    filtered.forEach((entry) => {
      console.log(`${entry.item.id} - ${entry.item.title}`);
      console.log(`  Project: ${entry.project.name}`);
      console.log(`  Type: ${entry.item.type} | Priority: ${entry.item.priority}`);
      console.log(`  Tags: ${entry.item.tags.join(', ')}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Query failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// STEP 3: Register
program
  .command('query')
  .description('Search documents by filter criteria')
  .argument('<filters.json>', 'JSON file with filter criteria')
  .action(queryCommand);
```

---

## Summary

When extending the CLI:

1. **Stay within the ports**: Only use stores defined in `@core/ports`
2. **Leverage core modules**: Use validation, serialization, catalog functions directly
3. **Validate early**: Type guards for all external input
4. **Handle errors gracefully**: Catch, format, output to stderr
5. **Exit cleanly**: process.exit(0) or process.exit(1)
6. **Test thoroughly**: Unit tests for validation, integration tests for adapters
7. **Follow patterns**: Use existing command implementations as templates

The headless core enables CLI extensions that are **type-safe, testable, and maintainable**.
