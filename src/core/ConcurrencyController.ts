import { Semaphore } from 'semaphore';
import { logger } from '@/utils/logger';
import { config } from '@/config';

/**
 * 并发控制器
 * 管理请求并发数量，防止对目标网站造成过大压力
 */
export class ConcurrencyController {
  private readonly semaphore: Semaphore;
  private readonly requestQueue: Array<() => void> = [];
  private readonly requestTimes: number[] = [];
  private readonly maxConcurrentRequests: number;
  private readonly requestsPerSecond: number;
  private readonly requestDelay: number;

  constructor(
    maxConcurrentRequests: number = 1,
    requestsPerSecond: number = 2,
    requestDelay: number = 1000
  ) {
    this.maxConcurrentRequests = maxConcurrentRequests;
    this.requestsPerSecond = requestsPerSecond;
    this.requestDelay = requestDelay;
    
    // 创建信号量来控制并发
    this.semaphore = new Semaphore(maxConcurrentRequests);
    
    logger.info('ConcurrencyController initialized', {
      maxConcurrentRequests,
      requestsPerSecond,
      requestDelay
    });
  }

  /**
   * 执行请求，自动管理并发和速率限制
   */
  async executeRequest<T>(
    requestFn: () => Promise<T>,
    requestId?: string
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // 等待信号量
      await this.waitForSemaphore();
      
      // 检查速率限制
      await this.checkRateLimit();
      
      // 执行请求
      const result = await requestFn();
      
      // 记录请求时间
      this.recordRequestTime();
      
      logger.debug('Request executed successfully', {
        requestId,
        duration: Date.now() - startTime,
        concurrentRequests: this.getCurrentConcurrency()
      });
      
      return result;
    } catch (error) {
      logger.error('Request execution failed', error as Error, {
        requestId,
        duration: Date.now() - startTime
      });
      throw error;
    } finally {
      // 释放信号量
      this.releaseSemaphore();
    }
  }

  /**
   * 等待信号量
   */
  private async waitForSemaphore(): Promise<void> {
    return new Promise((resolve) => {
      this.semaphore.take(() => {
        resolve();
      });
    });
  }

  /**
   * 释放信号量
   */
  private releaseSemaphore(): void {
    this.semaphore.leave();
  }

  /**
   * 检查速率限制
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // 清理过期的请求时间记录
    this.requestTimes = this.requestTimes.filter(time => time > oneSecondAgo);
    
    // 检查是否超过每秒请求限制
    if (this.requestTimes.length >= this.requestsPerSecond) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = 1000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        logger.debug('Rate limit reached, waiting', {
          waitTime,
          currentRequests: this.requestTimes.length,
          maxRequestsPerSecond: this.requestsPerSecond
        });
        
        await this.delay(waitTime);
      }
    }
    
    // 添加延迟
    if (this.requestDelay > 0) {
      await this.delay(this.requestDelay);
    }
  }

  /**
   * 记录请求时间
   */
  private recordRequestTime(): void {
    this.requestTimes.push(Date.now());
  }

  /**
   * 获取当前并发数
   */
  private getCurrentConcurrency(): number {
    return this.maxConcurrentRequests - this.semaphore.available();
  }

  /**
   * 延迟执行
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    maxConcurrentRequests: number;
    currentConcurrency: number;
    requestsPerSecond: number;
    requestDelay: number;
    recentRequests: number;
  } {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const recentRequests = this.requestTimes.filter(time => time > oneSecondAgo).length;
    
    return {
      maxConcurrentRequests: this.maxConcurrentRequests,
      currentConcurrency: this.getCurrentConcurrency(),
      requestsPerSecond: this.requestsPerSecond,
      requestDelay: this.requestDelay,
      recentRequests
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.requestTimes.length = 0;
    logger.info('ConcurrencyController stats reset');
  }

  /**
   * 更新配置
   */
  updateConfig(
    maxConcurrentRequests?: number,
    requestsPerSecond?: number,
    requestDelay?: number
  ): void {
    if (maxConcurrentRequests !== undefined) {
      // 注意：Semaphore不支持动态调整，需要重新创建
      logger.warn('Cannot dynamically update maxConcurrentRequests, restart required');
    }
    
    if (requestsPerSecond !== undefined) {
      (this as any).requestsPerSecond = requestsPerSecond;
    }
    
    if (requestDelay !== undefined) {
      (this as any).requestDelay = requestDelay;
    }
    
    logger.info('ConcurrencyController config updated', {
      maxConcurrentRequests: this.maxConcurrentRequests,
      requestsPerSecond: this.requestsPerSecond,
      requestDelay: this.requestDelay
    });
  }
}

/**
 * 全局并发控制器实例
 */
export const concurrencyController = new ConcurrencyController(
  config.get('antiCrawling').maxConcurrentRequests,
  config.get('antiCrawling').requestsPerSecond,
  config.get('antiCrawling').requestDelay
);
