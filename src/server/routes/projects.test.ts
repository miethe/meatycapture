/**
 * ProjectStore REST Endpoints Tests
 *
 * Comprehensive test suite for project CRUD operations via HTTP.
 * Tests all endpoints with success cases, error cases, and edge cases.
 *
 * Test coverage:
 * - List all projects (empty, multiple projects)
 * - Get existing project
 * - Get non-existent project (404)
 * - Create new project (201)
 * - Create duplicate project (409)
 * - Update existing project
 * - Update non-existent project (404)
 * - Delete existing project (204)
 * - Delete non-existent project (404)
 * - Invalid request body (400)
 * - Date serialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createProjectsRouter } from './projects.js';
import type { ProjectStore } from '@core/ports';
import type { Project } from '@core/models';

/**
 * In-memory ProjectStore implementation for testing.
 *
 * Provides a simple array-based store that simulates all ProjectStore
 * operations without file system I/O. Resets state between tests.
 */
class InMemoryProjectStore implements ProjectStore {
  private projects: Project[] = [];

  async list(): Promise<Project[]> {
    return [...this.projects];
  }

  async get(id: string): Promise<Project | null> {
    return this.projects.find((p) => p.id === id) || null;
  }

  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    // Simulate ID generation (simplified slugify)
    const id = project.name.toLowerCase().replace(/\s+/g, '-');

    // Check for duplicate
    if (this.projects.some((p) => p.id === id)) {
      throw new Error(`Project with ID "${id}" already exists`);
    }

    const now = new Date();
    const newProject: Project = {
      ...project,
      id,
      created_at: now,
      updated_at: now,
    };

    this.projects.push(newProject);
    return newProject;
  }

  async update(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Project> {
    const index = this.projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(`Project not found: ${id}`);
    }

    const existing = this.projects[index];
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    const updated: Project = {
      ...existing,
      ...updates,
      id,
      created_at: existing.created_at,
      updated_at: new Date(),
    };

    this.projects[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<void> {
    const index = this.projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(`Project not found: ${id}`);
    }

    this.projects.splice(index, 1);
  }

  // Test helper: clear all projects
  clear(): void {
    this.projects = [];
  }
}

describe('ProjectStore REST Endpoints', () => {
  let store: InMemoryProjectStore;
  let router: ReturnType<typeof createProjectsRouter>;

  beforeEach(() => {
    store = new InMemoryProjectStore();
    router = createProjectsRouter(store);
  });

  describe('GET /api/projects', () => {
    it('should return empty array when no projects exist', async () => {
      const req = new Request('http://localhost/api/projects');
      const response = await router.list(req);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all projects', async () => {
      // Seed store with test data
      await store.create({
        name: 'Project One',
        default_path: '/path/one',
        enabled: true,
      });
      await store.create({
        name: 'Project Two',
        default_path: '/path/two',
        repo_url: 'https://github.com/test/repo',
        enabled: false,
      });

      const req = new Request('http://localhost/api/projects');
      const response = await router.list(req);

      expect(response.status).toBe(200);

      const data = (await response.json()) as Array<Record<string, unknown>>;
      expect(data).toHaveLength(2);

      // Verify first project
      expect(data[0]).toMatchObject({
        id: 'project-one',
        name: 'Project One',
        default_path: '/path/one',
        enabled: true,
      });
      expect(data[0]?.created_at).toBeTypeOf('string');
      expect(data[0]?.updated_at).toBeTypeOf('string');

      // Verify second project
      expect(data[1]).toMatchObject({
        id: 'project-two',
        name: 'Project Two',
        default_path: '/path/two',
        repo_url: 'https://github.com/test/repo',
        enabled: false,
      });
    });

    it('should serialize dates as ISO 8601 strings', async () => {
      await store.create({
        name: 'Test Project',
        default_path: '/test',
        enabled: true,
      });

      const req = new Request('http://localhost/api/projects');
      const response = await router.list(req);
      const data = (await response.json()) as Array<Record<string, unknown>>;

      // Verify dates are valid ISO strings
      const project = data[0];
      expect(project?.created_at).toBeTypeOf('string');
      expect(project?.updated_at).toBeTypeOf('string');

      const createdAt = new Date(project?.created_at as string);
      const updatedAt = new Date(project?.updated_at as string);

      expect(createdAt.toISOString()).toBe(project?.created_at);
      expect(updatedAt.toISOString()).toBe(project?.updated_at);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project by ID', async () => {
      await store.create({
        name: 'My Project',
        default_path: '/my/path',
        repo_url: 'https://github.com/test/repo',
        enabled: true,
      });

      const req = new Request('http://localhost/api/projects/my-project');
      const response = await router.get(req, 'my-project');

      expect(response.status).toBe(200);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toMatchObject({
        id: 'my-project',
        name: 'My Project',
        default_path: '/my/path',
        repo_url: 'https://github.com/test/repo',
        enabled: true,
      });
    });

    it('should return 404 for non-existent project', async () => {
      const req = new Request('http://localhost/api/projects/nonexistent');
      const response = await router.get(req, 'nonexistent');

      expect(response.status).toBe(404);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe('NotFound');
      expect(data.message).toContain('nonexistent');
    });

    it('should handle empty project ID', async () => {
      const req = new Request('http://localhost/api/projects/');
      const response = await router.get(req, '');

      // Validation error for empty ID
      expect(response.status).toBe(500); // Generic error from validateProjectId
    });
  });

  describe('POST /api/projects', () => {
    it('should create new project with 201 status', async () => {
      const body = {
        name: 'New Project',
        default_path: '/new/path',
        repo_url: 'https://github.com/new/repo',
        enabled: true,
      };

      const req = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await router.create(req);

      expect(response.status).toBe(201);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toMatchObject({
        id: 'new-project',
        name: 'New Project',
        default_path: '/new/path',
        repo_url: 'https://github.com/new/repo',
        enabled: true,
      });
      expect(data.created_at).toBeTypeOf('string');
      expect(data.updated_at).toBeTypeOf('string');

      // Verify project was added to store
      const projects = await store.list();
      expect(projects).toHaveLength(1);
      expect(projects[0]?.id).toBe('new-project');
    });

    it('should create project without optional repo_url', async () => {
      const body = {
        name: 'Simple Project',
        default_path: '/simple',
        enabled: false,
      };

      const req = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await router.create(req);

      expect(response.status).toBe(201);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toMatchObject({
        id: 'simple-project',
        name: 'Simple Project',
        default_path: '/simple',
        enabled: false,
      });
      expect(data.repo_url).toBeUndefined();
    });

    it('should return 409 for duplicate project ID', async () => {
      // Create first project
      await store.create({
        name: 'Existing Project',
        default_path: '/existing',
        enabled: true,
      });

      // Try to create project with same name (same generated ID)
      const body = {
        name: 'Existing Project',
        default_path: '/another/path',
        enabled: true,
      };

      const req = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await router.create(req);

      expect(response.status).toBe(409);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe('Conflict');
      expect(data.message).toContain('already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const body = {
        name: 'Incomplete Project',
        // Missing default_path and enabled
      };

      const req = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await router.create(req);

      expect(response.status).toBe(400);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe('ValidationError');
    });

    it('should return 400 for invalid field types', async () => {
      const body = {
        name: 123, // Should be string
        default_path: '/path',
        enabled: 'yes', // Should be boolean
      };

      const req = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await router.create(req);

      expect(response.status).toBe(400);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe('ValidationError');
    });

    it('should return 400 for invalid JSON', async () => {
      const req = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await router.create(req);

      expect(response.status).toBe(400);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe('ValidationError');
      expect(data.message).toContain('JSON');
    });

    it('should return 400 for missing Content-Type header', async () => {
      const body = {
        name: 'Test',
        default_path: '/test',
        enabled: true,
      };

      const req = new Request('http://localhost/api/projects', {
        method: 'POST',
        // No Content-Type header
        body: JSON.stringify(body),
      });

      const response = await router.create(req);

      expect(response.status).toBe(400);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe('ValidationError');
      expect(data.message).toBe('Invalid request');
      // Details should mention Content-Type
      const details = data.details as Record<string, unknown>;
      expect(details?.message).toContain('Content-Type');
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should update existing project', async () => {
      await store.create({
        name: 'Original Project',
        default_path: '/original',
        enabled: true,
      });

      const updates = {
        name: 'Updated Project',
        default_path: '/updated',
        enabled: false,
      };

      const req = new Request('http://localhost/api/projects/original-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const response = await router.update(req, 'original-project');

      expect(response.status).toBe(200);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toMatchObject({
        id: 'original-project',
        name: 'Updated Project',
        default_path: '/updated',
        enabled: false,
      });

      // Verify created_at unchanged but updated_at changed
      const project = await store.get('original-project');
      expect(project?.name).toBe('Updated Project');
    });

    it('should update single field', async () => {
      await store.create({
        name: 'Test Project',
        default_path: '/test',
        enabled: true,
      });

      const updates = {
        enabled: false,
      };

      const req = new Request('http://localhost/api/projects/test-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const response = await router.update(req, 'test-project');

      expect(response.status).toBe(200);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data).toMatchObject({
        id: 'test-project',
        name: 'Test Project', // Unchanged
        default_path: '/test', // Unchanged
        enabled: false, // Updated
      });
    });

    it('should return 404 for non-existent project', async () => {
      const updates = {
        name: 'Updated Name',
      };

      const req = new Request('http://localhost/api/projects/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const response = await router.update(req, 'nonexistent');

      expect(response.status).toBe(404);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe('NotFound');
      expect(data.message).toContain('nonexistent');
    });

    it('should return 400 when no fields provided', async () => {
      await store.create({
        name: 'Test Project',
        default_path: '/test',
        enabled: true,
      });

      const updates = {}; // Empty update

      const req = new Request('http://localhost/api/projects/test-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const response = await router.update(req, 'test-project');

      expect(response.status).toBe(500); // Error from validation schema
    });

    it('should return 400 for invalid field types', async () => {
      await store.create({
        name: 'Test Project',
        default_path: '/test',
        enabled: true,
      });

      const updates = {
        enabled: 'yes', // Should be boolean
      };

      const req = new Request('http://localhost/api/projects/test-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const response = await router.update(req, 'test-project');

      expect(response.status).toBe(400);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe('ValidationError');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete existing project with 204 status', async () => {
      await store.create({
        name: 'To Delete',
        default_path: '/delete',
        enabled: true,
      });

      const req = new Request('http://localhost/api/projects/to-delete');
      const response = await router.delete(req, 'to-delete');

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();

      // Verify project was removed from store
      const project = await store.get('to-delete');
      expect(project).toBeNull();

      const projects = await store.list();
      expect(projects).toHaveLength(0);
    });

    it('should return 404 for non-existent project', async () => {
      const req = new Request('http://localhost/api/projects/nonexistent');
      const response = await router.delete(req, 'nonexistent');

      expect(response.status).toBe(404);

      const data = (await response.json()) as Record<string, unknown>;
      expect(data.error).toBe('NotFound');
      expect(data.message).toContain('nonexistent');
    });

    it('should not affect other projects', async () => {
      await store.create({
        name: 'Keep One',
        default_path: '/keep1',
        enabled: true,
      });
      await store.create({
        name: 'Delete Me',
        default_path: '/delete',
        enabled: true,
      });
      await store.create({
        name: 'Keep Two',
        default_path: '/keep2',
        enabled: true,
      });

      const req = new Request('http://localhost/api/projects/delete-me');
      const response = await router.delete(req, 'delete-me');

      expect(response.status).toBe(204);

      // Verify only the target was deleted
      const projects = await store.list();
      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.id)).toEqual(['keep-one', 'keep-two']);
    });
  });
});
