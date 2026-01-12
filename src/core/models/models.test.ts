/**
 * Domain Models Tests
 *
 * Tests for type guards:
 * - isProject: Validates Project objects
 * - isFieldOption: Validates FieldOption objects
 * - isItemDraft: Validates ItemDraft objects
 * - isRequestLogItem: Validates RequestLogItem objects
 * - isRequestLogDoc: Validates RequestLogDoc objects
 * - isNote: Validates Note objects
 * - validateNote: Validates Note objects and returns error messages
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
  NOTE_TYPES,
  NOTE_TYPE_LABELS,
  NOTE_TYPE_COLORS,
  NOTE_TYPE_OPTIONS,
  NOTE_MAX_CONTENT_LENGTH,
  isNoteType,
  isNote,
  validateNote,
  convertLegacyNotes,
  type Project,
  type FieldOption,
  type ItemDraft,
  type NoteType,
  type Note,
} from './index';
import { createTestDoc, createTestItem, createTestNote } from '../test-helpers';

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
    const fieldNames = ['type', 'domain', 'subdomain', 'priority', 'status', 'tags'];

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
  it('should return true for valid ItemDraft with empty notes array', () => {
    const draft: ItemDraft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      feature: [],
      priority: 'medium',
      status: 'triage',
      tags: ['test', 'example'],
      notes: [],
    };

    expect(isItemDraft(draft)).toBe(true);
  });

  it('should return true for ItemDraft with valid Notes', () => {
    const draft: ItemDraft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      feature: [],
      priority: 'medium',
      status: 'triage',
      tags: ['test', 'example'],
      notes: [createTestNote(), createTestNote({ id: 'NOTE-20251203-test-project-01-02' })],
    };

    expect(isItemDraft(draft)).toBe(true);
  });

  it('should return true for ItemDraft with empty tags', () => {
    const draft: ItemDraft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      feature: [],
      priority: 'medium',
      status: 'triage',
      tags: [],
      notes: [],
    };

    expect(isItemDraft(draft)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isItemDraft(null)).toBe(false);
  });

  it('should return false for object missing title', () => {
    const draft = {
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: [],
    };

    expect(isItemDraft(draft)).toBe(false);
  });

  it('should return false for object with non-string field', () => {
    const draft = {
      title: 'Test Item',
      type: 123,
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: [],
    };

    expect(isItemDraft(draft)).toBe(false);
  });

  it('should return false for object with non-array tags', () => {
    const draft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: 'not-an-array',
      notes: [],
    };

    expect(isItemDraft(draft)).toBe(false);
  });

  it('should return false for object with non-string tag elements', () => {
    const draft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test', 123, 'example'],
      notes: [],
    };

    expect(isItemDraft(draft)).toBe(false);
  });

  it('should reject notes as string (old format)', () => {
    const draft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: 'old string notes',
    };

    expect(isItemDraft(draft)).toBe(false);
  });

  it('should reject notes array with invalid Note objects', () => {
    const draft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: [{ invalid: 'object' }],
    };

    expect(isItemDraft(draft)).toBe(false);
  });
});

describe('isRequestLogItem', () => {
  it('should return true for valid RequestLogItem with empty notes', () => {
    const item = createTestItem();
    expect(isRequestLogItem(item)).toBe(true);
  });

  it('should return true for valid RequestLogItem with notes', () => {
    const item = createTestItem({
      notes: [createTestNote(), createTestNote({ id: 'NOTE-20251203-test-project-01-02' })],
    });
    expect(isRequestLogItem(item)).toBe(true);
  });

  it('should return true for RequestLogItem without notes (backward compat)', () => {
    // Simulate legacy item without notes field at all
    const item = {
      id: 'REQ-20251203-test-01',
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      // notes is intentionally omitted for backward compatibility test
      created_at: new Date(),
    };

    expect(isRequestLogItem(item)).toBe(true);
  });

  it('should return false for ItemDraft (missing id and created_at)', () => {
    const draft: ItemDraft = {
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      feature: [],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: [],
    };

    expect(isRequestLogItem(draft)).toBe(false);
  });

  it('should return false for object missing id', () => {
    const item = {
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: [],
      created_at: new Date(),
    };

    expect(isRequestLogItem(item)).toBe(false);
  });

  it('should return false for object missing created_at', () => {
    const item = {
      id: 'REQ-20251203-test-01',
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: [],
    };

    expect(isRequestLogItem(item)).toBe(false);
  });

  it('should return false for object with non-Date created_at', () => {
    const item = {
      id: 'REQ-20251203-test-01',
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: [],
      created_at: '2025-12-03',
    };

    expect(isRequestLogItem(item)).toBe(false);
  });

  it('should return false for notes as string (old format)', () => {
    const item = {
      id: 'REQ-20251203-test-01',
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: 'old string notes',
      created_at: new Date(),
    };

    expect(isRequestLogItem(item)).toBe(false);
  });

  it('should return false for notes array with invalid Note objects', () => {
    const item = {
      id: 'REQ-20251203-test-01',
      title: 'Test Item',
      type: 'enhancement',
      domain: ['web'],
      subdomain: ['test'],
      priority: 'medium',
      status: 'triage',
      tags: ['test'],
      notes: [{ invalid: 'object' }],
      created_at: new Date(),
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
          subdomain: 'test',
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

  it('should return true for RequestLogDoc with archived: true', () => {
    const doc = createTestDoc({ archived: true });
    expect(isRequestLogDoc(doc)).toBe(true);
  });

  it('should return true for RequestLogDoc with archived: false', () => {
    const doc = createTestDoc({ archived: false });
    expect(isRequestLogDoc(doc)).toBe(true);
  });

  it('should return true for RequestLogDoc without archived (backward compatibility)', () => {
    // Simulate legacy doc without archived field
    const doc = {
      doc_id: 'REQ-20251203-test',
      title: 'Test',
      project_id: 'test',
      items: [],
      items_index: [],
      tags: [],
      item_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      // Note: archived is intentionally omitted for backward compatibility test
    };

    expect(isRequestLogDoc(doc)).toBe(true);
  });

  it('should return false for RequestLogDoc with non-boolean archived', () => {
    const doc = {
      doc_id: 'REQ-20251203-test',
      title: 'Test',
      project_id: 'test',
      items: [],
      items_index: [],
      tags: [],
      item_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      archived: 'yes', // Invalid type
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

  it('should not contain domain or subdomain or tags options', () => {
    // These fields don't have defaults - they're dynamic per project
    expect('domain' in DEFAULT_FIELD_OPTIONS).toBe(false);
    expect('subdomain' in DEFAULT_FIELD_OPTIONS).toBe(false);
    expect('tags' in DEFAULT_FIELD_OPTIONS).toBe(false);
  });
});

describe('NoteType', () => {
  describe('NOTE_TYPES', () => {
    it('should have exactly 4 types', () => {
      expect(Object.keys(NOTE_TYPES)).toHaveLength(4);
    });

    it('should have correct values for all types', () => {
      expect(NOTE_TYPES.General).toBe('General');
      expect(NOTE_TYPES.BugFixAttempt).toBe('Bug Fix Attempt');
      expect(NOTE_TYPES.Validation).toBe('Validation');
      expect(NOTE_TYPES.Other).toBe('Other');
    });
  });

  describe('isNoteType', () => {
    it('should return true for all valid types', () => {
      expect(isNoteType('General')).toBe(true);
      expect(isNoteType('Bug Fix Attempt')).toBe(true);
      expect(isNoteType('Validation')).toBe(true);
      expect(isNoteType('Other')).toBe(true);
    });

    it('should return false for lowercase versions', () => {
      expect(isNoteType('general')).toBe(false);
      expect(isNoteType('bug fix attempt')).toBe(false);
      expect(isNoteType('validation')).toBe(false);
      expect(isNoteType('other')).toBe(false);
    });

    it('should return false for wrong format', () => {
      expect(isNoteType('BugFix')).toBe(false);
      expect(isNoteType('BugFixAttempt')).toBe(false); // Key, not value
      expect(isNoteType('bug-fix-attempt')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isNoteType('')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isNoteType(null)).toBe(false);
      expect(isNoteType(undefined)).toBe(false);
    });

    it('should return false for non-string types', () => {
      expect(isNoteType(123)).toBe(false);
      expect(isNoteType(true)).toBe(false);
      expect(isNoteType({})).toBe(false);
      expect(isNoteType([])).toBe(false);
    });
  });

  describe('NOTE_TYPE_LABELS', () => {
    it('should have correct labels for all types', () => {
      expect(NOTE_TYPE_LABELS[NOTE_TYPES.General]).toBe('General');
      expect(NOTE_TYPE_LABELS[NOTE_TYPES.BugFixAttempt]).toBe('Bug Fix Attempt');
      expect(NOTE_TYPE_LABELS[NOTE_TYPES.Validation]).toBe('Validation');
      expect(NOTE_TYPE_LABELS[NOTE_TYPES.Other]).toBe('Other');
    });

    it('should have a label for every note type', () => {
      Object.values(NOTE_TYPES).forEach((type) => {
        expect(NOTE_TYPE_LABELS[type]).toBeDefined();
        expect(typeof NOTE_TYPE_LABELS[type]).toBe('string');
        expect(NOTE_TYPE_LABELS[type].length).toBeGreaterThan(0);
      });
    });
  });

  describe('NOTE_TYPE_COLORS', () => {
    it('should have color classes for all types', () => {
      Object.values(NOTE_TYPES).forEach((type) => {
        expect(NOTE_TYPE_COLORS[type]).toBeDefined();
        expect(typeof NOTE_TYPE_COLORS[type]).toBe('string');
      });
    });

    it('should have expected CSS class names', () => {
      expect(NOTE_TYPE_COLORS[NOTE_TYPES.General]).toBe('note-type-general');
      expect(NOTE_TYPE_COLORS[NOTE_TYPES.BugFixAttempt]).toBe('note-type-bugfix');
      expect(NOTE_TYPE_COLORS[NOTE_TYPES.Validation]).toBe('note-type-validation');
      expect(NOTE_TYPE_COLORS[NOTE_TYPES.Other]).toBe('note-type-other');
    });
  });

  describe('NOTE_TYPE_OPTIONS', () => {
    it('should contain all note types', () => {
      expect(NOTE_TYPE_OPTIONS).toHaveLength(4);
      expect(NOTE_TYPE_OPTIONS).toContain(NOTE_TYPES.General);
      expect(NOTE_TYPE_OPTIONS).toContain(NOTE_TYPES.BugFixAttempt);
      expect(NOTE_TYPE_OPTIONS).toContain(NOTE_TYPES.Validation);
      expect(NOTE_TYPE_OPTIONS).toContain(NOTE_TYPES.Other);
    });

    it('should be in display order (General first)', () => {
      expect(NOTE_TYPE_OPTIONS[0]).toBe(NOTE_TYPES.General);
    });

    it('should be read-only array', () => {
      // TypeScript enforces this at compile time via readonly
      expect(Array.isArray(NOTE_TYPE_OPTIONS)).toBe(true);
    });

    it('should have all elements as valid NoteType', () => {
      NOTE_TYPE_OPTIONS.forEach((option) => {
        expect(isNoteType(option)).toBe(true);
      });
    });
  });

  describe('Type safety (compile-time)', () => {
    it('should allow assignment of valid NoteType values', () => {
      // These should compile without error
      const generalType: NoteType = 'General';
      const bugFixType: NoteType = 'Bug Fix Attempt';
      const validationType: NoteType = 'Validation';
      const otherType: NoteType = 'Other';

      expect(generalType).toBe('General');
      expect(bugFixType).toBe('Bug Fix Attempt');
      expect(validationType).toBe('Validation');
      expect(otherType).toBe('Other');
    });
  });
});

// ============================================================================
// Note Tests
// ============================================================================

// Note: createTestNote is imported from '../test-helpers'

describe('Note', () => {
  describe('NOTE_MAX_CONTENT_LENGTH', () => {
    it('should be 10000 characters', () => {
      expect(NOTE_MAX_CONTENT_LENGTH).toBe(10000);
    });

    it('should be a positive number', () => {
      expect(NOTE_MAX_CONTENT_LENGTH).toBeGreaterThan(0);
    });
  });

  describe('isNote', () => {
    it('should return true for valid Note object', () => {
      const note = createTestNote();
      expect(isNote(note)).toBe(true);
    });

    it('should return true for valid Note with all note types', () => {
      NOTE_TYPE_OPTIONS.forEach((type) => {
        const note = createTestNote({ type });
        expect(isNote(note)).toBe(true);
      });
    });

    it('should return true for Note with empty content', () => {
      const note = createTestNote({ content: '' });
      expect(isNote(note)).toBe(true);
    });

    it('should return true for Note with content at max length', () => {
      const maxContent = 'a'.repeat(NOTE_MAX_CONTENT_LENGTH);
      const note = createTestNote({ content: maxContent });
      expect(isNote(note)).toBe(true);
    });

    it('should return true for Note with markdown content', () => {
      const markdownContent = `# Heading
**Bold** and *italic*
- List item 1
- List item 2

\`\`\`typescript
const code = 'example';
\`\`\``;
      const note = createTestNote({ content: markdownContent });
      expect(isNote(note)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isNote(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNote(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isNote('not an object')).toBe(false);
      expect(isNote(123)).toBe(false);
      expect(isNote(true)).toBe(false);
      expect(isNote([])).toBe(false);
    });

    it('should return false for object missing id', () => {
      const note = {
        type: NOTE_TYPES.General,
        content: 'Test content',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object with non-string id', () => {
      const note = {
        id: 123,
        type: NOTE_TYPES.General,
        content: 'Test content',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object missing type', () => {
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        content: 'Test content',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object with invalid note type', () => {
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        type: 'InvalidType',
        content: 'Test content',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object with lowercase note type', () => {
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        type: 'general', // Should be 'General'
        content: 'Test content',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object missing content', () => {
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        type: NOTE_TYPES.General,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object with non-string content', () => {
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        type: NOTE_TYPES.General,
        content: 123,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object with content exceeding max length', () => {
      const oversizeContent = 'a'.repeat(NOTE_MAX_CONTENT_LENGTH + 1);
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        type: NOTE_TYPES.General,
        content: oversizeContent,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object missing created_at', () => {
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        type: NOTE_TYPES.General,
        content: 'Test content',
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object with non-Date created_at', () => {
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        type: NOTE_TYPES.General,
        content: 'Test content',
        created_at: '2026-01-01T10:00:00Z',
        updated_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object missing updated_at', () => {
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        type: NOTE_TYPES.General,
        content: 'Test content',
        created_at: new Date(),
      };
      expect(isNote(note)).toBe(false);
    });

    it('should return false for object with non-Date updated_at', () => {
      const note = {
        id: 'NOTE-20260101-meatycapture-01-01',
        type: NOTE_TYPES.General,
        content: 'Test content',
        created_at: new Date(),
        updated_at: '2026-01-01T10:00:00Z',
      };
      expect(isNote(note)).toBe(false);
    });
  });

  describe('validateNote', () => {
    it('should return empty array for valid note', () => {
      const note = createTestNote();
      expect(validateNote(note)).toEqual([]);
    });

    it('should return empty array for valid note with all types', () => {
      NOTE_TYPE_OPTIONS.forEach((type) => {
        const note = createTestNote({ type });
        expect(validateNote(note)).toEqual([]);
      });
    });

    it('should return empty array for note with max length content', () => {
      const note = createTestNote({ content: 'a'.repeat(NOTE_MAX_CONTENT_LENGTH) });
      expect(validateNote(note)).toEqual([]);
    });

    it('should return empty array for note with empty content', () => {
      const note = createTestNote({ content: '' });
      expect(validateNote(note)).toEqual([]);
    });

    it('should return error for missing id', () => {
      const note = createTestNote();
      // @ts-expect-error - Testing invalid input
      note.id = undefined;
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Note ID');
    });

    it('should return error for empty id', () => {
      const note = createTestNote({ id: '   ' });
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Note ID cannot be empty');
    });

    it('should return error for non-string id', () => {
      const note = createTestNote();
      // @ts-expect-error - Testing invalid input
      note.id = 123;
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Note ID');
    });

    it('should return error for missing type', () => {
      const note = createTestNote();
      // @ts-expect-error - Testing invalid input
      note.type = undefined;
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Note type');
    });

    it('should return error for invalid note type', () => {
      const note = createTestNote();
      // @ts-expect-error - Testing invalid input
      note.type = 'InvalidType';
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid note type');
      expect(errors[0]).toContain('InvalidType');
    });

    it('should return error for content exceeding max length', () => {
      const oversizeContent = 'a'.repeat(NOTE_MAX_CONTENT_LENGTH + 1);
      const note = createTestNote({ content: oversizeContent });
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('exceeds maximum length');
      expect(errors[0]).toContain(NOTE_MAX_CONTENT_LENGTH.toString());
    });

    it('should return error for non-string content', () => {
      const note = createTestNote();
      // @ts-expect-error - Testing invalid input
      note.content = 123;
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Note content must be a string');
    });

    it('should return error for missing created_at', () => {
      const note = createTestNote();
      // @ts-expect-error - Testing invalid input
      note.created_at = undefined;
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('created_at');
    });

    it('should return error for invalid created_at date', () => {
      const note = createTestNote({ created_at: new Date('invalid') });
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('created_at is an invalid Date');
    });

    it('should return error for non-Date created_at', () => {
      const note = createTestNote();
      // @ts-expect-error - Testing invalid input
      note.created_at = '2026-01-01';
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('created_at');
    });

    it('should return error for missing updated_at', () => {
      const note = createTestNote();
      // @ts-expect-error - Testing invalid input
      note.updated_at = undefined;
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('updated_at');
    });

    it('should return error for invalid updated_at date', () => {
      const note = createTestNote({ updated_at: new Date('invalid') });
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('updated_at is an invalid Date');
    });

    it('should return error for non-Date updated_at', () => {
      const note = createTestNote();
      // @ts-expect-error - Testing invalid input
      note.updated_at = '2026-01-01';
      const errors = validateNote(note);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('updated_at');
    });

    it('should return multiple errors for multiple invalid fields', () => {
      const note = createTestNote();
      note.id = '';
      // @ts-expect-error - Testing invalid input
      note.type = 'bad';
      const errors = validateNote(note);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('Type safety (compile-time)', () => {
    it('should allow valid Note assignment', () => {
      const note: Note = {
        id: 'NOTE-20260101-test-01-01',
        type: 'General',
        content: 'Test content',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(note.type).toBe('General');
    });

    it('should enforce NoteType for type field', () => {
      // This test verifies at runtime what TypeScript enforces at compile time
      const note: Note = createTestNote({ type: 'Bug Fix Attempt' });
      expect(isNoteType(note.type)).toBe(true);
    });
  });
});

// ============================================================================
// convertLegacyNotes Tests
// ============================================================================

describe('convertLegacyNotes', () => {
  it('should return empty array for empty string', () => {
    const notes = convertLegacyNotes('', 'REQ-20260101-test-01', 'test');
    expect(notes).toEqual([]);
  });

  it('should return empty array for undefined', () => {
    const notes = convertLegacyNotes(undefined, 'REQ-20260101-test-01', 'test');
    expect(notes).toEqual([]);
  });

  it('should return empty array for whitespace-only string', () => {
    const notes = convertLegacyNotes('   \n\t  ', 'REQ-20260101-test-01', 'test');
    expect(notes).toEqual([]);
  });

  it('should convert string to single General note', () => {
    const notes = convertLegacyNotes('Legacy content here', 'REQ-20260101-test-01', 'test');

    expect(notes).toHaveLength(1);
    const note = notes[0]!;
    expect(note.type).toBe('General');
    expect(note.content).toBe('Legacy content here');
    expect(note.created_at).toBeInstanceOf(Date);
    expect(note.updated_at).toBeInstanceOf(Date);
  });

  it('should generate correct note ID format', () => {
    const notes = convertLegacyNotes('Content', 'REQ-20260101-myproject-05', 'myproject');

    expect(notes).toHaveLength(1);
    // ID should include project slug and item number
    expect(notes[0]!.id).toMatch(/^NOTE-\d{8}-myproject-05-01$/);
  });

  it('should trim content whitespace', () => {
    const notes = convertLegacyNotes('  Trimmed content  ', 'REQ-20260101-test-01', 'test');

    expect(notes).toHaveLength(1);
    expect(notes[0]!.content).toBe('Trimmed content');
  });

  it('should preserve markdown in content', () => {
    const markdownContent = `# Heading
**Bold** and *italic*
- List item`;

    const notes = convertLegacyNotes(markdownContent, 'REQ-20260101-test-01', 'test');

    expect(notes).toHaveLength(1);
    expect(notes[0]!.content).toBe(markdownContent);
  });

  it('should set created_at and updated_at to same value', () => {
    const notes = convertLegacyNotes('Content', 'REQ-20260101-test-01', 'test');

    expect(notes).toHaveLength(1);
    const note = notes[0]!;
    expect(note.created_at.getTime()).toBe(note.updated_at.getTime());
  });

  it('should create valid Note that passes isNote check', () => {
    const notes = convertLegacyNotes('Valid content', 'REQ-20260101-test-01', 'test');

    expect(notes).toHaveLength(1);
    expect(isNote(notes[0]!)).toBe(true);
  });

  it('should handle different item numbers correctly', () => {
    const notes01 = convertLegacyNotes('Content 1', 'REQ-20260101-proj-01', 'proj');
    const notes15 = convertLegacyNotes('Content 15', 'REQ-20260101-proj-15', 'proj');
    const notes99 = convertLegacyNotes('Content 99', 'REQ-20260101-proj-99', 'proj');

    expect(notes01[0]!.id).toContain('-01-01');
    expect(notes15[0]!.id).toContain('-15-01');
    expect(notes99[0]!.id).toContain('-99-01');
  });

  it('should default to -01 for invalid item IDs', () => {
    const notes = convertLegacyNotes('Content', 'INVALID-ID', 'test');

    expect(notes).toHaveLength(1);
    expect(notes[0]!.id).toContain('-01');
  });
});
