import winston from 'winston';
import { config } from '@/config';

export class Logger {
  private winston: winston.Logger;

  constructor(service: string) {
    this.winston = winston.createLogger({
      level: config.get('logging').level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.label({ label: service })
      ),
      transports: this.createTransports()
    });
  }

  private createTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    // 控制台输出
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    );

    // 文件输出
    const loggingConfig = config.get('logging');
    if (loggingConfig.file.enabled) {
      // 错误日志
      transports.push(
        new winston.transports.File({
          filename: `${loggingConfig.file.path}/error.log`,
          level: 'error',
          maxsize: this.parseFileSize(loggingConfig.file.maxSize),
          maxFiles: loggingConfig.file.maxFiles
        })
      );

      // 综合日志
      transports.push(
        new winston.transports.File({
          filename: `${loggingConfig.file.path}/combined.log`,
          maxsize: this.parseFileSize(loggingConfig.file.maxSize),
          maxFiles: loggingConfig.file.maxFiles
        })
      );
    }

    return transports;
  }

  private parseFileSize(size: string): number {
    const units: Record<string, number> = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
    if (!match) {
      return 10 * 1024 * 1024; // 默认10MB
    }

    const value = parseFloat(match[1]);
    const unit = match[2];
    return Math.floor(value * units[unit]);
  }

  // 基础日志方法
  debug(message: string, meta: Record<string, unknown> = {}): void {
    this.winston.debug(message, {
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  info(message: string, meta: Record<string, unknown> = {}): void {
    this.winston.info(message, {
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  warn(message: string, meta: Record<string, unknown> = {}): void {
    this.winston.warn(message, {
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  error(message: string, error?: Error, meta: Record<string, unknown> = {}): void {
    this.winston.error(message, {
      ...meta,
      error: error?.stack,
      timestamp: new Date().toISOString()
    });
  }

  // 业务日志方法
  logSearch(keyword: string, resultsCount: number, searchTime: number, meta: Record<string, unknown> = {}): void {
    this.info('Search completed', {
      keyword,
      resultsCount,
      searchTime,
      type: 'search',
      ...meta
    });
  }

  logError(error: Error, context: Record<string, unknown> = {}): void {
    this.error('Operation failed', error, {
      ...context,
      type: 'error'
    });
  }

  logPerformance(operation: string, duration: number, meta: Record<string, unknown> = {}): void {
    this.info('Performance metric', {
      operation,
      duration,
      type: 'performance',
      ...meta
    });
  }

  logCacheHit(key: string, cacheType: 'memory' | 'redis' | 'file', meta: Record<string, unknown> = {}): void {
    this.debug('Cache hit', {
      key,
      cacheType,
      type: 'cache',
      ...meta
    });
  }

  logCacheMiss(key: string, cacheType: 'memory' | 'redis' | 'file', meta: Record<string, unknown> = {}): void {
    this.debug('Cache miss', {
      key,
      cacheType,
      type: 'cache',
      ...meta
    });
  }

  logRequest(method: string, url: string, statusCode: number, duration: number, meta: Record<string, unknown> = {}): void {
    this.info('HTTP request', {
      method,
      url,
      statusCode,
      duration,
      type: 'http',
      ...meta
    });
  }

  logDatabaseQuery(query: string, duration: number, meta: Record<string, unknown> = {}): void {
    this.debug('Database query', {
      query,
      duration,
      type: 'database',
      ...meta
    });
  }
}

// 创建默认日志实例
export const logger = new Logger('guji-mcp-server');
export default logger;
