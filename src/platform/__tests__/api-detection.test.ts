import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as apiDetection from '../api-detection';

const {
  detectAdapterMode,
  pingApiHealth,
  clearDetectionCache,
  getCachedMode,
  isTauriEnvironment,
} = apiDetection;

describe('API Detection Module', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    Object.keys(process.env).forEach(key => {
      delete process.env[key];
    });
    Object.assign(process.env, ORIGINAL_ENV);
    // Clear detection cache
    clearDetectionCache();
    // Reset mocks
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    Object.keys(process.env).forEach(key => {
      delete process.env[key];
    });
    Object.assign(process.env, ORIGINAL_ENV);
    vi.restoreAllMocks();
  });

  describe('isTauriEnvironment', () => {
    it('should return false when window is undefined', () => {
      // In Node.js test environment, window is undefined
      expect(isTauriEnvironment()).toBe(false);
    });
  });

  describe('detectAdapterMode', () => {
    describe('API mode detection', () => {
      it('should detect api mode when MEATYCAPTURE_API_URL is set', () => {
        process.env.MEATYCAPTURE_API_URL = 'http://localhost:3737';

        const mode = detectAdapterMode();

        expect(mode).toBe('api');
        expect(getCachedMode()).toBe('api');
      });

      it('should detect api mode with HTTPS URL', () => {
        process.env.MEATYCAPTURE_API_URL = 'https://api.example.com';

        const mode = detectAdapterMode();

        expect(mode).toBe('api');
      });

      it('should reject invalid URL format and fall back', () => {
        process.env.MEATYCAPTURE_API_URL = 'not-a-valid-url';

        const mode = detectAdapterMode();

        expect(mode).toBe('browser'); // Falls back to browser (no Tauri in test env)
      });

      it('should reject non-HTTP protocols', () => {
        process.env.MEATYCAPTURE_API_URL = 'ftp://localhost:3737';

        const mode = detectAdapterMode();

        expect(mode).toBe('browser'); // Falls back to browser
      });
    });

    describe('Browser mode detection', () => {
      it('should detect browser mode when no API URL and not Tauri', () => {
        delete process.env.MEATYCAPTURE_API_URL;

        const mode = detectAdapterMode();

        // In test environment, isTauriEnvironment returns false, so browser mode
        expect(mode).toBe('browser');
        expect(getCachedMode()).toBe('browser');
      });
    });

    describe('Caching behavior', () => {
      it('should cache detection result after first call', () => {
        process.env.MEATYCAPTURE_API_URL = 'http://localhost:3737';

        const mode1 = detectAdapterMode();
        expect(mode1).toBe('api');

        // Change environment (should not affect cached result)
        delete process.env.MEATYCAPTURE_API_URL;

        const mode2 = detectAdapterMode();
        expect(mode2).toBe('api'); // Still cached as 'api'
      });

      it('should re-detect when skipCache option is true', () => {
        process.env.MEATYCAPTURE_API_URL = 'http://localhost:3737';

        const mode1 = detectAdapterMode();
        expect(mode1).toBe('api');

        // Change environment
        delete process.env.MEATYCAPTURE_API_URL;

        const mode2 = detectAdapterMode({ skipCache: true });
        expect(mode2).toBe('browser'); // Re-detected as browser (no Tauri in test)
      });

      it('should re-detect after cache is cleared', () => {
        process.env.MEATYCAPTURE_API_URL = 'http://localhost:3737';

        const mode1 = detectAdapterMode();
        expect(mode1).toBe('api');

        // Clear cache and change environment
        clearDetectionCache();
        delete process.env.MEATYCAPTURE_API_URL;

        const mode2 = detectAdapterMode();
        expect(mode2).toBe('browser'); // Re-detected as browser
      });

      it('should return null from getCachedMode before first detection', () => {
        expect(getCachedMode()).toBeNull();
      });
    });

    describe('API mode priority', () => {
      it('should prioritize API mode over other modes when URL is set', () => {
        // Even without Tauri, API mode takes priority
        process.env.MEATYCAPTURE_API_URL = 'http://localhost:3737';

        const mode = detectAdapterMode();

        expect(mode).toBe('api');
      });
    });
  });

  describe('pingApiHealth', () => {
    beforeEach(() => {
      // Mock fetch globally
      global.fetch = vi.fn();
    });

    it('should return true when health endpoint responds with 200 OK', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', timestamp: new Date().toISOString() }),
      } as unknown as Response;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await pingApiHealth('http://localhost:3737');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3737/health',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should return true when health endpoint responds with 200 but non-JSON body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Not JSON');
        },
      } as unknown as Response;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await pingApiHealth('http://localhost:3737');

      expect(result).toBe(true); // Accept 200 OK even without JSON
    });

    it('should return false when health endpoint responds with error status', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => ({ status: 'error' }),
      } as unknown as Response;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await pingApiHealth('http://localhost:3737');

      expect(result).toBe(false);
    });

    it('should return false when health check returns non-ok status', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ status: 'error', message: 'Server unhealthy' }),
      } as unknown as Response;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await pingApiHealth('http://localhost:3737');

      expect(result).toBe(false);
    });

    it('should return false when network request fails', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const result = await pingApiHealth('http://localhost:3737');

      expect(result).toBe(false);
    });

    it('should return false when request times out', async () => {
      vi.mocked(global.fetch).mockImplementation(() => {
        return new Promise((_, reject) => {
          const error = new Error('Timeout');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 10);
        });
      });

      const result = await pingApiHealth('http://localhost:3737');

      expect(result).toBe(false);
    });
  });

  describe('Type exports', () => {
    it('should export AdapterMode type with correct values', () => {
      const validModes: apiDetection.AdapterMode[] = ['api', 'local', 'browser'];

      validModes.forEach(mode => {
        expect(['api', 'local', 'browser']).toContain(mode);
      });
    });
  });
});
