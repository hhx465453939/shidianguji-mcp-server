import { Request, Response, NextFunction } from 'express';
import { config } from '@/config';

/**
 * CORS中间件
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const corsConfig = config.get('server').cors;
  
  // 设置CORS头
  if (Array.isArray(corsConfig.origin)) {
    const origin = req.headers.origin;
    if (origin && corsConfig.origin.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else if (corsConfig.origin === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', corsConfig.origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.setHeader('Access-Control-Allow-Credentials', corsConfig.credentials.toString());
  res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}
