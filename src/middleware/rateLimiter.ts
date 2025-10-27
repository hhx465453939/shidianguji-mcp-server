import { Request, Response, NextFunction } from 'express';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { ErrorFactory } from '@/types/errors';

/**
 * 简单的内存速率限制器
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // 获取或创建请求记录
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier)!;
    
    // 清理过期的请求记录
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(identifier, validRequests);
    
    // 检查是否超过限制
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // 记录当前请求
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      return this.maxRequests;
    }
    
    const userRequests = this.requests.get(identifier)!;
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// 创建全局速率限制器实例
const rateLimiter = new RateLimiter(
  config.get('api')?.rateLimit || 1000,
  config.get('api')?.rateLimit || 1000
);

// 定期清理过期记录
setInterval(() => {
  rateLimiter.cleanup();
}, 60000); // 每分钟清理一次

/**
 * 速率限制中间件
 */
export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  const identifier = req.ip || 'unknown';
  
  if (!rateLimiter.isAllowed(identifier)) {
    const remainingRequests = rateLimiter.getRemainingRequests(identifier);
    
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: {
        type: 'RATE_LIMIT_EXCEEDED',
        code: 'TOO_MANY_REQUESTS',
        message: '请求过于频繁，请稍后重试',
        retryAfter: 60
      },
      metadata: {
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    return;
  }
  
  // 设置速率限制头
  const remainingRequests = rateLimiter.getRemainingRequests(identifier);
  res.setHeader('X-RateLimit-Limit', rateLimiter['maxRequests']);
  res.setHeader('X-RateLimit-Remaining', remainingRequests);
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiter['windowMs']).toISOString());
  
  next();
}
