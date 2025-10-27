import Joi from 'joi';

/**
 * 验证搜索参数
 */
export const searchParamsSchema = Joi.object({
  keyword: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': '搜索关键词不能为空',
      'string.min': '搜索关键词至少需要1个字符',
      'string.max': '搜索关键词不能超过100个字符'
    }),
  
  category: Joi.string()
    .valid('经部', '史部', '子部', '集部')
    .optional()
    .messages({
      'any.only': '分类必须是经部、史部、子部或集部之一'
    }),
  
  dynasty: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': '朝代名称不能超过50个字符'
    }),
  
  author: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': '作者名称不能超过100个字符'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': '结果数量限制不能小于1',
      'number.max': '结果数量限制不能超过100'
    }),
  
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': '偏移量不能小于0'
    }),
  
  sortBy: Joi.string()
    .valid('relevance', 'title', 'author', 'dynasty')
    .default('relevance')
    .messages({
      'any.only': '排序字段必须是relevance、title、author或dynasty之一'
    }),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': '排序顺序必须是asc或desc'
    })
});

/**
 * 验证书籍ID
 */
export const bookIdSchema = Joi.string()
  .pattern(/^[A-Z0-9_]+$/)
  .required()
  .messages({
    'string.pattern.base': '书籍ID格式不正确，只能包含大写字母、数字和下划线'
  });

/**
 * 验证章节ID
 */
export const chapterIdSchema = Joi.string()
  .min(1)
  .max(100)
  .required()
  .messages({
    'string.empty': '章节ID不能为空',
    'string.min': '章节ID至少需要1个字符',
    'string.max': '章节ID不能超过100个字符'
  });

/**
 * 验证分页参数
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': '页码不能小于1'
    }),
  
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': '每页大小不能小于1',
      'number.max': '每页大小不能超过100'
    })
});

/**
 * 验证内容提取参数
 */
export const extractParamsSchema = Joi.object({
  bookId: bookIdSchema,
  keyword: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': '关键词至少需要1个字符',
      'string.max': '关键词不能超过100个字符'
    }),
  
  maxSnippets: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(20)
    .messages({
      'number.min': '最大片段数不能小于1',
      'number.max': '最大片段数不能超过50'
    }),
  
  contextLength: Joi.number()
    .integer()
    .min(50)
    .max(1000)
    .default(200)
    .messages({
      'number.min': '上下文长度不能小于50',
      'number.max': '上下文长度不能超过1000'
    })
});

/**
 * 验证工具类
 */
export class ValidationHelper {
  /**
   * 验证数据并返回结果
   */
  static validate<T>(schema: Joi.ObjectSchema, data: unknown): { value: T; error?: Joi.ValidationError } {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return { value: data as T, error };
    }

    return { value: value as T };
  }

  /**
   * 验证数据并抛出错误
   */
  static validateOrThrow<T>(schema: Joi.ObjectSchema, data: unknown): T {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      throw new ValidationError('Validation failed', error.details[0].path.join('.'), {
        details: error.details
      });
    }

    return value as T;
  }

  /**
   * 检查是否为有效的URL
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查是否为有效的邮箱
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 检查是否为有效的ISBN
   */
  static isValidISBN(isbn: string): boolean {
    // 移除连字符和空格
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    
    // 检查长度
    if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
      return false;
    }

    // 简单的校验和检查
    if (cleanIsbn.length === 10) {
      return this.validateISBN10(cleanIsbn);
    } else {
      return this.validateISBN13(cleanIsbn);
    }
  }

  private static validateISBN10(isbn: string): boolean {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      if (!/\d/.test(isbn[i])) return false;
      sum += parseInt(isbn[i]) * (10 - i);
    }
    
    const checkDigit = isbn[9];
    if (checkDigit === 'X') {
      sum += 10;
    } else if (/\d/.test(checkDigit)) {
      sum += parseInt(checkDigit);
    } else {
      return false;
    }
    
    return sum % 11 === 0;
  }

  private static validateISBN13(isbn: string): boolean {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      if (!/\d/.test(isbn[i])) return false;
      sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(isbn[12]);
  }
}

/**
 * 自定义验证错误类
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly details?: Joi.ValidationErrorItem[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
