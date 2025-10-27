import { createHash, randomBytes } from 'crypto';

/**
 * 加密工具类
 */
export class CryptoHelper {
  /**
   * 生成MD5哈希
   */
  static md5(input: string): string {
    return createHash('md5').update(input).digest('hex');
  }

  /**
   * 生成SHA256哈希
   */
  static sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * 生成随机字符串
   */
  static randomString(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * 生成UUID v4
   */
  static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 生成缓存键
   */
  static generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
    const key = parts.join(':');
    return `${prefix}:${this.sha256(key)}`;
  }

  /**
   * 生成请求ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${this.randomString(8)}`;
  }

  /**
   * 生成会话ID
   */
  static generateSessionId(): string {
    return `sess_${Date.now()}_${this.randomString(16)}`;
  }
}
