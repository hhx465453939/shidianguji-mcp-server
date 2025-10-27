#!/usr/bin/env node

/**
 * 古籍MCP服务器主入口文件
 * 启动MCP协议服务器，为AI助手提供古籍知识检索能力
 */

import { mcpServer } from '@/mcp/MCPServer';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import { ErrorHandler } from '@/core/ErrorHandler';

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    // 设置全局错误处理
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', new Error(String(reason)), { promise });
      process.exit(1);
    });

    // 设置优雅关闭
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await shutdown();
      process.exit(0);
    });

    // 启动MCP服务器
    logger.info('Starting Guji MCP Server...', {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    });

    await mcpServer.start();

    logger.info('Guji MCP Server started successfully', {
      tools: mcpServer.getServerInfo().tools.length,
      capabilities: mcpServer.getServerInfo().capabilities
    });

  } catch (error) {
    logger.error('Failed to start Guji MCP Server', error as Error);
    process.exit(1);
  }
}

/**
 * 优雅关闭
 */
async function shutdown(): Promise<void> {
  try {
    logger.info('Shutting down Guji MCP Server...');
    
    await mcpServer.cleanup();
    
    logger.info('Guji MCP Server shutdown completed');
  } catch (error) {
    logger.error('Error during shutdown', error as Error);
  }
}

// 启动服务器
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error in main process', error);
    process.exit(1);
  });
}

export { mcpServer };
export * from '@/types';
export * from '@/services';
export * from '@/core';
