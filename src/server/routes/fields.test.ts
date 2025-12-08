/**
 * FieldCatalogStore Routes Test Suite
 *
 * Tests all field catalog REST endpoints with comprehensive coverage:
 * - GET /api/fields/global (get global options)
 * - GET /api/fields/project/:id (get project options merged with global)
 * - GET /api/fields/by-field/:field (get options by field name)
 * - POST /api/fields (add new option)
 * - DELETE /api/fields/:id (remove option)
 *
 * Test coverage:
 * - Success cases with correct status codes and payloads
 * - Validation errors (invalid field names, missing required fields)
 * - Not found errors (non-existent options)
 * - Conflict errors (duplicate options)
 * - Query parameter handling
 * - Date serialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFieldsRouter, routeFieldsRequest } from './fields.js';
import type { FieldCatalogStore } from '@core/ports';
import type { FieldOption, FieldName } from '@core/models';

/**
 * In-memory implementation of FieldCatalogStore for testing.
 * Provides predictable behavior without file system dependencies.
 */
class MockFieldCatalogStore implements FieldCatalogStore {
  private globalOptions: FieldOption[] = [];
  private projectOptions: Map<string, FieldOption[]> = new Map();

  /**
   * Seeds the store with initial test data.
   */
  seed(global: FieldOption[], projects: Record<string, FieldOption[]>): void {
    this.globalOptions = [...global];
    this.projectOptions = new Map(Object.entries(projects));
  }

  /**
   * Resets the store to empty state.
   */
  reset(): void {
    this.globalOptions = [];
    this.projectOptions.clear();
  }

  async getGlobal(): Promise<FieldOption[]> {
    return [...this.globalOptions];
  }

  async getForProject(projectId: string): Promise<FieldOption[]> {
    const projectOpts = this.projectOptions.get(projectId) || [];
    return [...this.globalOptions, ...projectOpts];
  }

  async getByField(field: FieldName, projectId?: string): Promise<FieldOption[]> {
    if (projectId) {
      const allOptions = await this.getForProject(projectId);
      return allOptions.filter((opt) => opt.field === field);
    }
    return this.globalOptions.filter((opt) => opt.field === field);
  }

  async addOption(option: Omit<FieldOption, 'id' | 'created_at'>): Promise<FieldOption> {
    // Validate project_id requirements
    if (option.scope === 'project' && !option.project_id) {
      throw new Error('project_id is required for project-scoped options');
    }

    // Create new option with generated fields
    const newOption: FieldOption = {
      ...option,
      id: `${option.field}-${option.value}-${Date.now()}`,
      created_at: new Date(),
    };

    // Check for duplicates and add to appropriate scope
    if (option.scope === 'global') {
      const duplicate = this.globalOptions.find(
        (opt) => opt.field === option.field && opt.value === option.value
      );
      if (duplicate) {
        throw new Error(`Global option already exists for ${option.field}: ${option.value}`);
      }
      this.globalOptions.push(newOption);
    } else if (option.scope === 'project' && option.project_id) {
      const projectOpts = this.projectOptions.get(option.project_id) || [];
      const duplicate = projectOpts.find(
        (opt) => opt.field === option.field && opt.value === option.value
      );
      if (duplicate) {
        throw new Error(`Project option already exists for ${option.field}: ${option.value}`);
      }
      projectOpts.push(newOption);
      this.projectOptions.set(option.project_id, projectOpts);
    }

    return newOption;
  }

  async removeOption(id: string): Promise<void> {
    // Try to remove from global options
    const globalIndex = this.globalOptions.findIndex((opt) => opt.id === id);
    if (globalIndex !== -1) {
      this.globalOptions.splice(globalIndex, 1);
      return;
    }

    // Try to remove from project options
    for (const [projectId, projectOpts] of this.projectOptions.entries()) {
      const projectIndex = projectOpts.findIndex((opt) => opt.id === id);
      if (projectIndex !== -1) {
        projectOpts.splice(projectIndex, 1);
        this.projectOptions.set(projectId, projectOpts);
        return;
      }
    }

    throw new Error(`Field option not found: ${id}`);
  }
}

/**
 * Creates a test field option with sensible defaults.
 */
function createTestOption(
  overrides: Partial<FieldOption> = {}
): FieldOption {
  return {
    id: 'test-option-123',
    field: 'type',
    value: 'enhancement',
    scope: 'global',
    created_at: new Date('2025-12-08T12:00:00Z'),
    ...overrides,
  };
}

describe('FieldCatalogStore Routes', () => {
  let store: MockFieldCatalogStore;
  let router: ReturnType<typeof createFieldsRouter>;

  beforeEach(() => {
    store = new MockFieldCatalogStore();
    router = createFieldsRouter(store);
  });

  describe('GET /api/fields/global', () => {
    it('should return all global field options', async () => {
      // Seed store with test data
      const globalOptions: FieldOption[] = [
        createTestOption({ id: 'type-enhancement-1', field: 'type', value: 'enhancement' }),
        createTestOption({ id: 'type-bug-2', field: 'type', value: 'bug' }),
        createTestOption({ id: 'priority-high-3', field: 'priority', value: 'high' }),
      ];
      store.seed(globalOptions, {});

      const res = await router.getGlobal();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(3);
      expect(body[0].id).toBe('type-enhancement-1');
      expect(body[1].id).toBe('type-bug-2');
      expect(body[2].id).toBe('priority-high-3');
    });

    it('should return empty array when no global options exist', async () => {
      store.seed([], {});

      const res = await router.getGlobal();

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });

    it('should serialize dates to ISO 8601 strings', async () => {
      const testDate = new Date('2025-12-08T12:00:00Z');
      const globalOptions = [
        createTestOption({ id: 'test-1', created_at: testDate }),
      ];
      store.seed(globalOptions, {});

      const res = await router.getGlobal();

      const body = await res.json();
      expect(body[0].created_at).toBe('2025-12-08T12:00:00.000Z');
      expect(typeof body[0].created_at).toBe('string');
    });
  });

  describe('GET /api/fields/project/:id', () => {
    it('should return merged global and project options', async () => {
      const globalOptions = [
        createTestOption({ id: 'global-1', field: 'type', value: 'enhancement' }),
        createTestOption({ id: 'global-2', field: 'type', value: 'bug' }),
      ];
      const projectOptions = {
        'my-project': [
          createTestOption({
            id: 'project-1',
            field: 'type',
            value: 'spike',
            scope: 'project',
            project_id: 'my-project',
          }),
        ],
      };
      store.seed(globalOptions, projectOptions);

      const res = await router.getForProject('my-project');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(3);

      // Should include both global and project-specific options
      const ids = body.map((opt: FieldOption) => opt.id);
      expect(ids).toContain('global-1');
      expect(ids).toContain('global-2');
      expect(ids).toContain('project-1');
    });

    it('should return only global options for project with no specific options', async () => {
      const globalOptions = [
        createTestOption({ id: 'global-1', field: 'type', value: 'enhancement' }),
      ];
      store.seed(globalOptions, {});

      const res = await router.getForProject('empty-project');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe('global-1');
    });

    it('should return 400 for missing project ID', async () => {
      const res = await router.getForProject('');

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    });
  });

  describe('GET /api/fields/by-field/:field', () => {
    it('should return global options for a specific field', async () => {
      const globalOptions = [
        createTestOption({ id: 'type-1', field: 'type', value: 'enhancement' }),
        createTestOption({ id: 'type-2', field: 'type', value: 'bug' }),
        createTestOption({ id: 'priority-1', field: 'priority', value: 'high' }),
      ];
      store.seed(globalOptions, {});

      const req = new Request('http://localhost/api/fields/by-field/type');
      const res = await router.getByField(req, 'type');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
      expect(body[0].field).toBe('type');
      expect(body[1].field).toBe('type');
    });

    it('should filter by project when project_id query param is provided', async () => {
      const globalOptions = [
        createTestOption({ id: 'global-type-1', field: 'type', value: 'enhancement' }),
      ];
      const projectOptions = {
        'my-project': [
          createTestOption({
            id: 'project-type-1',
            field: 'type',
            value: 'spike',
            scope: 'project',
            project_id: 'my-project',
          }),
        ],
      };
      store.seed(globalOptions, projectOptions);

      const req = new Request('http://localhost/api/fields/by-field/type?project_id=my-project');
      const res = await router.getByField(req, 'type');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2); // Global + project-specific
      const ids = body.map((opt: FieldOption) => opt.id);
      expect(ids).toContain('global-type-1');
      expect(ids).toContain('project-type-1');
    });

    it('should return 400 for invalid field name', async () => {
      const req = new Request('http://localhost/api/fields/by-field/invalid-field');
      const res = await router.getByField(req, 'invalid-field');

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
      expect(body.message).toContain('Validation failed');
    });

    it('should return empty array for field with no options', async () => {
      store.seed([], {});

      const req = new Request('http://localhost/api/fields/by-field/tags');
      const res = await router.getByField(req, 'tags');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(0);
    });
  });

  describe('POST /api/fields', () => {
    it('should create a global field option', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'type',
          value: 'spike',
          scope: 'global',
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.field).toBe('type');
      expect(body.value).toBe('spike');
      expect(body.scope).toBe('global');
      expect(body.id).toBeDefined();
      expect(body.created_at).toBeDefined();
      expect(typeof body.created_at).toBe('string');
    });

    it('should create a project-scoped field option', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'priority',
          value: 'urgent',
          scope: 'project',
          project_id: 'my-project',
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.field).toBe('priority');
      expect(body.value).toBe('urgent');
      expect(body.scope).toBe('project');
      expect(body.project_id).toBe('my-project');
    });

    it('should return 400 when project_id is missing for project scope', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'type',
          value: 'spike',
          scope: 'project',
          // Missing project_id
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    });

    it('should return 400 when project_id is provided for global scope', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'type',
          value: 'spike',
          scope: 'global',
          project_id: 'my-project', // Should not be provided for global
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    });

    it('should return 400 for invalid field name', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'invalid-field',
          value: 'test',
          scope: 'global',
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    });

    it('should return 400 for invalid scope', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'type',
          value: 'spike',
          scope: 'invalid-scope',
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    });

    it('should return 409 for duplicate global option', async () => {
      const existingOption = createTestOption({
        id: 'existing-1',
        field: 'type',
        value: 'enhancement',
        scope: 'global',
      });
      store.seed([existingOption], {});

      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'type',
          value: 'enhancement',
          scope: 'global',
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('Conflict');
      expect(body.message).toContain('already exists');
    });

    it('should return 409 for duplicate project option', async () => {
      const projectOptions = {
        'my-project': [
          createTestOption({
            id: 'existing-1',
            field: 'type',
            value: 'spike',
            scope: 'project',
            project_id: 'my-project',
          }),
        ],
      };
      store.seed([], projectOptions);

      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'type',
          value: 'spike',
          scope: 'project',
          project_id: 'my-project',
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('Conflict');
    });

    it('should return 400 for missing required fields', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'type',
          // Missing value and scope
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    });

    it('should return 400 for invalid JSON', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    });

    it('should return 400 for missing Content-Type header', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        body: JSON.stringify({
          field: 'type',
          value: 'spike',
          scope: 'global',
        }),
      });

      const res = await router.addOption(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    });
  });

  describe('DELETE /api/fields/:id', () => {
    it('should delete an existing global field option', async () => {
      const globalOption = createTestOption({
        id: 'to-delete-1',
        field: 'type',
        value: 'spike',
      });
      store.seed([globalOption], {});

      const res = await router.removeOption('to-delete-1');

      expect(res.status).toBe(204);
      expect(res.body).toBeNull();

      // Verify option was removed
      const remaining = await store.getGlobal();
      expect(remaining).toHaveLength(0);
    });

    it('should delete an existing project field option', async () => {
      const projectOptions = {
        'my-project': [
          createTestOption({
            id: 'to-delete-2',
            field: 'type',
            value: 'spike',
            scope: 'project',
            project_id: 'my-project',
          }),
        ],
      };
      store.seed([], projectOptions);

      const res = await router.removeOption('to-delete-2');

      expect(res.status).toBe(204);

      // Verify option was removed
      const remaining = await store.getForProject('my-project');
      expect(remaining).toHaveLength(0);
    });

    it('should return 404 for non-existent option', async () => {
      store.seed([], {});

      const res = await router.removeOption('non-existent-id');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('NotFound');
      expect(body.message).toContain('not found');
    });

    it('should return 400 for empty ID', async () => {
      const res = await router.removeOption('');

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('ValidationError');
    });
  });

  describe('routeFieldsRequest() - Request routing', () => {
    it('should route GET /api/fields/global correctly', async () => {
      store.seed([], {});
      const req = new Request('http://localhost/api/fields/global');
      const res = await routeFieldsRequest(req, store);

      expect(res.status).toBe(200);
    });

    it('should route GET /api/fields/project/:id correctly', async () => {
      store.seed([], {});
      const req = new Request('http://localhost/api/fields/project/test-project');
      const res = await routeFieldsRequest(req, store);

      expect(res.status).toBe(200);
    });

    it('should route GET /api/fields/by-field/:field correctly', async () => {
      store.seed([], {});
      const req = new Request('http://localhost/api/fields/by-field/type');
      const res = await routeFieldsRequest(req, store);

      expect(res.status).toBe(200);
    });

    it('should route POST /api/fields correctly', async () => {
      const req = new Request('http://localhost/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'type',
          value: 'spike',
          scope: 'global',
        }),
      });
      const res = await routeFieldsRequest(req, store);

      expect(res.status).toBe(201);
    });

    it('should route DELETE /api/fields/:id correctly', async () => {
      const option = createTestOption({ id: 'test-id' });
      store.seed([option], {});

      const req = new Request('http://localhost/api/fields/test-id', {
        method: 'DELETE',
      });
      const res = await routeFieldsRequest(req, store);

      expect(res.status).toBe(204);
    });

    it('should return 404 for unmatched routes', async () => {
      const req = new Request('http://localhost/api/fields/invalid/route');
      const res = await routeFieldsRequest(req, store);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Not Found');
    });

    it('should return 404 for wrong HTTP method', async () => {
      const req = new Request('http://localhost/api/fields/global', {
        method: 'POST', // Wrong method for this endpoint
      });
      const res = await routeFieldsRequest(req, store);

      expect(res.status).toBe(404);
    });
  });
});
