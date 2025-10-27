/**
 * 字符串工具类
 */
export class StringHelper {
  /**
   * 清理字符串，移除特殊字符
   */
  static clean(input: string): string {
    return input
      .trim()
      .replace(/[^\u4e00-\u9fff\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * 截断字符串
   */
  static truncate(input: string, length: number, suffix: string = '...'): string {
    if (input.length <= length) {
      return input;
    }
    return input.substring(0, length - suffix.length) + suffix;
  }

  /**
   * 首字母大写
   */
  static capitalize(input: string): string {
    if (!input) return input;
    return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
  }

  /**
   * 驼峰命名转换
   */
  static toCamelCase(input: string): string {
    return input
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  /**
   * 下划线命名转换
   */
  static toSnakeCase(input: string): string {
    return input
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * 生成随机字符串
   */
  static random(length: number = 8, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * 检查是否为空字符串
   */
  static isEmpty(input: string | null | undefined): boolean {
    return !input || input.trim().length === 0;
  }

  /**
   * 检查是否为有效的中文
   */
  static isChinese(input: string): boolean {
    return /^[\u4e00-\u9fff]+$/.test(input);
  }

  /**
   * 检查是否包含中文
   */
  static containsChinese(input: string): boolean {
    return /[\u4e00-\u9fff]/.test(input);
  }

  /**
   * 提取中文内容
   */
  static extractChinese(input: string): string {
    return input.match(/[\u4e00-\u9fff]+/g)?.join('') || '';
  }

  /**
   * 计算字符串长度（中文按2个字符计算）
   */
  static getLength(input: string): number {
    let length = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charAt(i);
      if (this.isChinese(char)) {
        length += 2;
      } else {
        length += 1;
      }
    }
    return length;
  }

  /**
   * 高亮关键词
   */
  static highlight(input: string, keyword: string, className: string = 'highlight'): string {
    if (!keyword || !input) return input;
    
    const regex = new RegExp(`(${keyword})`, 'gi');
    return input.replace(regex, `<span class="${className}">$1</span>`);
  }

  /**
   * 移除HTML标签
   */
  static stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * 转义HTML字符
   */
  static escapeHtml(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return input.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * 反转义HTML字符
   */
  static unescapeHtml(input: string): string {
    const map: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };
    return input.replace(/&(amp|lt|gt|quot|#39);/g, (m) => map[m]);
  }

  /**
   * 生成摘要
   */
  static generateSummary(input: string, maxLength: number = 200, keyword?: string): string {
    let summary = this.stripHtml(input).trim();
    
    if (summary.length <= maxLength) {
      return summary;
    }

    if (keyword) {
      const keywordIndex = summary.toLowerCase().indexOf(keyword.toLowerCase());
      if (keywordIndex !== -1) {
        const start = Math.max(0, keywordIndex - maxLength / 2);
        const end = Math.min(summary.length, start + maxLength);
        summary = summary.substring(start, end);
        
        if (start > 0) {
          summary = '...' + summary;
        }
        if (end < input.length) {
          summary = summary + '...';
        }
      } else {
        summary = summary.substring(0, maxLength) + '...';
      }
    } else {
      summary = summary.substring(0, maxLength) + '...';
    }

    return summary;
  }

  /**
   * 检查字符串相似度
   */
  static similarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}
