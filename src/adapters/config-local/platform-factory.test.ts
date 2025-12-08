/**
 * Platform Factory Tests for Config Stores
 *
 * Tests the platform-aware factory functions that select the correct
 * ProjectStore and FieldCatalogStore implementations based on runtime
 * environment detection.
 *
 * Coverage:
 * - API mode: Returns API stores when MEATYCAPTURE_API_URL is set
 * - Local mode: Returns Tauri stores in Tauri environment
 * - Browser mode: Returns Browser stores in browser environment
 * - Mode detection is properly delegated to detectAdapterMode()
 * - Both ProjectStore and FieldCatalogStore factories tested
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProjectStore, createFieldCatalogStore } from './platform-factory.js';
import * as platformModule from '@platform';
import type { AdapterMode } from '@platform';

// Mock all dependencies
vi.mock('@platform', () => ({
  detectAdapterMode: vi.fn(),
}));

vi.mock('@adapters/api-client', () => ({
  HttpClient: vi.fn(() => ({
    baseUrl: 'http://localhost:3737',
  })),
  ApiProjectStore: vi.fn(function (client) {
    // @ts-expect-error - Mock constructor
    this.client = client;
    // @ts-expect-error - Mock type marker
    this._type = 'ApiProjectStore';
  }),
  ApiFieldCatalogStore: vi.fn(function (client) {
    // @ts-expect-error - Mock constructor
    this.client = client;
    // @ts-expect-error - Mock type marker
    this._type = 'ApiFieldCatalogStore';
  }),
}));

vi.mock('./tauri-config-adapter', () => ({
  createTauriProjectStore: vi.fn(() => ({
    _type: 'TauriProjectStore',
  })),
  createTauriFieldCatalogStore: vi.fn(() => ({
    _type: 'TauriFieldCatalogStore',
  })),
}));

vi.mock('@adapters/browser-storage', () => ({
  createBrowserProjectStore: vi.fn(() => ({
    _type: 'BrowserProjectStore',
  })),
  createBrowserFieldCatalogStore: vi.fn(() => ({
    _type: 'BrowserFieldCatalogStore',
  })),
}));

describe('createProjectStore() platform factory', () => {
  const mockDetectAdapterMode = vi.mocked(platformModule.detectAdapterMode);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return ApiProjectStore when mode is "api"', () => {
    mockDetectAdapterMode.mockReturnValue('api');

    const store = createProjectStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('ApiProjectStore');
  });

  it('should return TauriProjectStore when mode is "local"', () => {
    mockDetectAdapterMode.mockReturnValue('local');

    const store = createProjectStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('TauriProjectStore');
  });

  it('should return BrowserProjectStore when mode is "browser"', () => {
    mockDetectAdapterMode.mockReturnValue('browser');

    const store = createProjectStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('BrowserProjectStore');
  });

  it('should default to BrowserProjectStore for unknown modes', () => {
    mockDetectAdapterMode.mockReturnValue('unknown' as AdapterMode);

    const store = createProjectStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('BrowserProjectStore');
  });

  it('should create new HttpClient for API mode without explicit config', async () => {
    mockDetectAdapterMode.mockReturnValue('api');

    const { HttpClient } = await import('@adapters/api-client');
    const mockHttpClient = vi.mocked(HttpClient);

    createProjectStore();

    // HttpClient should be constructed without arguments (auto-detects from env)
    expect(mockHttpClient).toHaveBeenCalledOnce();
    expect(mockHttpClient).toHaveBeenCalledWith();
  });
});

describe('createFieldCatalogStore() platform factory', () => {
  const mockDetectAdapterMode = vi.mocked(platformModule.detectAdapterMode);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return ApiFieldCatalogStore when mode is "api"', () => {
    mockDetectAdapterMode.mockReturnValue('api');

    const store = createFieldCatalogStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('ApiFieldCatalogStore');
  });

  it('should return TauriFieldCatalogStore when mode is "local"', () => {
    mockDetectAdapterMode.mockReturnValue('local');

    const store = createFieldCatalogStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('TauriFieldCatalogStore');
  });

  it('should return BrowserFieldCatalogStore when mode is "browser"', () => {
    mockDetectAdapterMode.mockReturnValue('browser');

    const store = createFieldCatalogStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('BrowserFieldCatalogStore');
  });

  it('should default to BrowserFieldCatalogStore for unknown modes', () => {
    mockDetectAdapterMode.mockReturnValue('unknown' as AdapterMode);

    const store = createFieldCatalogStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('BrowserFieldCatalogStore');
  });

  it('should create new HttpClient for API mode without explicit config', async () => {
    mockDetectAdapterMode.mockReturnValue('api');

    const { HttpClient } = await import('@adapters/api-client');
    const mockHttpClient = vi.mocked(HttpClient);

    createFieldCatalogStore();

    // HttpClient should be constructed without arguments (auto-detects from env)
    expect(mockHttpClient).toHaveBeenCalledOnce();
    expect(mockHttpClient).toHaveBeenCalledWith();
  });

  it('should call detectAdapterMode exactly once per invocation', () => {
    mockDetectAdapterMode.mockReturnValue('browser');

    createFieldCatalogStore();
    expect(mockDetectAdapterMode).toHaveBeenCalledTimes(1);

    createFieldCatalogStore();
    expect(mockDetectAdapterMode).toHaveBeenCalledTimes(2);

    createFieldCatalogStore();
    expect(mockDetectAdapterMode).toHaveBeenCalledTimes(3);
  });
});

describe('Both factories together', () => {
  const mockDetectAdapterMode = vi.mocked(platformModule.detectAdapterMode);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should both use API stores when in API mode', () => {
    mockDetectAdapterMode.mockReturnValue('api');

    const projectStore = createProjectStore();
    const fieldStore = createFieldCatalogStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledTimes(2);
    // @ts-expect-error - Checking mock type marker
    expect(projectStore._type).toBe('ApiProjectStore');
    // @ts-expect-error - Checking mock type marker
    expect(fieldStore._type).toBe('ApiFieldCatalogStore');
  });

  it('should both use Tauri stores when in local mode', () => {
    mockDetectAdapterMode.mockReturnValue('local');

    const projectStore = createProjectStore();
    const fieldStore = createFieldCatalogStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledTimes(2);
    // @ts-expect-error - Checking mock type marker
    expect(projectStore._type).toBe('TauriProjectStore');
    // @ts-expect-error - Checking mock type marker
    expect(fieldStore._type).toBe('TauriFieldCatalogStore');
  });

  it('should both use Browser stores when in browser mode', () => {
    mockDetectAdapterMode.mockReturnValue('browser');

    const projectStore = createProjectStore();
    const fieldStore = createFieldCatalogStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledTimes(2);
    // @ts-expect-error - Checking mock type marker
    expect(projectStore._type).toBe('BrowserProjectStore');
    // @ts-expect-error - Checking mock type marker
    expect(fieldStore._type).toBe('BrowserFieldCatalogStore');
  });
});
