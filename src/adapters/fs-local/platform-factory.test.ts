/**
 * Platform Factory Tests for DocStore
 *
 * Tests the platform-aware factory function that selects the correct
 * DocStore implementation based on runtime environment detection.
 *
 * Coverage:
 * - API mode: Returns ApiDocStore when MEATYCAPTURE_API_URL is set
 * - Local mode: Returns TauriDocStore in Tauri environment
 * - Browser mode: Returns BrowserDocStore in browser environment
 * - Mode detection is properly delegated to detectAdapterMode()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDocStore } from './platform-factory.js';
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
  ApiDocStore: vi.fn(function (client) {
    // @ts-expect-error - Mock constructor
    this.client = client;
    // @ts-expect-error - Mock type marker
    this._type = 'ApiDocStore';
  }),
}));

vi.mock('./tauri-fs-adapter', () => ({
  createTauriDocStore: vi.fn(() => ({
    _type: 'TauriDocStore',
  })),
}));

vi.mock('@adapters/browser-storage', () => ({
  createBrowserDocStore: vi.fn(() => ({
    _type: 'BrowserDocStore',
  })),
}));

describe('createDocStore() platform factory', () => {
  const mockDetectAdapterMode = vi.mocked(platformModule.detectAdapterMode);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return ApiDocStore when mode is "api"', () => {
    mockDetectAdapterMode.mockReturnValue('api');

    const store = createDocStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('ApiDocStore');
  });

  it('should return TauriDocStore when mode is "local"', () => {
    mockDetectAdapterMode.mockReturnValue('local');

    const store = createDocStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('TauriDocStore');
  });

  it('should return BrowserDocStore when mode is "browser"', () => {
    mockDetectAdapterMode.mockReturnValue('browser');

    const store = createDocStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('BrowserDocStore');
  });

  it('should default to BrowserDocStore for unknown modes', () => {
    mockDetectAdapterMode.mockReturnValue('unknown' as AdapterMode);

    const store = createDocStore();

    expect(mockDetectAdapterMode).toHaveBeenCalledOnce();
    expect(store).toBeDefined();
    // @ts-expect-error - Checking mock type marker
    expect(store._type).toBe('BrowserDocStore');
  });

  it('should call detectAdapterMode exactly once per invocation', () => {
    mockDetectAdapterMode.mockReturnValue('browser');

    createDocStore();
    expect(mockDetectAdapterMode).toHaveBeenCalledTimes(1);

    createDocStore();
    expect(mockDetectAdapterMode).toHaveBeenCalledTimes(2);

    createDocStore();
    expect(mockDetectAdapterMode).toHaveBeenCalledTimes(3);
  });

  it('should create new HttpClient for API mode without explicit config', async () => {
    mockDetectAdapterMode.mockReturnValue('api');

    const { HttpClient } = await import('@adapters/api-client');
    const mockHttpClient = vi.mocked(HttpClient);

    createDocStore();

    // HttpClient should be constructed without arguments (auto-detects from env)
    expect(mockHttpClient).toHaveBeenCalledOnce();
    expect(mockHttpClient).toHaveBeenCalledWith();
  });
});
