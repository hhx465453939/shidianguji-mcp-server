/**
 * 日期工具类
 */
export class DateHelper {
  /**
   * 获取当前时间戳（毫秒）
   */
  static now(): number {
    return Date.now();
  }

  /**
   * 获取当前时间戳（秒）
   */
  static nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * 格式化日期
   */
  static format(date: Date | number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 获取ISO格式日期字符串
   */
  static toISOString(date: Date | number = Date.now()): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    return d.toISOString();
  }

  /**
   * 解析日期字符串
   */
  static parse(dateString: string): Date | null {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * 添加时间
   */
  static add(date: Date | number, amount: number, unit: 'ms' | 's' | 'm' | 'h' | 'd' = 'ms'): Date {
    const d = typeof date === 'number' ? new Date(date) : new Date(date);
    const multipliers: Record<string, number> = {
      'ms': 1,
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    return new Date(d.getTime() + amount * multipliers[unit]);
  }

  /**
   * 计算时间差（毫秒）
   */
  static diff(date1: Date | number, date2: Date | number): number {
    const d1 = typeof date1 === 'number' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'number' ? new Date(date2) : date2;
    return d1.getTime() - d2.getTime();
  }

  /**
   * 检查是否过期
   */
  static isExpired(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl;
  }

  /**
   * 获取今天的开始时间
   */
  static startOfDay(date: Date | number = Date.now()): Date {
    const d = typeof date === 'number' ? new Date(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * 获取今天的结束时间
   */
  static endOfDay(date: Date | number = Date.now()): Date {
    const d = typeof date === 'number' ? new Date(date) : new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * 获取相对时间描述
   */
  static getRelativeTime(date: Date | number): string {
    const now = Date.now();
    const target = typeof date === 'number' ? date : date.getTime();
    const diff = now - target;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else if (days < 30) {
      return `${days}天前`;
    } else {
      return this.format(target, 'YYYY-MM-DD');
    }
  }
}
