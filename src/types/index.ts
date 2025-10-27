/**
 * 类型定义导出
 */

// 古籍相关类型
export * from './guji';

// MCP协议相关类型
export * from './mcp';

// 错误相关类型
export * from './errors';

// 通用类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    version: string;
    pagination?: PaginationInfo;
  };
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number;
  prevPage?: number;
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

export interface ServiceConfig {
  name: string;
  version: string;
  environment: string;
  port: number;
  host: string;
  timeout: number;
  retries: number;
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    external: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export interface Metrics {
  requests: {
    total: number;
    success: number;
    error: number;
    avgResponseTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  memory: {
    used: number;
    free: number;
    heapUsed: number;
  };
  uptime: number;
}
