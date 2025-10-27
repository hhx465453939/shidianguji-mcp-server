import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// 加载环境变量
dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
}

export interface RedisConfig {
  url: string;
  ttl: number;
  maxRetries: number;
}

export interface ScraperConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  delay: number;
  searchUrlTemplate: string;
}

export interface AntiCrawlingConfig {
  maxConcurrentRequests: number;
  requestsPerSecond: number;
  requestDelay: number;
  burstLimit: number;
  maxSearchResults: number;
  userAgent: string;
  headers: Record<string, string>;
}

export interface CacheConfig {
  memory: {
    maxSize: number;
    ttl: number;
  };
  redis: {
    ttl: number;
  };
  search: {
    ttl: number;
  };
}

export interface LoggingConfig {
  level: string;
  file: {
    enabled: boolean;
    path: string;
    maxSize: string;
    maxFiles: number;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  port: number;
  metrics: {
    enabled: boolean;
    path: string;
  };
}

export interface AppConfig {
  server: ServerConfig;
  redis: RedisConfig;
  scraper: ScraperConfig;
  antiCrawling: AntiCrawlingConfig;
  cache: CacheConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    const env = process.env.NODE_ENV || 'development';
    const configPath = join(process.cwd(), 'config', `${env}.json`);
    
    try {
      const configFile = readFileSync(configPath, 'utf8');
      const fileConfig = JSON.parse(configFile);
      
      // 合并环境变量覆盖
      return this.mergeWithEnvVars(fileConfig);
    } catch (error) {
      console.warn(`Failed to load config file: ${configPath}, using default config`);
      return this.getDefaultConfig();
    }
  }

  private mergeWithEnvVars(config: AppConfig): AppConfig {
    return {
      ...config,
      server: {
        ...config.server,
        port: parseInt(process.env.PORT || config.server.port.toString()),
        host: process.env.HOST || config.server.host
      },
      redis: {
        ...config.redis,
        url: process.env.REDIS_URL || config.redis.url
      },
      scraper: {
        ...config.scraper,
        baseUrl: process.env.SHIDIANGUJI_BASE_URL || config.scraper.baseUrl
      },
      logging: {
        ...config.logging,
        level: process.env.LOG_LEVEL || config.logging.level
      }
    };
  }

  private getDefaultConfig(): AppConfig {
    return {
      server: {
        port: 3000,
        host: 'localhost',
        cors: {
          origin: '*',
          credentials: true
        }
      },
      redis: {
        url: 'redis://localhost:6379',
        ttl: 3600,
        maxRetries: 3
      },
      scraper: {
        baseUrl: 'https://www.shidianguji.com',
        timeout: 30000,
        retries: 3,
        delay: 1000,
        searchUrlTemplate: 'https://www.shidianguji.com/search/{keywords}?page_from=home_page&bookName={bookName}&author={author}&source=PC'
      },
      antiCrawling: {
        maxConcurrentRequests: 1,
        requestsPerSecond: 2,
        requestDelay: 1000,
        burstLimit: 5,
        maxSearchResults: 1000,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      },
      cache: {
        memory: {
          maxSize: 100,
          ttl: 300
        },
        redis: {
          ttl: 3600
        },
        search: {
          ttl: 3600
        }
      },
      logging: {
        level: 'info',
        file: {
          enabled: true,
          path: 'logs',
          maxSize: '10m',
          maxFiles: 5
        }
      },
      monitoring: {
        enabled: true,
        port: 9090,
        metrics: {
          enabled: true,
          path: '/metrics'
        }
      }
    };
  }

  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  public getAll(): AppConfig {
    return { ...this.config };
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }
}

// 导出单例实例
export const config = new ConfigManager();
export default config;
