import { createClient, RedisClientType } from 'redis';
import { LRUCache } from 'lru-cache';
import { BaseService } from '@/core/BaseService';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { CacheError, ErrorFactory } from '@/types/errors';
import { CryptoHelper } from '@/utils/crypto';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

/**
 * 双重缓存服务
 * 实现内存缓存 + Redis缓存 + 本地文件缓存的组合策略
 */
export class CacheService extends BaseService {
  private redisClient: RedisClientType | null = null;
  private memoryCache: LRUCache<string, any>;
  private readonly cacheConfig: any;
  private readonly localCacheDir: string;
  private isRedisConnected: boolean = false;

  constructor() {
    super('CacheService');
    this.cacheConfig = config.get('cache');
    this.localCacheDir = config.get('localCache')?.baseDir || './guji-cache';
    
    // 初始化内存缓存
    this.memoryCache = new LRUCache({
      max: this.cacheConfig.memory.maxSize,
      ttl: this.cacheConfig.memory.ttl * 1000, // 转换为毫秒
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    this.initializeRedis();
    this.initializeLocalCache();
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: config.get('redis').url
      });

      this.redisClient.on('error', (error) => {
        logger.error('Redis connection error', error);
        this.isRedisConnected = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isRedisConnected = true;
      });

      this.redisClient.on('disconnect', () => {
        logger.warn('Redis disconnected');
        this.isRedisConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis', error as Error);
      this.isRedisConnected = false;
    }
  }

  /**
   * 初始化本地缓存目录
   */
  private async initializeLocalCache(): Promise<void> {
    try {
      if (!existsSync(this.localCacheDir)) {
        await mkdir(this.localCacheDir, { recursive: true });
        logger.info('Local cache directory created', { path: this.localCacheDir });
      }
    } catch (error) {
      logger.error('Failed to initialize local cache directory', error as Error);
    }
  }

  /**
   * 获取缓存值
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      // 1. 先检查内存缓存
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== undefined) {
        logger.logCacheHit(key, 'memory');
        return memoryValue as T;
      }

      // 2. 检查Redis缓存
      if (this.isRedisConnected && this.redisClient) {
        try {
          const redisValue = await this.redisClient.get(key);
          if (redisValue) {
            const parsedValue = JSON.parse(redisValue);
            // 回写到内存缓存
            this.memoryCache.set(key, parsedValue);
            logger.logCacheHit(key, 'redis');
            return parsedValue as T;
          }
        } catch (error) {
          logger.warn('Redis get operation failed', { key, error: (error as Error).message });
        }
      }

      // 3. 检查本地文件缓存
      const localValue = await this.getFromLocalCache<T>(key);
      if (localValue !== null) {
        // 回写到内存缓存
        this.memoryCache.set(key, localValue);
        logger.logCacheHit(key, 'file');
        return localValue;
      }

      logger.logCacheMiss(key, 'all');
      return null;
    } catch (error) {
      logger.error('Cache get operation failed', error as Error, { key });
      throw ErrorFactory.createCacheError('get', key, 'Failed to get cache value');
    }
  }

  /**
   * 设置缓存值
   */
  async set<T = any>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<void> {
    try {
      // 1. 设置内存缓存
      this.memoryCache.set(key, value);

      // 2. 设置Redis缓存
      if (this.isRedisConnected && this.redisClient) {
        try {
          const redisTtl = ttl || this.cacheConfig.redis.ttl;
          await this.redisClient.setEx(key, redisTtl, JSON.stringify(value));
        } catch (error) {
          logger.warn('Redis set operation failed', { key, error: (error as Error).message });
        }
      }

      // 3. 设置本地文件缓存
      await this.setToLocalCache(key, value, ttl);

      logger.debug('Cache value set successfully', { key, ttl });
    } catch (error) {
      logger.error('Cache set operation failed', error as Error, { key });
      throw ErrorFactory.createCacheError('set', key, 'Failed to set cache value');
    }
  }

  /**
   * 删除缓存值
   */
  async delete(key: string): Promise<void> {
    try {
      // 1. 删除内存缓存
      this.memoryCache.delete(key);

      // 2. 删除Redis缓存
      if (this.isRedisConnected && this.redisClient) {
        try {
          await this.redisClient.del(key);
        } catch (error) {
          logger.warn('Redis delete operation failed', { key, error: (error as Error).message });
        }
      }

      // 3. 删除本地文件缓存
      await this.deleteFromLocalCache(key);

      logger.debug('Cache value deleted successfully', { key });
    } catch (error) {
      logger.error('Cache delete operation failed', error as Error, { key });
      throw ErrorFactory.createCacheError('delete', key, 'Failed to delete cache value');
    }
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      // 检查内存缓存
      if (this.memoryCache.has(key)) {
        return true;
      }

      // 检查Redis缓存
      if (this.isRedisConnected && this.redisClient) {
        try {
          const exists = await this.redisClient.exists(key);
          if (exists) {
            return true;
          }
        } catch (error) {
          logger.warn('Redis exists operation failed', { key, error: (error as Error).message });
        }
      }

      // 检查本地文件缓存
      return await this.hasLocalCache(key);
    } catch (error) {
      logger.error('Cache has operation failed', error as Error, { key });
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      // 清空内存缓存
      this.memoryCache.clear();

      // 清空Redis缓存
      if (this.isRedisConnected && this.redisClient) {
        try {
          await this.redisClient.flushAll();
        } catch (error) {
          logger.warn('Redis clear operation failed', { error: (error as Error).message });
        }
      }

      // 清空本地文件缓存
      await this.clearLocalCache();

      logger.info('All caches cleared successfully');
    } catch (error) {
      logger.error('Cache clear operation failed', error as Error);
      throw ErrorFactory.createCacheError('clear', 'all', 'Failed to clear cache');
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    memory: {
      size: number;
      maxSize: number;
      hitRate: number;
    };
    redis: {
      connected: boolean;
      hitRate: number;
    };
    local: {
      enabled: boolean;
      directory: string;
    };
  } {
    return {
      memory: {
        size: this.memoryCache.size,
        maxSize: this.memoryCache.max,
        hitRate: this.memoryCache.calculatedSize || 0
      },
      redis: {
        connected: this.isRedisConnected,
        hitRate: 0 // Redis没有内置的命中率统计
      },
      local: {
        enabled: true,
        directory: this.localCacheDir
      }
    };
  }

  /**
   * 从本地文件缓存获取值
   */
  private async getFromLocalCache<T = any>(key: string): Promise<T | null> {
    try {
      const filePath = this.getLocalCachePath(key);
      const stats = await stat(filePath);
      
      // 检查文件是否过期
      const now = Date.now();
      const fileAge = now - stats.mtime.getTime();
      const ttl = this.cacheConfig.memory.ttl * 1000;
      
      if (fileAge > ttl) {
        await this.deleteFromLocalCache(key);
        return null;
      }
      
      const content = await readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * 设置本地文件缓存
   */
  private async setToLocalCache<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const filePath = this.getLocalCachePath(key);
      const dir = dirname(filePath);
      
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      
      await writeFile(filePath, JSON.stringify(value, null, 2));
    } catch (error) {
      logger.warn('Failed to set local cache', { key, error: (error as Error).message });
    }
  }

  /**
   * 删除本地文件缓存
   */
  private async deleteFromLocalCache(key: string): Promise<void> {
    try {
      const filePath = this.getLocalCachePath(key);
      if (existsSync(filePath)) {
        await import('fs/promises').then(fs => fs.unlink(filePath));
      }
    } catch (error) {
      logger.warn('Failed to delete local cache', { key, error: (error as Error).message });
    }
  }

  /**
   * 检查本地文件缓存是否存在
   */
  private async hasLocalCache(key: string): Promise<boolean> {
    try {
      const filePath = this.getLocalCachePath(key);
      const stats = await stat(filePath);
      
      // 检查文件是否过期
      const now = Date.now();
      const fileAge = now - stats.mtime.getTime();
      const ttl = this.cacheConfig.memory.ttl * 1000;
      
      if (fileAge > ttl) {
        await this.deleteFromLocalCache(key);
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清空本地文件缓存
   */
  private async clearLocalCache(): Promise<void> {
    try {
      const { rm } = await import('fs/promises');
      if (existsSync(this.localCacheDir)) {
        await rm(this.localCacheDir, { recursive: true, force: true });
        await mkdir(this.localCacheDir, { recursive: true });
      }
    } catch (error) {
      logger.warn('Failed to clear local cache', { error: (error as Error).message });
    }
  }

  /**
   * 获取本地缓存文件路径
   */
  private getLocalCachePath(key: string): string {
    const hash = CryptoHelper.sha256(key);
    const subDir = hash.substring(0, 2);
    const fileName = hash.substring(2) + '.json';
    return join(this.localCacheDir, subDir, fileName);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      const stats = this.getStats();
      
      if (!this.isRedisConnected) {
        return {
          status: 'degraded',
          message: 'Redis not connected, using memory and file cache only',
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        status: 'healthy',
        message: 'Cache service is running normally',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.recordError(error as Error, { operation: 'healthCheck' });
      return {
        status: 'unhealthy',
        message: 'Cache service is not responding',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        this.isRedisConnected = false;
      }
      
      this.memoryCache.clear();
      
      logger.info('CacheService cleanup completed');
    } catch (error) {
      logger.error('CacheService cleanup failed', error as Error);
    }
  }
}

/**
 * 全局缓存服务实例
 */
export const cacheService = new CacheService();
