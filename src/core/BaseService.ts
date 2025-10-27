import { Logger } from '@/utils/logger';
import { config } from '@/config';
import { GujiError, ErrorFactory } from '@/types/errors';

/**
 * 基础服务类
 * 提供所有服务的通用功能，包括错误处理、重试机制、日志记录等
 */
export abstract class BaseService {
  protected readonly logger: Logger;
  protected readonly config: any;
  protected readonly name: string;

  constructor(
    name: string,
    serviceConfig?: any,
    logger?: Logger
  ) {
    this.name = name;
    this.config = serviceConfig || config.getAll();
    this.logger = logger || new Logger(name);
  }

  /**
   * 执行带重试的操作
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          this.logger.error(`Operation failed after ${maxRetries} attempts`, {
            service: this.name,
            error: lastError.message,
            attempts: maxRetries
          });
          throw lastError;
        }
        
        // 检查是否应该重试
        if (!this.shouldRetry(error as Error, attempt)) {
          this.logger.warn(`Retry condition not met`, {
            service: this.name,
            error: lastError.message,
            attempt
          });
          throw lastError;
        }
        
        this.logger.warn(`Operation attempt ${attempt} failed, retrying...`, {
          service: this.name,
          error: lastError.message,
          nextAttemptIn: delay * attempt
        });
        
        await this.delay(delay * attempt);
      }
    }
    
    throw lastError!;
  }

  /**
   * 判断是否应该重试
   */
  protected shouldRetry(error: Error, attempt: number): boolean {
    // 网络错误可以重试
    if (error.message.includes('ECONNRESET') || 
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')) {
      return true;
    }
    
    // 搜索错误可以重试
    if (error.message.includes('Search failed') || 
        error.message.includes('search error')) {
      return attempt <= 2; // 搜索错误最多重试2次
    }
    
    // 提取错误可以重试
    if (error.message.includes('Extraction failed') || 
        error.message.includes('extraction error')) {
      return attempt <= 3; // 提取错误最多重试3次
    }
    
    // 验证错误不重试
    if (error.message.includes('Validation failed') || 
        error.message.includes('validation error')) {
      return false;
    }
    
    // 默认重试条件
    return attempt <= 2;
  }

  /**
   * 延迟执行
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 执行带超时的操作
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number = 30000
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * 记录性能指标
   */
  protected recordPerformance(operation: string, duration: number, meta: Record<string, unknown> = {}): void {
    this.logger.logPerformance(operation, duration, {
      service: this.name,
      ...meta
    });
  }

  /**
   * 记录错误
   */
  protected recordError(error: Error, context: Record<string, unknown> = {}): void {
    this.logger.logError(error, {
      service: this.name,
      ...context
    });
  }

  /**
   * 记录成功操作
   */
  protected recordSuccess(operation: string, meta: Record<string, unknown> = {}): void {
    this.logger.info(`Operation completed successfully`, {
      service: this.name,
      operation,
      ...meta
    });
  }

  /**
   * 验证参数
   */
  protected validateParams<T>(params: T, validator: (params: T) => boolean, errorMessage: string): void {
    if (!validator(params)) {
      throw ErrorFactory.createValidationError('params', errorMessage);
    }
  }

  /**
   * 检查服务健康状态
   */
  public async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      // 子类可以重写此方法来实现具体的健康检查
      return {
        status: 'healthy',
        message: `${this.name} service is running`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.recordError(error as Error, { operation: 'healthCheck' });
      return {
        status: 'unhealthy',
        message: `${this.name} service is not responding`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取服务信息
   */
  public getServiceInfo(): { name: string; version: string; config: any } {
    return {
      name: this.name,
      version: '1.0.0',
      config: this.config
    };
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    this.logger.info(`Cleaning up ${this.name} service`);
    // 子类可以重写此方法来实现具体的清理逻辑
  }
}
