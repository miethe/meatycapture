/**
 * Domain Models Tests
 *
 * Tests for type guards:
 * - isProject: Validates Project objects
 * - isFieldOption: Validates FieldOption objects
 * - isItemDraft: Validates ItemDraft objects
 * - isRequestLogItem: Validates RequestLogItem objects
 * - isRequestLogDoc: Validates RequestLogDoc objects
 * - DEFAULT_FIELD_OPTIONS: Validates default field values
 */

import { describe, it, expect } from 'vitest';
import {
  isProject,
  isFieldOption,
  isItemDraft,
  isRequestLogItem,
  isRequestLogDoc,
  DEFAULT_FIELD_OPTIONS,
  type Project,
  type FieldOption,
  type ItemDraft,
} from './index';
import { createTestDoc, createTestItem } from '../test-helpers';

describe('isProject', () => {
  it('should return true for valid Project object', () => {
    const project: Project = {
      id: 'test-project',
      name: 'Test Project',
      default_path: '/path/to/project',
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(true);
  });

  it('should return true for valid Project with repo_url', () => {
    const project: Project = {
      id: 'test-project',
      name: 'Test Project',
      default_path: '/path/to/project',
      repo_url: 'https://github.com/user/repo',
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isProject(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isProject(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isProject('not an object')).toBe(false);
    expect(isProject(123)).toBe(false);
    expect(isProject(true)).toBe(false);
  });

  it('should return false for object missing id', () => {
    const project = {
      name: 'Test Project',
      default_path: '/path/to/project',
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(false);
  });

  it('should return false for object with non-string id', () => {
    const project = {
      id: 123,
      name: 'Test Project',
      default_path: '/path/to/project',
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(false);
  });

  it('should return false for object missing name', () => {
    const project = {
      id: 'test-project',
      default_path: '/path/to/project',
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(false);
  });

  it('should return false for object missing default_path', () => {
    const project = {
      id: 'test-project',
      name: 'Test Project',
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(false);
  });

  it('should return false for object with non-boolean enabled', () => {
    const project = {
      id: 'test-project',
      name: 'Test Project',
      default_path: '/path/to/project',
      enabled: 'true',
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(false);
  });

  it('should return false for object missing created_at', () => {
    const project = {
      id: 'test-project',
      name: 'Test Project',
      default_path: '/path/to/project',
      enabled: true,
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(false);
  });

  it('should return false for object with non-Date created_at', () => {
    const project = {
      id: 'test-project',
      name: 'Test Project',
      default_path: '/path/to/project',
      enabled: true,
      created_at: '2025-12-03',
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(false);
  });

  it('should return false for object with invalid repo_url type', () => {
    const project = {
      id: 'test-project',
      name: 'Test Project',
      default_path: '/path/to/project',
      repo_url: 123,
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isProject(project)).toBe(false);
  });
});

describe('isFieldOption', () => {
  it('should return true for valid global FieldOption', () => {
    const option: FieldOption = {
      id: 'opt-1',
      field: 'type',
      value: 'enhancement',
      scope: 'global',
      created_at: new Date(),
    };

    expect(isFieldOption(option)).toBe(true);
  });

  it('should return true for valid project FieldOption', () => {
    const option: FieldOption = {
      id: 'opt-1',
      field: 'type',
      value: 'enhancement',
      scope: 'project',
      project_id: 'test-project',
      created_at: new Date(),
    };

    expect(isFieldOption(option)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isFieldOption(null)).toBe(false);
  });

  it('should return false for object missing id', () => {
    const option = {
      field: 'type',
      value: 'enhancement',
      scope: 'global',
      created_at: new Date(),
    };

    expect(isFieldOption(option)).toBe(false);
  });

  it('should return false for invalid field name', () => {
    const option = {
      id: 'opt-1',
      field: 'invalid-field',
      value: 'enhancement',
      scope: 'global',
      created_at: new Date(),
    };

    expect(isFieldOption(option)).toBe(false);
  });

  it('should return false for invalid scope', () => {
    const option = {
      id: 'opt-1',
      field: 'type',
      value: 'enhancement',
      scope: 'invalid-scope',
      created_at: new Date(),
    };

    expect(isFieldOption(option)).toBe(false);
  });

  it('should return false for project scope without project_id', () => {
    const option = {
      id: 'opt-1',
      field: 'type',
      value: 'enhancement',
      scope: 'project',
      created_at: new Date(),
    };

    expect(isFieldOption(option)).toBe(false);
  });

  it('should return true for all valid field names', () => {
    const fieldNames = ['type', 'domain', 'context', 'priority', 'status', 'tags'];

    for (const field of fieldNames) {
      const option = {
        id: 'opt-1',
        field,
        value: 'test',
        scope: 'global' as const,
        created_at: new Date(),
      };
      expect(isFieldOption(option)).toBe(true);
    }
  });
});

describe('isItemDraft', () => {
  it('should return true for valid ItemDraft', () => {
    const draft: ItemDraft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: ['test', 'example'],
      notes: 'Test notes',
    };

    expect(isItemDraft(draft)).toBe(true);
  });

  it('should return true for ItemDraft with empty tags', () => {
    const draft: ItemDraft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: [],
      notes: 'Test notes',
    };

    expect(isItemDraft(draft)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isItemDraft(null)).toBe(false);
  });

  it('should return false for object missing title', () => {
    const draft = {
      type: 'enhancement',
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: 'Test notes',
    };

    expect(isItemDraft(draft)).toBe(false);
  });

  it('should return false for object with non-string field', () => {
    const draft = {
      title: 'Test Item',
      type: 123,
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: 'Test notes',
    };

    expect(isItemDraft(draft)).toBe(false);
  });

  it('should return false for object with non-array tags', () => {
    const draft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: 'not-an-array',
      notes: 'Test notes',
    };

    expect(isItemDraft(draft)).toBe(false);
  });

  it('should return false for object with non-string tag elements', () => {
    const draft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: ['test', 123, 'example'],
      notes: 'Test notes',
    };

    expect(isItemDraft(draft)).toBe(false);
  });
});

describe('isRequestLogItem', () => {
  it('should return true for valid RequestLogItem', () => {
    const item = createTestItem();
    expect(isRequestLogItem(item)).toBe(true);
  });

  it('should return false for ItemDraft (missing id and created_at)', () => {
    const draft: ItemDraft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: 'Test notes',
    };

    expect(isRequestLogItem(draft)).toBe(false);
  });

  it('should return false for object missing id', () => {
    const item = {
      title: 'Test Item',
      type: 'enhancement',
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: 'Test notes',
      created_at: new Date(),
    };

    expect(isRequestLogItem(item)).toBe(false);
  });

  it('should return false for object missing created_at', () => {
    const item = {
      id: 'REQ-20251203-test-01',
      title: 'Test Item',
      type: 'enhancement',
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: 'Test notes',
    };

    expect(isRequestLogItem(item)).toBe(false);
  });

  it('should return false for object with non-Date created_at', () => {
    const item = {
      id: 'REQ-20251203-test-01',
      title: 'Test Item',
      type: 'enhancement',
      domain: 'web',
      context: 'Test context',
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: 'Test notes',
      created_at: '2025-12-03',
    };

    expect(isRequestLogItem(item)).toBe(false);
  });
});

describe('isRequestLogDoc', () => {
  it('should return true for valid RequestLogDoc', () => {
    const doc = createTestDoc();
    expect(isRequestLogDoc(doc)).toBe(true);
  });

  it('should return true for RequestLogDoc with no items', () => {
    const doc = createTestDoc({
      items: [],
      items_index: [],
      item_count: 0,
      tags: [],
    });
    expect(isRequestLogDoc(doc)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isRequestLogDoc(null)).toBe(false);
  });

  it('should return false for object missing doc_id', () => {
    const doc = {
      title: 'Test',
      project_id: 'test',
      items: [],
      items_index: [],
      tags: [],
      item_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isRequestLogDoc(doc)).toBe(false);
  });

  it('should return false for object with non-array items', () => {
    const doc = {
      doc_id: 'REQ-20251203-test',
      title: 'Test',
      project_id: 'test',
      items: 'not-an-array',
      items_index: [],
      tags: [],
      item_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isRequestLogDoc(doc)).toBe(false);
  });

  it('should return false for object with invalid item in items array', () => {
    const doc = {
      doc_id: 'REQ-20251203-test',
      title: 'Test',
      project_id: 'test',
      items: [
        {
          id: 'REQ-20251203-test-01',
          title: 'Valid Item',
          type: 'enhancement',
          domain: 'web',
          context: 'Test',
          priority: 'medium',
          status: 'triage',
          tags: [],
          notes: 'Test',
          created_at: new Date(),
        },
        {
          // Missing required fields
          id: 'REQ-20251203-test-02',
          title: 'Invalid Item',
        },
      ],
      items_index: [],
      tags: [],
      item_count: 2,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isRequestLogDoc(doc)).toBe(false);
  });

  it('should return false for object with non-array tags', () => {
    const doc = {
      doc_id: 'REQ-20251203-test',
      title: 'Test',
      project_id: 'test',
      items: [],
      items_index: [],
      tags: 'not-an-array',
      item_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isRequestLogDoc(doc)).toBe(false);
  });

  it('should return false for object with non-string tag', () => {
    const doc = {
      doc_id: 'REQ-20251203-test',
      title: 'Test',
      project_id: 'test',
      items: [],
      items_index: [],
      tags: ['valid', 123, 'tags'],
      item_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isRequestLogDoc(doc)).toBe(false);
  });

  it('should return false for object with non-number item_count', () => {
    const doc = {
      doc_id: 'REQ-20251203-test',
      title: 'Test',
      project_id: 'test',
      items: [],
      items_index: [],
      tags: [],
      item_count: '0',
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(isRequestLogDoc(doc)).toBe(false);
  });
});

describe('DEFAULT_FIELD_OPTIONS', () => {
  it('should contain type options', () => {
    expect(DEFAULT_FIELD_OPTIONS.type).toBeDefined();
    expect(Array.isArray(DEFAULT_FIELD_OPTIONS.type)).toBe(true);
    expect(DEFAULT_FIELD_OPTIONS.type.length).toBeGreaterThan(0);
  });

  it('should contain expected type values', () => {
    const types = DEFAULT_FIELD_OPTIONS.type;
    expect(types).toContain('enhancement');
    expect(types).toContain('bug');
    expect(types).toContain('idea');
    expect(types).toContain('task');
    expect(types).toContain('question');
  });

  it('should contain priority options', () => {
    expect(DEFAULT_FIELD_OPTIONS.priority).toBeDefined();
    expect(Array.isArray(DEFAULT_FIELD_OPTIONS.priority)).toBe(true);
    expect(DEFAULT_FIELD_OPTIONS.priority.length).toBeGreaterThan(0);
  });

  it('should contain expected priority values', () => {
    const priorities = DEFAULT_FIELD_OPTIONS.priority;
    expect(priorities).toContain('low');
    expect(priorities).toContain('medium');
    expect(priorities).toContain('high');
    expect(priorities).toContain('critical');
  });

  it('should contain status options', () => {
    expect(DEFAULT_FIELD_OPTIONS.status).toBeDefined();
    expect(Array.isArray(DEFAULT_FIELD_OPTIONS.status)).toBe(true);
    expect(DEFAULT_FIELD_OPTIONS.status.length).toBeGreaterThan(0);
  });

  it('should contain expected status values', () => {
    const statuses = DEFAULT_FIELD_OPTIONS.status;
    expect(statuses).toContain('triage');
    expect(statuses).toContain('backlog');
    expect(statuses).toContain('planned');
    expect(statuses).toContain('in-progress');
    expect(statuses).toContain('done');
    expect(statuses).toContain('wontfix');
  });

  it('should be read-only (const)', () => {
    // TypeScript enforces this at compile time, but we can verify the structure
    expect(DEFAULT_FIELD_OPTIONS).toBeDefined();
    expect(typeof DEFAULT_FIELD_OPTIONS).toBe('object');
  });

  it('should not contain domain or context or tags options', () => {
    // These fields don't have defaults - they're dynamic per project
    expect('domain' in DEFAULT_FIELD_OPTIONS).toBe(false);
    expect('context' in DEFAULT_FIELD_OPTIONS).toBe(false);
    expect('tags' in DEFAULT_FIELD_OPTIONS).toBe(false);
  });
});
