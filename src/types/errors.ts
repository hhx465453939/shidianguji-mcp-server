/**
 * 错误相关类型定义
 */

// 错误类型枚举
export enum ErrorType {
  // 参数验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  REQUEST_FAILED = 'REQUEST_FAILED',
  
  // 数据解析错误
  PARSING_ERROR = 'PARSING_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  DATA_FORMAT_ERROR = 'DATA_FORMAT_ERROR',
  
  // 缓存相关错误
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_MISS = 'CACHE_MISS',
  CACHE_WRITE_FAILED = 'CACHE_WRITE_FAILED',
  
  // 业务逻辑错误
  SEARCH_ERROR = 'SEARCH_ERROR',
  EXTRACTION_ERROR = 'EXTRACTION_ERROR',
  BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  
  // 系统错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// 错误严重程度枚举
export enum ErrorSeverity {
  LOW = 'LOW',           // 可忽略的错误
  MEDIUM = 'MEDIUM',     // 需要记录但不影响功能
  HIGH = 'HIGH',         // 影响功能但可恢复
  CRITICAL = 'CRITICAL'  // 系统级错误，需要立即处理
}

// 基础错误类
export abstract class GujiError extends Error {
  abstract readonly type: ErrorType;
  abstract readonly severity: ErrorSeverity;
  abstract readonly retryable: boolean;
  
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // 确保错误堆栈正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): ErrorResponse {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      severity: this.severity,
      retryable: this.retryable,
      details: this.details,
      context: this.context,
      timestamp: new Date().toISOString()
    };
  }
}

// 验证错误类
export class ValidationError extends GujiError {
  readonly type = ErrorType.VALIDATION_ERROR;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = false;

  constructor(
    message: string,
    public readonly field: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'INVALID_PARAMETERS', details, { field });
  }
}

// 网络错误类
export class NetworkError extends GujiError {
  readonly type = ErrorType.NETWORK_ERROR;
  readonly severity = ErrorSeverity.HIGH;
  readonly retryable = true;

  constructor(
    message: string,
    public readonly url: string,
    public readonly statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_UNAVAILABLE', details, { url, statusCode });
  }
}

// 搜索错误类
export class SearchError extends GujiError {
  readonly type = ErrorType.SEARCH_ERROR;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = true;

  constructor(
    message: string,
    public readonly keyword: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'SEARCH_FAILED', details, { keyword });
  }
}

// 提取错误类
export class ExtractionError extends GujiError {
  readonly type = ErrorType.EXTRACTION_ERROR;
  readonly severity = ErrorSeverity.HIGH;
  readonly retryable = true;

  constructor(
    message: string,
    public readonly bookId: string,
    public readonly chapterId?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'EXTRACTION_FAILED', details, { bookId, chapterId });
  }
}

// 缓存错误类
export class CacheError extends GujiError {
  readonly type = ErrorType.CACHE_ERROR;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = true;

  constructor(
    message: string,
    public readonly operation: 'get' | 'set' | 'delete',
    public readonly key: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'CACHE_ERROR', details, { operation, key });
  }
}

// 资源未找到错误类
export class ResourceNotFoundError extends GujiError {
  readonly type = ErrorType.BOOK_NOT_FOUND;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = false;

  constructor(
    message: string,
    public readonly resourceType: string,
    public readonly resourceId: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'NOT_FOUND', details, { resourceType, resourceId });
  }
}

// 速率限制错误类
export class RateLimitError extends GujiError {
  readonly type = ErrorType.RATE_LIMIT_EXCEEDED;
  readonly severity = ErrorSeverity.MEDIUM;
  readonly retryable = true;

  constructor(
    message: string,
    public readonly retryAfter: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', details, { retryAfter });
  }
}

// 内部错误类
export class InternalError extends GujiError {
  readonly type = ErrorType.INTERNAL_ERROR;
  readonly severity = ErrorSeverity.CRITICAL;
  readonly retryable = false;

  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'INTERNAL_SERVER_ERROR', details);
  }
}

// 错误响应接口
export interface ErrorResponse {
  type: ErrorType;
  code: string;
  message: string;
  severity: ErrorSeverity;
  retryable: boolean;
  details?: Record<string, unknown>;
  context?: Record<string, unknown>;
  timestamp: string;
}

// HTTP状态码映射
export const ERROR_STATUS_MAP: Record<ErrorType, number> = {
  [ErrorType.VALIDATION_ERROR]: 400,
  [ErrorType.INVALID_PARAMETERS]: 400,
  [ErrorType.MISSING_REQUIRED_FIELD]: 400,
  [ErrorType.AUTHENTICATION_ERROR]: 401,
  [ErrorType.AUTHORIZATION_ERROR]: 403,
  [ErrorType.RESOURCE_NOT_FOUND]: 404,
  [ErrorType.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorType.INTERNAL_ERROR]: 500,
  [ErrorType.SERVICE_UNAVAILABLE]: 503,
  [ErrorType.NETWORK_ERROR]: 502,
  [ErrorType.CONNECTION_TIMEOUT]: 504,
  [ErrorType.REQUEST_FAILED]: 502,
  [ErrorType.PARSING_ERROR]: 422,
  [ErrorType.INVALID_RESPONSE]: 422,
  [ErrorType.DATA_FORMAT_ERROR]: 422,
  [ErrorType.CACHE_ERROR]: 500,
  [ErrorType.CACHE_MISS]: 404,
  [ErrorType.CACHE_WRITE_FAILED]: 500,
  [ErrorType.SEARCH_ERROR]: 502,
  [ErrorType.EXTRACTION_ERROR]: 502,
  [ErrorType.BOOK_NOT_FOUND]: 404,
  [ErrorType.CHAPTER_NOT_FOUND]: 404
};

// 错误工厂类
export class ErrorFactory {
  static createValidationError(field: string, message: string, details?: Record<string, unknown>): ValidationError {
    return new ValidationError(message, field, details);
  }

  static createNetworkError(url: string, message: string, statusCode?: number, details?: Record<string, unknown>): NetworkError {
    return new NetworkError(message, url, statusCode, details);
  }

  static createSearchError(keyword: string, message: string, details?: Record<string, unknown>): SearchError {
    return new SearchError(message, keyword, details);
  }

  static createExtractionError(bookId: string, message: string, chapterId?: string, details?: Record<string, unknown>): ExtractionError {
    return new ExtractionError(message, bookId, chapterId, details);
  }

  static createCacheError(operation: 'get' | 'set' | 'delete', key: string, message: string, details?: Record<string, unknown>): CacheError {
    return new CacheError(message, operation, key, details);
  }

  static createResourceNotFoundError(resourceType: string, resourceId: string, message?: string): ResourceNotFoundError {
    const defaultMessage = `${resourceType} with ID '${resourceId}' not found`;
    return new ResourceNotFoundError(message || defaultMessage, resourceType, resourceId);
  }

  static createRateLimitError(retryAfter: number, message?: string): RateLimitError {
    const defaultMessage = '请求过于频繁，请稍后重试';
    return new RateLimitError(message || defaultMessage, retryAfter);
  }

  static createInternalError(message: string, details?: Record<string, unknown>): InternalError {
    return new InternalError(message, details);
  }
}
