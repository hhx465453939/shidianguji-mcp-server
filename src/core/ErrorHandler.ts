import { Request, Response, NextFunction } from 'express';
import { GujiError, ErrorType, ERROR_STATUS_MAP } from '@/types/errors';
import { logger } from '@/utils/logger';
import { CryptoHelper } from '@/utils/crypto';

/**
 * 统一错误处理类
 */
export class ErrorHandler {
  /**
   * Express错误处理中间件
   */
  static handle(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const requestId = req.headers['x-request-id'] as string || CryptoHelper.generateRequestId();
    
    // 记录错误
    logger.error('Request error occurred', error, {
      requestId,
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // 处理不同类型的错误
    if (error instanceof GujiError) {
      const statusCode = ERROR_STATUS_MAP[error.type] || 500;
      const errorResponse = error.toJSON();
      
      res.status(statusCode).json({
        success: false,
        error: {
          type: errorResponse.type,
          code: errorResponse.code,
          message: errorResponse.message,
          details: errorResponse.details,
          field: error.field
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      });
      return;
    }

    // 处理HTTP错误
    if (error.name === 'HttpError') {
      const httpError = error as any;
      res.status(httpError.statusCode || 500).json({
        success: false,
        error: {
          type: ErrorType.REQUEST_FAILED,
          code: 'HTTP_ERROR',
          message: error.message,
          statusCode: httpError.statusCode
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      });
      return;
    }

    // 处理验证错误
    if (error.name === 'ValidationError') {
      const validationError = error as any;
      res.status(400).json({
        success: false,
        error: {
          type: ErrorType.VALIDATION_ERROR,
          code: 'VALIDATION_FAILED',
          message: error.message,
          field: validationError.field,
          details: validationError.details
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      });
      return;
    }

    // 处理JWT错误
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: {
          type: ErrorType.AUTHENTICATION_ERROR,
          code: 'INVALID_TOKEN',
          message: 'Invalid token'
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      });
      return;
    }

    // 处理JWT过期错误
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: {
          type: ErrorType.AUTHENTICATION_ERROR,
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      });
      return;
    }

    // 处理语法错误
    if (error instanceof SyntaxError) {
      res.status(400).json({
        success: false,
        error: {
          type: ErrorType.PARSING_ERROR,
          code: 'INVALID_JSON',
          message: 'Invalid JSON format'
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      });
      return;
    }

    // 默认内部服务器错误
    res.status(500).json({
      success: false,
      error: {
        type: ErrorType.INTERNAL_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        message: '内部服务器错误'
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  }

  /**
   * 404错误处理中间件
   */
  static notFound(req: Request, res: Response): void {
    const requestId = req.headers['x-request-id'] as string || CryptoHelper.generateRequestId();
    
    logger.warn('Route not found', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.status(404).json({
      success: false,
      error: {
        type: ErrorType.RESOURCE_NOT_FOUND,
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.url} not found`
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  }

  /**
   * 异步错误处理包装器
   */
  static asyncHandler<T extends RequestHandler>(
    fn: T
  ): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(
    error: GujiError,
    requestId: string
  ): any {
    const statusCode = ERROR_STATUS_MAP[error.type] || 500;
    
    return {
      success: false,
      error: {
        type: error.type,
        code: error.code,
        message: error.message,
        details: error.details,
        field: error.field
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * 创建成功响应
   */
  static createSuccessResponse<T>(
    data: T,
    requestId: string,
    pagination?: any
  ): any {
    return {
      success: true,
      data,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        ...(pagination && { pagination })
      }
    };
  }
}

// 类型定义
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
