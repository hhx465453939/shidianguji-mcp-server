import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { CryptoHelper } from '@/utils/crypto';

/**
 * 请求日志中间件
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || CryptoHelper.generateRequestId();
  
  // 设置请求ID
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  
  // 记录请求开始
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined
  });
  
  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.logRequest(req.method, req.url, res.statusCode, duration, {
      requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
  });
  
  next();
}
