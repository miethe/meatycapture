/**
 * Tests for ApiProjectStore and ApiFieldCatalogStore
 *
 * Integration tests with mocked HttpClient to verify:
 * - Correct HTTP endpoints are called
 * - Proper error handling (404 → null for get)
 * - Date deserialization works (delegated to HttpClient)
 * - Type safety is preserved
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiProjectStore, ApiFieldCatalogStore } from './api-config-stores';
import type { HttpClient } from './http-client';
import { NotFoundError, ValidationError, ConflictError } from './types';
import type { Project, FieldOption } from '@core/models';

describe('ApiProjectStore', () => {
  let mockClient: HttpClient;
  let store: ApiProjectStore;

  beforeEach(() => {
    // Create a mock HttpClient with typed methods
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      head: vi.fn(),
    } as unknown as HttpClient;

    store = new ApiProjectStore(mockClient);
  });

  describe('list()', () => {
    it('should fetch all projects from /api/projects', async () => {
      const mockProjects: Project[] = [
        {
          id: 'project-1',
          name: 'Project 1',
          default_path: '/path/1',
          enabled: true,
          created_at: new Date('2025-01-01T00:00:00Z'),
          updated_at: new Date('2025-01-01T00:00:00Z'),
        },
        {
          id: 'project-2',
          name: 'Project 2',
          default_path: '/path/2',
          repo_url: 'https://github.com/user/repo',
          enabled: false,
          created_at: new Date('2025-01-02T00:00:00Z'),
          updated_at: new Date('2025-01-02T00:00:00Z'),
        },
      ];

      vi.mocked(mockClient.get).mockResolvedValue(mockProjects);

      const result = await store.list();

      expect(mockClient.get).toHaveBeenCalledWith('/api/projects');
      expect(result).toEqual(mockProjects);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no projects exist', async () => {
      vi.mocked(mockClient.get).mockResolvedValue([]);

      const result = await store.list();

      expect(result).toEqual([]);
    });
  });

  describe('get()', () => {
    it('should fetch a single project by ID', async () => {
      const mockProject: Project = {
        id: 'meatycapture',
        name: 'MeatyCapture',
        default_path: '/path/to/docs',
        enabled: true,
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-01-01T00:00:00Z'),
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockProject);

      const result = await store.get('meatycapture');

      expect(mockClient.get).toHaveBeenCalledWith('/api/projects/meatycapture');
      expect(result).toEqual(mockProject);
    });

    it('should return null when project not found (404)', async () => {
      vi.mocked(mockClient.get).mockRejectedValue(new NotFoundError('Project not found'));

      const result = await store.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should propagate non-404 errors', async () => {
      vi.mocked(mockClient.get).mockRejectedValue(new ValidationError('Invalid ID'));

      await expect(store.get('invalid-id')).rejects.toThrow(ValidationError);
    });
  });

  describe('create()', () => {
    it('should create a new project via POST /api/projects', async () => {
      const input = {
        name: 'New Project',
        default_path: '/path/to/new',
        repo_url: 'https://github.com/user/new',
        enabled: true,
      };

      const mockResponse: Project = {
        id: 'new-project',
        ...input,
        created_at: new Date('2025-12-08T10:00:00Z'),
        updated_at: new Date('2025-12-08T10:00:00Z'),
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await store.create(input);

      expect(mockClient.post).toHaveBeenCalledWith('/api/projects', undefined, input);
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe('new-project');
    });

    it('should throw ConflictError if project ID already exists', async () => {
      const input = {
        name: 'Duplicate',
        default_path: '/path',
        enabled: true,
      };

      vi.mocked(mockClient.post).mockRejectedValue(
        new ConflictError('Project with ID "duplicate" already exists')
      );

      await expect(store.create(input)).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for invalid data', async () => {
      const input = {
        name: '',
        default_path: '/path',
        enabled: true,
      };

      vi.mocked(mockClient.post).mockRejectedValue(
        new ValidationError('Project name is required')
      );

      await expect(store.create(input)).rejects.toThrow(ValidationError);
    });
  });

  describe('update()', () => {
    it('should update a project via PATCH /api/projects/:id', async () => {
      const updates = {
        name: 'Updated Name',
        enabled: false,
      };

      const mockResponse: Project = {
        id: 'my-project',
        name: 'Updated Name',
        default_path: '/path',
        enabled: false,
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-12-08T10:00:00Z'),
      };

      vi.mocked(mockClient.patch).mockResolvedValue(mockResponse);

      const result = await store.update('my-project', updates);

      expect(mockClient.patch).toHaveBeenCalledWith('/api/projects/my-project', undefined, updates);
      expect(result).toEqual(mockResponse);
      expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
    });

    it('should throw NotFoundError if project does not exist', async () => {
      vi.mocked(mockClient.patch).mockRejectedValue(
        new NotFoundError('Project not found: nonexistent')
      );

      await expect(store.update('nonexistent', { enabled: false })).rejects.toThrow(NotFoundError);
    });

    it('should handle partial updates', async () => {
      const updates = { enabled: false };

      const mockResponse: Project = {
        id: 'my-project',
        name: 'Original Name',
        default_path: '/path',
        enabled: false,
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-12-08T10:00:00Z'),
      };

      vi.mocked(mockClient.patch).mockResolvedValue(mockResponse);

      const result = await store.update('my-project', updates);

      expect(result.enabled).toBe(false);
      expect(result.name).toBe('Original Name'); // unchanged
    });
  });

  describe('delete()', () => {
    it('should delete a project via DELETE /api/projects/:id', async () => {
      vi.mocked(mockClient.delete).mockResolvedValue(null);

      await store.delete('old-project');

      expect(mockClient.delete).toHaveBeenCalledWith('/api/projects/old-project');
    });

    it('should throw NotFoundError if project does not exist', async () => {
      vi.mocked(mockClient.delete).mockRejectedValue(
        new NotFoundError('Project not found: nonexistent')
      );

      await expect(store.delete('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});

describe('ApiFieldCatalogStore', () => {
  let mockClient: HttpClient;
  let store: ApiFieldCatalogStore;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      head: vi.fn(),
    } as unknown as HttpClient;

    store = new ApiFieldCatalogStore(mockClient);
  });

  describe('getGlobal()', () => {
    it('should fetch global field options from /api/fields/global', async () => {
      const mockOptions: FieldOption[] = [
        {
          id: 'opt-1',
          field: 'type',
          value: 'enhancement',
          scope: 'global',
          created_at: new Date('2025-01-01T00:00:00Z'),
        },
        {
          id: 'opt-2',
          field: 'priority',
          value: 'high',
          scope: 'global',
          created_at: new Date('2025-01-01T00:00:00Z'),
        },
      ];

      vi.mocked(mockClient.get).mockResolvedValue(mockOptions);

      const result = await store.getGlobal();

      expect(mockClient.get).toHaveBeenCalledWith('/api/fields/global');
      expect(result).toEqual(mockOptions);
      expect(result.every(opt => opt.scope === 'global')).toBe(true);
    });

    it('should return empty array when no global options exist', async () => {
      vi.mocked(mockClient.get).mockResolvedValue([]);

      const result = await store.getGlobal();

      expect(result).toEqual([]);
    });
  });

  describe('getForProject()', () => {
    it('should fetch effective options for a project (global + project)', async () => {
      const mockOptions: FieldOption[] = [
        {
          id: 'opt-1',
          field: 'type',
          value: 'enhancement',
          scope: 'global',
          created_at: new Date('2025-01-01T00:00:00Z'),
        },
        {
          id: 'opt-2',
          field: 'priority',
          value: 'urgent',
          scope: 'project',
          project_id: 'my-project',
          created_at: new Date('2025-01-02T00:00:00Z'),
        },
      ];

      vi.mocked(mockClient.get).mockResolvedValue(mockOptions);

      const result = await store.getForProject('my-project');

      expect(mockClient.get).toHaveBeenCalledWith('/api/fields/project/my-project');
      expect(result).toEqual(mockOptions);
      expect(result).toHaveLength(2);
    });
  });

  describe('getByField()', () => {
    it('should fetch options for a specific field without project filter', async () => {
      const mockOptions: FieldOption[] = [
        {
          id: 'opt-1',
          field: 'type',
          value: 'enhancement',
          scope: 'global',
          created_at: new Date('2025-01-01T00:00:00Z'),
        },
        {
          id: 'opt-2',
          field: 'type',
          value: 'bug',
          scope: 'global',
          created_at: new Date('2025-01-01T00:00:00Z'),
        },
      ];

      vi.mocked(mockClient.get).mockResolvedValue(mockOptions);

      const result = await store.getByField('type');

      expect(mockClient.get).toHaveBeenCalledWith('/api/fields/by-field/type', undefined);
      expect(result).toEqual(mockOptions);
      expect(result.every(opt => opt.field === 'type')).toBe(true);
    });

    it('should fetch options for a specific field with project filter', async () => {
      const mockOptions: FieldOption[] = [
        {
          id: 'opt-1',
          field: 'priority',
          value: 'high',
          scope: 'global',
          created_at: new Date('2025-01-01T00:00:00Z'),
        },
        {
          id: 'opt-2',
          field: 'priority',
          value: 'urgent',
          scope: 'project',
          project_id: 'my-project',
          created_at: new Date('2025-01-02T00:00:00Z'),
        },
      ];

      vi.mocked(mockClient.get).mockResolvedValue(mockOptions);

      const result = await store.getByField('priority', 'my-project');

      expect(mockClient.get).toHaveBeenCalledWith('/api/fields/by-field/priority', {
        project_id: 'my-project',
      });
      expect(result).toEqual(mockOptions);
    });

    it('should handle all field types', async () => {
      const fields: Array<'type' | 'domain' | 'context' | 'priority' | 'status' | 'tags'> = [
        'type',
        'domain',
        'context',
        'priority',
        'status',
        'tags',
      ];

      for (const field of fields) {
        vi.mocked(mockClient.get).mockResolvedValue([]);
        await store.getByField(field);
        expect(mockClient.get).toHaveBeenCalledWith(`/api/fields/by-field/${field}`, undefined);
      }
    });
  });

  describe('addOption()', () => {
    it('should add a global field option via POST /api/fields', async () => {
      const input = {
        field: 'type' as const,
        value: 'spike',
        scope: 'global' as const,
      };

      const mockResponse: FieldOption = {
        id: 'type-spike-1701619200000',
        ...input,
        created_at: new Date('2025-12-08T10:00:00Z'),
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await store.addOption(input);

      expect(mockClient.post).toHaveBeenCalledWith('/api/fields', undefined, input);
      expect(result).toEqual(mockResponse);
      expect(result.id).toBeTruthy();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should add a project-scoped field option', async () => {
      const input = {
        field: 'priority' as const,
        value: 'urgent',
        scope: 'project' as const,
        project_id: 'my-project',
      };

      const mockResponse: FieldOption = {
        id: 'priority-urgent-1701619200000',
        ...input,
        created_at: new Date('2025-12-08T10:00:00Z'),
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const result = await store.addOption(input);

      expect(mockClient.post).toHaveBeenCalledWith('/api/fields', undefined, input);
      expect(result).toEqual(mockResponse);
      expect(result.scope).toBe('project');
      expect(result.project_id).toBe('my-project');
    });

    it('should throw ConflictError if option already exists', async () => {
      const input = {
        field: 'type' as const,
        value: 'enhancement',
        scope: 'global' as const,
      };

      vi.mocked(mockClient.post).mockRejectedValue(
        new ConflictError('Option already exists: type=enhancement')
      );

      await expect(store.addOption(input)).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for invalid data', async () => {
      const input = {
        field: 'type' as const,
        value: '',
        scope: 'global' as const,
      };

      vi.mocked(mockClient.post).mockRejectedValue(
        new ValidationError('Option value is required')
      );

      await expect(store.addOption(input)).rejects.toThrow(ValidationError);
    });
  });

  describe('removeOption()', () => {
    it('should remove a field option via DELETE /api/fields/:id', async () => {
      vi.mocked(mockClient.delete).mockResolvedValue(null);

      await store.removeOption('type-spike-1701619200000');

      expect(mockClient.delete).toHaveBeenCalledWith('/api/fields/type-spike-1701619200000');
    });

    it('should throw NotFoundError if option does not exist', async () => {
      vi.mocked(mockClient.delete).mockRejectedValue(
        new NotFoundError('Field option not found: nonexistent')
      );

      await expect(store.removeOption('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });
});
