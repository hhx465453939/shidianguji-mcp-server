import { CacheService } from '@/services/CacheService';
import { config } from '@/config';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  afterEach(async () => {
    await cacheService.cleanup();
  });

  describe('get and set', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = { test: 'data' };

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      const testCases = [
        { key: 'string', value: 'test string' },
        { key: 'number', value: 123 },
        { key: 'boolean', value: true },
        { key: 'array', value: [1, 2, 3] },
        { key: 'object', value: { nested: { data: 'value' } } }
      ];

      for (const testCase of testCases) {
        await cacheService.set(testCase.key, testCase.value);
        const result = await cacheService.get(testCase.key);
        expect(result).toEqual(testCase.value);
      }
    });
  });

  describe('has', () => {
    it('should return true for existing keys', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cacheService.set(key, value);
      const exists = await cacheService.has(key);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      const exists = await cacheService.has('non-existent-key');
      expect(exists).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await cacheService.set(key, value);
      await cacheService.delete(key);
      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('should handle deletion of non-existent keys gracefully', async () => {
      await expect(cacheService.delete('non-existent-key')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cached values', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', 'value3'];

      for (let i = 0; i < keys.length; i++) {
        await cacheService.set(keys[i], values[i]);
      }

      await cacheService.clear();

      for (const key of keys) {
        const result = await cacheService.get(key);
        expect(result).toBeNull();
      }
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = cacheService.getStats();

      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('redis');
      expect(stats).toHaveProperty('local');
      expect(stats.memory).toHaveProperty('size');
      expect(stats.memory).toHaveProperty('maxSize');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await cacheService.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('message');
      expect(health).toHaveProperty('timestamp');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });
});
