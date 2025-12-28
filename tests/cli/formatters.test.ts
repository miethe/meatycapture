/**
 * CLI Formatters Unit Tests
 *
 * Tests all output formatters:
 * - JSON: Valid JSON output, date serialization
 * - CSV: RFC 4180 compliance, proper escaping
 * - YAML: Valid YAML output
 * - Table: Formatted output with cli-table3
 * - Human: Colored output (with color disabled for testing)
 *
 * Uses snapshot tests for output consistency.
 */

import { describe, it, expect } from 'vitest';
import {
  createMockDoc,
  createMockItem,
  createMockDocMeta,
  createMockSearchMatch,
  isValidJson,
} from './helpers';

// JSON Formatter Tests
import {
  formatAsJson,
  formatDocAsJson,
  formatDocsAsJson,
  formatDocMetaAsJson,
  formatDocMetasAsJson,
  formatItemAsJson,
  formatItemsAsJson,
  formatSearchMatchAsJson,
  formatSearchMatchesAsJson,
} from '@cli/formatters/json';

// YAML Formatter Tests
import {
  formatAsYaml,
  formatDocAsYaml,
  formatDocsAsYaml,
  formatDocMetaAsYaml,
  formatDocMetasAsYaml,
  formatItemAsYaml,
  formatItemsAsYaml,
  formatSearchMatchAsYaml,
  formatSearchMatchesAsYaml,
} from '@cli/formatters/yaml';

// CSV Formatter Tests
import {
  formatAsCsv,
  formatDocAsCsv,
  formatDocsAsCsv,
  formatDocMetaAsCsv,
  formatDocMetasAsCsv,
  formatItemAsCsv,
  formatItemsAsCsv,
  formatSearchMatchAsCsv,
  formatSearchMatchesAsCsv,
} from '@cli/formatters/csv';

// Table Formatter Tests
import {
  formatAsTable,
  formatDocAsTable,
  formatDocsAsTable,
  formatDocMetaAsTable,
  formatDocMetasAsTable,
  formatItemAsTable,
  formatItemsAsTable,
  formatSearchMatchAsTable,
  formatSearchMatchesAsTable,
} from '@cli/formatters/table';

// Human Formatter Tests
import {
  formatAsHuman,
  formatDocAsHuman,
  formatDocsAsHuman,
  formatDocMetaAsHuman,
  formatDocMetasAsHuman,
  formatItemAsHuman,
  formatItemsAsHuman,
  formatSearchMatchAsHuman,
  formatSearchMatchesAsHuman,
} from '@cli/formatters/human';

// Main formatOutput dispatcher
import { formatOutput, isValidFormat, parseFormat } from '@cli/formatters';

// Type guards
import {
  isRequestLogDoc,
  isRequestLogDocArray,
  isDocMeta,
  isDocMetaArray,
  isRequestLogItem,
  isRequestLogItemArray,
  isSearchMatch,
  isSearchMatchArray,
  isEmptyArray,
  serializeDate,
} from '@cli/formatters/types';

describe('JSON Formatter', () => {
  describe('formatDocAsJson', () => {
    it('should produce valid JSON', () => {
      const doc = createMockDoc();
      const output = formatDocAsJson(doc);

      expect(isValidJson(output)).toBe(true);
    });

    it('should serialize dates as ISO 8601', () => {
      const doc = createMockDoc();
      const output = formatDocAsJson(doc);
      const parsed = JSON.parse(output);

      expect(parsed.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(parsed.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should preserve all document fields', () => {
      const doc = createMockDoc({
        doc_id: 'REQ-20251203-my-project',
        title: 'My Test Doc',
        project_id: 'my-project',
        tags: ['api', 'ux'],
        item_count: 2,
      });
      const output = formatDocAsJson(doc);
      const parsed = JSON.parse(output);

      expect(parsed.doc_id).toBe('REQ-20251203-my-project');
      expect(parsed.title).toBe('My Test Doc');
      expect(parsed.project_id).toBe('my-project');
      expect(parsed.tags).toEqual(['api', 'ux']);
      expect(parsed.item_count).toBe(2);
    });

    it('should be pretty-printed with 2-space indentation', () => {
      const doc = createMockDoc();
      const output = formatDocAsJson(doc);

      expect(output).toContain('\n');
      expect(output).toMatch(/^{\n {2}"/);
    });
  });

  describe('formatDocsAsJson', () => {
    it('should format array of documents', () => {
      const docs = [createMockDoc(), createMockDoc({ doc_id: 'REQ-20251204-other' })];
      const output = formatDocsAsJson(docs);
      const parsed = JSON.parse(output);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    it('should handle empty array', () => {
      const output = formatDocsAsJson([]);
      expect(output).toBe('[]');
    });
  });

  describe('formatDocMetaAsJson', () => {
    it('should produce valid JSON for DocMeta', () => {
      const meta = createMockDocMeta();
      const output = formatDocMetaAsJson(meta);

      expect(isValidJson(output)).toBe(true);
      const parsed = JSON.parse(output);
      expect(parsed.path).toBeDefined();
      expect(parsed.doc_id).toBeDefined();
    });
  });

  describe('formatDocMetasAsJson', () => {
    it('should format array of DocMetas', () => {
      const metas = [createMockDocMeta(), createMockDocMeta({ doc_id: 'REQ-20251204-other' })];
      const output = formatDocMetasAsJson(metas);
      const parsed = JSON.parse(output);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });
  });

  describe('formatItemAsJson', () => {
    it('should produce valid JSON for item', () => {
      const item = createMockItem();
      const output = formatItemAsJson(item);

      expect(isValidJson(output)).toBe(true);
      const parsed = JSON.parse(output);
      expect(parsed.id).toBeDefined();
      expect(parsed.title).toBeDefined();
    });

    it('should serialize item created_at as ISO 8601', () => {
      const item = createMockItem();
      const output = formatItemAsJson(item);
      const parsed = JSON.parse(output);

      expect(parsed.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('formatItemsAsJson', () => {
    it('should format array of items', () => {
      const items = [createMockItem(), createMockItem({ id: 'REQ-20251203-test-02' })];
      const output = formatItemsAsJson(items);
      const parsed = JSON.parse(output);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });
  });

  describe('formatSearchMatchAsJson', () => {
    it('should produce valid JSON for search match', () => {
      const match = createMockSearchMatch();
      const output = formatSearchMatchAsJson(match);

      expect(isValidJson(output)).toBe(true);
      const parsed = JSON.parse(output);
      expect(parsed.doc_id).toBeDefined();
      expect(parsed.item).toBeDefined();
      expect(parsed.matched_fields).toBeDefined();
    });
  });

  describe('formatSearchMatchesAsJson', () => {
    it('should format array of search matches', () => {
      const matches = [createMockSearchMatch(), createMockSearchMatch()];
      const output = formatSearchMatchesAsJson(matches);
      const parsed = JSON.parse(output);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });
  });

  describe('formatAsJson (generic)', () => {
    it('should detect and format RequestLogDoc', () => {
      const doc = createMockDoc();
      const output = formatAsJson(doc);

      expect(isValidJson(output)).toBe(true);
    });

    it('should detect and format array of items', () => {
      const items = [createMockItem()];
      const output = formatAsJson(items);

      expect(isValidJson(output)).toBe(true);
    });
  });
});

describe('CSV Formatter', () => {
  describe('RFC 4180 Compliance', () => {
    it('should escape fields containing commas', () => {
      const item = createMockItem({ title: 'Title with, comma' });
      const output = formatItemAsCsv(item);

      expect(output).toContain('"Title with, comma"');
    });

    it('should escape fields containing double quotes', () => {
      const item = createMockItem({ title: 'Title with "quotes"' });
      const output = formatItemAsCsv(item);

      expect(output).toContain('"Title with ""quotes"""');
    });

    it('should escape fields containing newlines', () => {
      const item = createMockItem({ notes: 'Line 1\nLine 2' });
      const output = formatItemAsCsv(item);

      expect(output).toContain('"Line 1\nLine 2"');
    });

    it('should include header row', () => {
      const item = createMockItem();
      const output = formatItemAsCsv(item);
      const lines = output.split('\n');

      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('title');
    });
  });

  describe('formatDocAsCsv', () => {
    it('should format document metadata as CSV', () => {
      const doc = createMockDoc();
      const output = formatDocAsCsv(doc);
      const lines = output.split('\n');

      expect(lines[0]).toContain('doc_id');
      expect(lines[0]).toContain('title');
      expect(lines[1]).toContain(doc.doc_id);
    });
  });

  describe('formatDocsAsCsv', () => {
    it('should format multiple documents', () => {
      const docs = [createMockDoc(), createMockDoc({ doc_id: 'REQ-20251204-other' })];
      const output = formatDocsAsCsv(docs);
      const lines = output.split('\n');

      expect(lines.length).toBe(3); // header + 2 data rows
    });

    it('should return header only for empty array', () => {
      const output = formatDocsAsCsv([]);
      const lines = output.split('\n');

      expect(lines.length).toBe(1); // header only
      expect(lines[0]).toContain('doc_id');
    });
  });

  describe('formatDocMetaAsCsv', () => {
    it('should include path, doc_id, title, item_count, updated_at', () => {
      const meta = createMockDocMeta();
      const output = formatDocMetaAsCsv(meta);
      const [header] = output.split('\n');

      expect(header).toContain('path');
      expect(header).toContain('doc_id');
      expect(header).toContain('title');
      expect(header).toContain('item_count');
      expect(header).toContain('updated_at');
    });
  });

  describe('formatDocMetasAsCsv', () => {
    it('should format array of DocMetas', () => {
      const metas = [createMockDocMeta(), createMockDocMeta()];
      const output = formatDocMetasAsCsv(metas);
      const lines = output.split('\n');

      expect(lines.length).toBe(3);
    });
  });

  describe('formatItemAsCsv', () => {
    it('should serialize tags as semicolon-separated', () => {
      const item = createMockItem({ tags: ['tag1', 'tag2', 'tag3'] });
      const output = formatItemAsCsv(item);

      expect(output).toContain('tag1;tag2;tag3');
    });
  });

  describe('formatItemsAsCsv', () => {
    it('should format array of items', () => {
      const items = [createMockItem(), createMockItem()];
      const output = formatItemsAsCsv(items);
      const lines = output.split('\n');

      expect(lines.length).toBe(3);
    });
  });

  describe('formatSearchMatchAsCsv', () => {
    it('should include match context fields', () => {
      const match = createMockSearchMatch();
      const output = formatSearchMatchAsCsv(match);
      const [header] = output.split('\n');

      expect(header).toContain('doc_id');
      expect(header).toContain('item_id');
      expect(header).toContain('matched_fields');
    });
  });

  describe('formatSearchMatchesAsCsv', () => {
    it('should format array of matches', () => {
      const matches = [createMockSearchMatch(), createMockSearchMatch()];
      const output = formatSearchMatchesAsCsv(matches);
      const lines = output.split('\n');

      expect(lines.length).toBe(3);
    });

    it('should return header only for empty matches', () => {
      const output = formatSearchMatchesAsCsv([]);
      const lines = output.split('\n');

      expect(lines.length).toBe(1);
    });
  });

  describe('formatAsCsv (generic)', () => {
    it('should detect and format RequestLogDoc', () => {
      const doc = createMockDoc();
      const output = formatAsCsv(doc);

      expect(output).toContain('doc_id');
      expect(output).toContain(doc.doc_id);
    });

    it('should return empty string for empty array', () => {
      const output = formatAsCsv([]);
      expect(output).toBe('');
    });
  });
});

describe('YAML Formatter', () => {
  describe('formatDocAsYaml', () => {
    it('should produce valid YAML structure', () => {
      const doc = createMockDoc();
      const output = formatDocAsYaml(doc);

      expect(output).toContain('doc_id:');
      expect(output).toContain('title:');
      expect(output).toContain('items:');
    });

    it('should serialize dates as ISO 8601 strings', () => {
      const doc = createMockDoc();
      const output = formatDocAsYaml(doc);

      expect(output).toMatch(/created_at: \d{4}-\d{2}-\d{2}T/);
      expect(output).toMatch(/updated_at: \d{4}-\d{2}-\d{2}T/);
    });

    it('should format arrays correctly', () => {
      const doc = createMockDoc({ tags: ['api', 'ux', 'enhancement'] });
      const output = formatDocAsYaml(doc);

      expect(output).toContain('tags:');
      expect(output).toContain('- api');
      expect(output).toContain('- ux');
    });
  });

  describe('formatDocsAsYaml', () => {
    it('should format array of documents', () => {
      const docs = [createMockDoc(), createMockDoc()];
      const output = formatDocsAsYaml(docs);

      expect(output).toContain('- doc_id:');
    });

    it('should handle empty array', () => {
      const output = formatDocsAsYaml([]);
      expect(output.trim()).toBe('[]');
    });
  });

  describe('formatDocMetaAsYaml', () => {
    it('should format DocMeta fields', () => {
      const meta = createMockDocMeta();
      const output = formatDocMetaAsYaml(meta);

      expect(output).toContain('path:');
      expect(output).toContain('doc_id:');
      expect(output).toContain('item_count:');
    });
  });

  describe('formatDocMetasAsYaml', () => {
    it('should format array of DocMetas', () => {
      const metas = [createMockDocMeta(), createMockDocMeta()];
      const output = formatDocMetasAsYaml(metas);

      expect(output).toContain('- path:');
    });
  });

  describe('formatItemAsYaml', () => {
    it('should format item fields', () => {
      const item = createMockItem();
      const output = formatItemAsYaml(item);

      expect(output).toContain('id:');
      expect(output).toContain('title:');
      expect(output).toContain('type:');
      expect(output).toContain('tags:');
    });
  });

  describe('formatItemsAsYaml', () => {
    it('should format array of items', () => {
      const items = [createMockItem(), createMockItem()];
      const output = formatItemsAsYaml(items);

      expect(output).toContain('- id:');
    });
  });

  describe('formatSearchMatchAsYaml', () => {
    it('should include match context', () => {
      const match = createMockSearchMatch();
      const output = formatSearchMatchAsYaml(match);

      expect(output).toContain('doc_id:');
      expect(output).toContain('doc_path:');
      expect(output).toContain('matched_fields:');
    });
  });

  describe('formatSearchMatchesAsYaml', () => {
    it('should format array of matches', () => {
      const matches = [createMockSearchMatch(), createMockSearchMatch()];
      const output = formatSearchMatchesAsYaml(matches);

      expect(output).toContain('- item:');
    });
  });

  describe('formatAsYaml (generic)', () => {
    it('should detect and format various data types', () => {
      const doc = createMockDoc();
      const output = formatAsYaml(doc);

      expect(output).toContain('doc_id:');
    });
  });
});

describe('Table Formatter', () => {
  describe('formatDocAsTable', () => {
    it('should include document metadata', () => {
      const doc = createMockDoc();
      const output = formatDocAsTable(doc);

      expect(output).toContain('Doc ID');
      expect(output).toContain('Title');
      expect(output).toContain('Project');
      expect(output).toContain(doc.doc_id);
    });

    it('should include items section when items exist', () => {
      const doc = createMockDoc();
      const output = formatDocAsTable(doc);

      expect(output).toContain('Items:');
    });
  });

  describe('formatDocsAsTable', () => {
    it('should display multiple documents in table', () => {
      const docs = [
        createMockDoc({ doc_id: 'REQ-20251203-project-a' }),
        createMockDoc({ doc_id: 'REQ-20251203-project-b' }),
      ];
      const output = formatDocsAsTable(docs);

      expect(output).toContain('REQ-20251203-project-a');
      expect(output).toContain('REQ-20251203-project-b');
    });

    it('should return "No documents found." for empty array', () => {
      const output = formatDocsAsTable([]);
      expect(output).toBe('No documents found.');
    });
  });

  describe('formatDocMetaAsTable', () => {
    it('should display DocMeta fields', () => {
      const meta = createMockDocMeta();
      const output = formatDocMetaAsTable(meta);

      expect(output).toContain('Doc ID');
      expect(output).toContain('Path');
      expect(output).toContain('Items');
    });
  });

  describe('formatDocMetasAsTable', () => {
    it('should display multiple DocMetas', () => {
      const metas = [createMockDocMeta(), createMockDocMeta()];
      const output = formatDocMetasAsTable(metas);

      expect(output).toContain('Doc ID');
      expect(output).toContain('Path');
    });

    it('should return message for empty array', () => {
      const output = formatDocMetasAsTable([]);
      expect(output).toBe('No documents found.');
    });
  });

  describe('formatItemAsTable', () => {
    it('should display item fields in key-value format', () => {
      const item = createMockItem();
      const output = formatItemAsTable(item);

      expect(output).toContain('ID');
      expect(output).toContain('Title');
      expect(output).toContain('Type');
      expect(output).toContain('Priority');
      expect(output).toContain('Status');
    });
  });

  describe('formatItemsAsTable', () => {
    it('should display multiple items', () => {
      const items = [
        createMockItem({ id: 'REQ-20251203-test-01' }),
        createMockItem({ id: 'REQ-20251203-test-02' }),
      ];
      const output = formatItemsAsTable(items);

      expect(output).toContain('REQ-20251203-test-01');
      expect(output).toContain('REQ-20251203-test-02');
    });

    it('should return message for empty array', () => {
      const output = formatItemsAsTable([]);
      expect(output).toBe('No items found.');
    });
  });

  describe('formatSearchMatchAsTable', () => {
    it('should display match context', () => {
      const match = createMockSearchMatch();
      const output = formatSearchMatchAsTable(match);

      expect(output).toContain('Doc ID');
      expect(output).toContain('Matched In');
    });
  });

  describe('formatSearchMatchesAsTable', () => {
    it('should display multiple matches', () => {
      const matches = [createMockSearchMatch(), createMockSearchMatch()];
      const output = formatSearchMatchesAsTable(matches);

      expect(output).toContain('Item ID');
      expect(output).toContain('Doc ID');
    });

    it('should return message for empty matches', () => {
      const output = formatSearchMatchesAsTable([]);
      expect(output).toBe('No matches found.');
    });
  });

  describe('formatAsTable (generic)', () => {
    it('should detect and format various data types', () => {
      const doc = createMockDoc();
      const output = formatAsTable(doc);

      expect(output).toContain('Doc ID');
    });

    it('should return "No data." for empty array', () => {
      const output = formatAsTable([]);
      expect(output).toBe('No data.');
    });
  });
});

describe('Human Formatter', () => {
  // Disable colors for consistent test output
  const noColorOptions = { color: false };

  describe('formatDocAsHuman', () => {
    it('should include document title prominently', () => {
      const doc = createMockDoc({ title: 'My Important Doc' });
      const output = formatDocAsHuman(doc, noColorOptions);

      expect(output).toContain('My Important Doc');
    });

    it('should include metadata lines', () => {
      const doc = createMockDoc();
      const output = formatDocAsHuman(doc, noColorOptions);

      expect(output).toContain('ID:');
      expect(output).toContain('Project:');
      expect(output).toContain('Items:');
      expect(output).toContain('Tags:');
    });

    it('should list all items', () => {
      const doc = createMockDoc({
        items: [
          createMockItem({ title: 'First Item' }),
          createMockItem({ id: 'REQ-20251203-test-02', title: 'Second Item' }),
        ],
      });
      const output = formatDocAsHuman(doc, noColorOptions);

      expect(output).toContain('First Item');
      expect(output).toContain('Second Item');
    });
  });

  describe('formatDocsAsHuman', () => {
    it('should show document count', () => {
      const docs = [createMockDoc(), createMockDoc()];
      const output = formatDocsAsHuman(docs, noColorOptions);

      expect(output).toContain('Found 2 document(s)');
    });

    it('should return "No documents found." for empty array', () => {
      const output = formatDocsAsHuman([], noColorOptions);
      expect(output).toContain('No documents found');
    });
  });

  describe('formatDocMetaAsHuman', () => {
    it('should display meta information', () => {
      const meta = createMockDocMeta({ title: 'My Doc Meta' });
      const output = formatDocMetaAsHuman(meta, noColorOptions);

      expect(output).toContain('My Doc Meta');
      expect(output).toContain('ID:');
      expect(output).toContain('Path:');
      expect(output).toContain('Items:');
    });
  });

  describe('formatDocMetasAsHuman', () => {
    it('should show count and list metas', () => {
      const metas = [createMockDocMeta(), createMockDocMeta()];
      const output = formatDocMetasAsHuman(metas, noColorOptions);

      expect(output).toContain('Found 2 document(s)');
    });

    it('should return message for empty array', () => {
      const output = formatDocMetasAsHuman([], noColorOptions);
      expect(output).toContain('No documents found');
    });
  });

  describe('formatItemAsHuman', () => {
    it('should display item title and metadata', () => {
      const item = createMockItem({ title: 'Test Bug Fix' });
      const output = formatItemAsHuman(item, noColorOptions);

      expect(output).toContain('Test Bug Fix');
      expect(output).toContain('ID:');
      expect(output).toContain('Type:');
      expect(output).toContain('Priority:');
    });

    it('should show notes when present', () => {
      const item = createMockItem({ notes: 'Detailed explanation here' });
      const output = formatItemAsHuman(item, noColorOptions);

      expect(output).toContain('Detailed explanation here');
    });
  });

  describe('formatItemsAsHuman', () => {
    it('should show item count', () => {
      const items = [createMockItem(), createMockItem()];
      const output = formatItemsAsHuman(items, noColorOptions);

      expect(output).toContain('Found 2 item(s)');
    });

    it('should return message for empty array', () => {
      const output = formatItemsAsHuman([], noColorOptions);
      expect(output).toContain('No items found');
    });
  });

  describe('formatSearchMatchAsHuman', () => {
    it('should display match context', () => {
      const match = createMockSearchMatch({
        matched_fields: [{ field: 'title', match_text: 'test match' }],
      });
      const output = formatSearchMatchAsHuman(match, noColorOptions);

      expect(output).toContain('Matched in:');
      expect(output).toContain('title');
    });
  });

  describe('formatSearchMatchesAsHuman', () => {
    it('should show match count', () => {
      const matches = [createMockSearchMatch(), createMockSearchMatch()];
      const output = formatSearchMatchesAsHuman(matches, noColorOptions);

      expect(output).toContain('Found 2 match(es)');
    });

    it('should return message for no matches', () => {
      const output = formatSearchMatchesAsHuman([], noColorOptions);
      expect(output).toContain('No matches found');
    });
  });

  describe('formatAsHuman (generic)', () => {
    it('should detect and format various data types', () => {
      const doc = createMockDoc();
      const output = formatAsHuman(doc, noColorOptions);

      expect(output).toContain('ID:');
    });

    it('should return "No data." for empty array', () => {
      const output = formatAsHuman([], noColorOptions);
      expect(output).toContain('No data');
    });
  });

  describe('color options', () => {
    it('should accept color: true option', () => {
      const item = createMockItem({ type: 'bug' });
      // Just verify it doesn't throw
      const output = formatItemAsHuman(item, { color: true });
      expect(output).toContain('bug');
    });

    it('should accept color: false option', () => {
      const item = createMockItem({ type: 'bug' });
      const output = formatItemAsHuman(item, { color: false });
      expect(output).toContain('bug');
    });

    it('should work without color option (auto-detect)', () => {
      const item = createMockItem();
      const output = formatItemAsHuman(item);
      expect(output).toBeTruthy();
    });
  });
});

describe('formatOutput (main dispatcher)', () => {
  it('should dispatch to JSON formatter', () => {
    const doc = createMockDoc();
    const output = formatOutput(doc, { format: 'json' });

    expect(isValidJson(output)).toBe(true);
  });

  it('should dispatch to YAML formatter', () => {
    const doc = createMockDoc();
    const output = formatOutput(doc, { format: 'yaml' });

    expect(output).toContain('doc_id:');
  });

  it('should dispatch to CSV formatter', () => {
    const doc = createMockDoc();
    const output = formatOutput(doc, { format: 'csv' });

    expect(output).toContain('doc_id');
  });

  it('should dispatch to table formatter', () => {
    const doc = createMockDoc();
    const output = formatOutput(doc, { format: 'table' });

    expect(output).toContain('Doc ID');
  });

  it('should dispatch to human formatter', () => {
    const doc = createMockDoc();
    const output = formatOutput(doc, { format: 'human' });

    expect(output).toContain('ID:');
  });

  it('should return empty string in quiet mode', () => {
    const doc = createMockDoc();
    const output = formatOutput(doc, { format: 'json', quiet: true });

    expect(output).toBe('');
  });
});

describe('Format utilities', () => {
  describe('isValidFormat', () => {
    it('should return true for valid formats', () => {
      expect(isValidFormat('human')).toBe(true);
      expect(isValidFormat('json')).toBe(true);
      expect(isValidFormat('csv')).toBe(true);
      expect(isValidFormat('yaml')).toBe(true);
      expect(isValidFormat('table')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(isValidFormat('xml')).toBe(false);
      expect(isValidFormat('text')).toBe(false);
      expect(isValidFormat('')).toBe(false);
    });
  });

  describe('parseFormat', () => {
    it('should return format if valid', () => {
      expect(parseFormat('json')).toBe('json');
      expect(parseFormat('yaml')).toBe('yaml');
    });

    it('should return default for undefined', () => {
      expect(parseFormat(undefined)).toBe('human');
    });

    it('should return default for invalid', () => {
      expect(parseFormat('invalid')).toBe('human');
    });

    it('should use custom default when provided', () => {
      expect(parseFormat(undefined, 'table')).toBe('table');
      expect(parseFormat('invalid', 'csv')).toBe('csv');
    });
  });
});

describe('Type Guards', () => {
  describe('isRequestLogDoc', () => {
    it('should return true for valid doc', () => {
      const doc = createMockDoc();
      expect(isRequestLogDoc(doc)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isRequestLogDoc(null)).toBe(false);
      expect(isRequestLogDoc(undefined)).toBe(false);
      expect(isRequestLogDoc({})).toBe(false);
      expect(isRequestLogDoc({ title: 'test' })).toBe(false);
    });
  });

  describe('isRequestLogDocArray', () => {
    it('should return true for array of docs', () => {
      const docs = [createMockDoc()];
      expect(isRequestLogDocArray(docs)).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(isRequestLogDocArray([])).toBe(false);
    });

    it('should return false for non-doc array', () => {
      expect(isRequestLogDocArray([{}])).toBe(false);
    });
  });

  describe('isDocMeta', () => {
    it('should return true for valid DocMeta', () => {
      const meta = createMockDocMeta();
      expect(isDocMeta(meta)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isDocMeta(null)).toBe(false);
      expect(isDocMeta({})).toBe(false);
    });
  });

  describe('isDocMetaArray', () => {
    it('should return true for array of DocMetas', () => {
      const metas = [createMockDocMeta()];
      expect(isDocMetaArray(metas)).toBe(true);
    });
  });

  describe('isRequestLogItem', () => {
    it('should return true for valid item', () => {
      const item = createMockItem();
      expect(isRequestLogItem(item)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isRequestLogItem(null)).toBe(false);
      expect(isRequestLogItem({})).toBe(false);
    });
  });

  describe('isRequestLogItemArray', () => {
    it('should return true for array of items', () => {
      const items = [createMockItem()];
      expect(isRequestLogItemArray(items)).toBe(true);
    });
  });

  describe('isSearchMatch', () => {
    it('should return true for valid SearchMatch', () => {
      const match = createMockSearchMatch();
      expect(isSearchMatch(match)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isSearchMatch(null)).toBe(false);
      expect(isSearchMatch({})).toBe(false);
    });
  });

  describe('isSearchMatchArray', () => {
    it('should return true for array of matches', () => {
      const matches = [createMockSearchMatch()];
      expect(isSearchMatchArray(matches)).toBe(true);
    });
  });

  describe('isEmptyArray', () => {
    it('should return true for empty array', () => {
      expect(isEmptyArray([])).toBe(true);
    });

    it('should return false for non-empty array', () => {
      expect(isEmptyArray([1])).toBe(false);
    });

    it('should return false for non-array', () => {
      expect(isEmptyArray({})).toBe(false);
      expect(isEmptyArray(null)).toBe(false);
    });
  });

  describe('serializeDate', () => {
    it('should return ISO 8601 string', () => {
      const date = new Date('2025-12-03T10:00:00Z');
      const result = serializeDate(date);

      expect(result).toBe('2025-12-03T10:00:00.000Z');
    });
  });
});
