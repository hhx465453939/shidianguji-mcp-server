import { Request, Response } from 'express';
import { searchService } from '@/services/SearchService';
import { ErrorHandler } from '@/core/ErrorHandler';
import { logger } from '@/utils/logger';
import { SearchParams } from '@/types/guji';
import { ValidationHelper } from '@/utils/validation';
import { CryptoHelper } from '@/utils/crypto';

/**
 * 搜索控制器
 * 处理古籍搜索相关的HTTP请求
 */
export class SearchController {
  /**
   * 搜索古籍内容
   */
  static async search(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      // 验证请求参数
      const { error, value: searchParams } = ValidationHelper.validate(
        ValidationHelper.searchParamsSchema,
        req.query
      );

      if (error) {
        res.status(400).json(ErrorHandler.createErrorResponse(
          ValidationHelper.createValidationError('params', 'Invalid search parameters', {
            details: error.details
          }),
          requestId
        ));
        return;
      }

      // 执行搜索
      const result = await searchService.search(searchParams as SearchParams);
      
      // 返回成功响应
      res.json(ErrorHandler.createSuccessResponse(result, requestId, result.pagination));
      
    } catch (error) {
      logger.error('Search request failed', error as Error, {
        requestId,
        query: req.query,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 获取搜索建议
   */
  static async getSuggestions(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      const { keyword } = req.query;
      
      if (!keyword || typeof keyword !== 'string') {
        res.status(400).json(ErrorHandler.createErrorResponse(
          ValidationHelper.createValidationError('keyword', '搜索关键词不能为空'),
          requestId
        ));
        return;
      }

      // 简单的搜索建议实现
      const suggestions = await this.generateSuggestions(keyword);
      
      res.json(ErrorHandler.createSuccessResponse(suggestions, requestId));
      
    } catch (error) {
      logger.error('Get suggestions request failed', error as Error, {
        requestId,
        keyword: req.query.keyword
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 获取热门搜索
   */
  static async getPopularSearches(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      // 模拟热门搜索数据
      const popularSearches = [
        { keyword: '论语', count: 1250 },
        { keyword: '道德经', count: 980 },
        { keyword: '史记', count: 856 },
        { keyword: '诗经', count: 742 },
        { keyword: '孟子', count: 689 },
        { keyword: '庄子', count: 567 },
        { keyword: '周易', count: 445 },
        { keyword: '左传', count: 398 }
      ];
      
      res.json(ErrorHandler.createSuccessResponse(popularSearches, requestId));
      
    } catch (error) {
      logger.error('Get popular searches request failed', error as Error, {
        requestId
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 生成搜索建议
   */
  private static async generateSuggestions(keyword: string): Promise<string[]> {
    // 简单的搜索建议实现
    // 在实际应用中，这里可以调用搜索服务或使用缓存
    const suggestions = [
      `${keyword} 原文`,
      `${keyword} 译文`,
      `${keyword} 注释`,
      `${keyword} 解析`,
      `${keyword} 全文`
    ];
    
    return suggestions;
  }
}
