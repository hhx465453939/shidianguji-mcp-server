import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/core/ErrorHandler';
import { requestLogger, corsMiddleware, rateLimiterMiddleware } from '@/middleware';
import routes from '@/routes';

/**
 * Express应用
 */
export function createApp(): express.Application {
  const app = express();
  
  // 基础中间件
  app.use(helmet({
    contentSecurityPolicy: false, // 禁用CSP，因为这是API服务
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // 自定义中间件
  app.use(requestLogger);
  app.use(corsMiddleware);
  app.use(rateLimiterMiddleware);
  
  // 路由
  app.use('/api', routes);
  
  // 根路径
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Guji MCP Server API',
      version: '1.0.0',
      documentation: '/api/info',
      endpoints: {
        search: '/api/search',
        books: '/api/books',
        health: '/api/health'
      }
    });
  });
  
  // 404处理
  app.use('*', ErrorHandler.notFound);
  
  // 错误处理
  app.use(ErrorHandler.handle);
  
  return app;
}

/**
 * 启动HTTP服务器
 */
export function startHttpServer(): void {
  const app = createApp();
  const serverConfig = config.get('server');
  
  const server = app.listen(serverConfig.port, serverConfig.host, () => {
    logger.info('HTTP Server started', {
      port: serverConfig.port,
      host: serverConfig.host,
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  // 优雅关闭
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed');
    });
  });
  
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed');
    });
  });
}
