import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import { NetworkError, ErrorFactory } from '@/types/errors';
import retry from 'p-retry';
import timeout from 'p-timeout';

/**
 * 请求优化器
 * 提供HTTP请求的优化功能，包括重试、超时、缓存等
 */
export class RequestOptimizer {
  private readonly axiosInstance: AxiosInstance;
  private readonly maxRetries: number;
  private readonly timeout: number;
  private readonly retryDelay: number;

  constructor(
    baseURL?: string,
    maxRetries: number = 3,
    timeout: number = 30000,
    retryDelay: number = 1000
  ) {
    this.maxRetries = maxRetries;
    this.timeout = timeout;
    this.retryDelay = retryDelay;

    // 创建axios实例
    this.axiosInstance = axios.create({
      baseURL,
      timeout: this.timeout,
      headers: {
        'User-Agent': config.get('antiCrawling').userAgent,
        ...config.get('antiCrawling').headers
      }
    });

    // 设置请求拦截器
    this.setupRequestInterceptor();
    
    // 设置响应拦截器
    this.setupResponseInterceptor();

    logger.info('RequestOptimizer initialized', {
      baseURL,
      maxRetries,
      timeout,
      retryDelay
    });
  }

  /**
   * 设置请求拦截器
   */
  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const requestId = this.generateRequestId();
        config.metadata = { requestId, startTime: Date.now() };
        
        logger.debug('Request started', {
          requestId,
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: config.headers
        });
        
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 设置响应拦截器
   */
  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const { requestId, startTime } = response.config.metadata || {};
        const duration = Date.now() - (startTime || 0);
        
        logger.debug('Request completed', {
          requestId,
          status: response.status,
          duration,
          dataSize: JSON.stringify(response.data).length
        });
        
        return response;
      },
      (error) => {
        const { requestId, startTime } = error.config?.metadata || {};
        const duration = Date.now() - (startTime || 0);
        
        logger.error('Request failed', error, {
          requestId,
          status: error.response?.status,
          duration,
          url: error.config?.url
        });
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * 执行GET请求
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.get<T>(url, config));
  }

  /**
   * 执行POST请求
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.post<T>(url, data, config));
  }

  /**
   * 执行PUT请求
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.put<T>(url, data, config));
  }

  /**
   * 执行DELETE请求
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.executeRequest(() => this.axiosInstance.delete<T>(url, config));
  }

  /**
   * 执行请求（带重试和超时）
   */
  private async executeRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>
  ): Promise<AxiosResponse<T>> {
    try {
      return await retry(
        async () => {
          return await timeout(requestFn(), this.timeout);
        },
        {
          retries: this.maxRetries,
          minTimeout: this.retryDelay,
          maxTimeout: this.retryDelay * 2,
          factor: 2,
          onFailedAttempt: (error) => {
            logger.warn('Request attempt failed', {
              attempt: error.attemptNumber,
              retriesLeft: error.retriesLeft,
              error: error.message
            });
          }
        }
      );
    } catch (error) {
      throw this.handleRequestError(error as Error);
    }
  }

  /**
   * 处理请求错误
   */
  private handleRequestError(error: Error): Error {
    if (axios.isAxiosError(error)) {
      const url = error.config?.url || 'unknown';
      const statusCode = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      return ErrorFactory.createNetworkError(url, message, statusCode, {
        originalError: error.message,
        responseData: error.response?.data
      });
    }
    
    if (error.message.includes('timeout')) {
      return ErrorFactory.createNetworkError('unknown', 'Request timeout', 408);
    }
    
    return error;
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 设置默认请求头
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    Object.assign(this.axiosInstance.defaults.headers, headers);
    logger.info('Default headers updated', { headers });
  }

  /**
   * 设置请求超时
   */
  setTimeout(timeout: number): void {
    this.axiosInstance.defaults.timeout = timeout;
    logger.info('Request timeout updated', { timeout });
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    maxRetries: number;
    timeout: number;
    retryDelay: number;
    baseURL: string;
  } {
    return {
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      retryDelay: this.retryDelay,
      baseURL: this.axiosInstance.defaults.baseURL || 'not set'
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 取消所有pending请求
    // 注意：axios没有内置的取消所有请求的方法
    logger.info('RequestOptimizer cleanup completed');
  }
}

/**
 * 全局请求优化器实例
 */
export const requestOptimizer = new RequestOptimizer(
  config.get('scraper').baseUrl,
  config.get('scraper').retries,
  config.get('scraper').timeout,
  config.get('scraper').delay
);
