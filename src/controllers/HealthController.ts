import { Request, Response } from 'express';
import { ErrorHandler } from '@/core/ErrorHandler';
import { logger } from '@/utils/logger';
import { mcpServer } from '@/mcp/MCPServer';
import { searchService } from '@/services/SearchService';
import { extractorService } from '@/services/ExtractorService';
import { cacheService } from '@/services/CacheService';
import { CryptoHelper } from '@/utils/crypto';
import { config } from '@/config';

/**
 * 健康检查控制器
 * 处理系统健康状态相关的HTTP请求
 */
export class HealthController {
  /**
   * 基础健康检查
   */
  static async health(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          free: Math.round((process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) / 1024 / 1024)
        }
      };
      
      res.json(ErrorHandler.createSuccessResponse(health, requestId));
      
    } catch (error) {
      logger.error('Health check request failed', error as Error, {
        requestId
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 详细健康检查
   */
  static async healthDetailed(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      // 检查各个服务的健康状态
      const [mcpHealth, searchHealth, extractorHealth, cacheHealth] = await Promise.all([
        mcpServer.healthCheck(),
        searchService.healthCheck(),
        extractorService.healthCheck(),
        cacheService.healthCheck()
      ]);
      
      const services = {
        mcp: mcpHealth,
        search: searchHealth,
        extractor: extractorHealth,
        cache: cacheHealth
      };
      
      // 确定整体状态
      const allHealthy = Object.values(services).every(service => service.status === 'healthy');
      const anyUnhealthy = Object.values(services).some(service => service.status === 'unhealthy');
      
      let overallStatus = 'healthy';
      if (anyUnhealthy) {
        overallStatus = 'unhealthy';
      } else if (!allHealthy) {
        overallStatus = 'degraded';
      }
      
      const health = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        services,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          free: Math.round((process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) / 1024 / 1024)
        },
        system: {
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          cpuUsage: process.cpuUsage()
        }
      };
      
      res.json(ErrorHandler.createSuccessResponse(health, requestId));
      
    } catch (error) {
      logger.error('Detailed health check request failed', error as Error, {
        requestId
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 获取系统指标
   */
  static async metrics(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss
        },
        cpu: process.cpuUsage(),
        system: {
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          version: process.version
        },
        config: {
          environment: process.env.NODE_ENV || 'development',
          port: config.get('server').port,
          host: config.get('server').host
        }
      };
      
      res.json(ErrorHandler.createSuccessResponse(metrics, requestId));
      
    } catch (error) {
      logger.error('Metrics request failed', error as Error, {
        requestId
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 获取服务信息
   */
  static async info(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      const info = {
        name: 'Guji MCP Server',
        version: '1.0.0',
        description: '基于Node.js的古籍MCP服务器，为AI助手提供古籍知识检索能力',
        author: 'pp',
        license: 'MIT',
        repository: 'https://github.com/your-username/guji-mcp-server-node',
        documentation: 'https://github.com/your-username/guji-mcp-server-node#readme',
        capabilities: mcpServer.getServerInfo().capabilities,
        tools: mcpServer.getServerInfo().tools,
        endpoints: {
          search: '/api/search',
          books: '/api/books',
          health: '/api/health',
          metrics: '/api/metrics'
        },
        mcp: {
          protocol: 'Model Context Protocol',
          version: '0.4.0',
          transport: 'stdio'
        }
      };
      
      res.json(ErrorHandler.createSuccessResponse(info, requestId));
      
    } catch (error) {
      logger.error('Info request failed', error as Error, {
        requestId
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }
}
