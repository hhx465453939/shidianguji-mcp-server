import { Request, Response } from 'express';
import { extractorService } from '@/services/ExtractorService';
import { ErrorHandler } from '@/core/ErrorHandler';
import { logger } from '@/utils/logger';
import { ExtractOptions } from '@/types/guji';
import { ValidationHelper } from '@/utils/validation';
import { CryptoHelper } from '@/utils/crypto';

/**
 * 书籍控制器
 * 处理书籍信息相关的HTTP请求
 */
export class BookController {
  /**
   * 获取书籍信息
   */
  static async getBookInfo(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      const { bookId } = req.params;
      
      // 验证书籍ID
      const { error } = ValidationHelper.validate(
        ValidationHelper.bookIdSchema,
        bookId
      );

      if (error) {
        res.status(400).json(ErrorHandler.createErrorResponse(
          ValidationHelper.createValidationError('bookId', 'Invalid book ID format'),
          requestId
        ));
        return;
      }

      // 获取书籍信息
      const bookInfo = await extractorService.extractBookInfo(bookId);
      
      res.json(ErrorHandler.createSuccessResponse(bookInfo, requestId));
      
    } catch (error) {
      logger.error('Get book info request failed', error as Error, {
        requestId,
        bookId: req.params.bookId
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 获取书籍章节列表
   */
  static async getBookChapters(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      const { bookId } = req.params;
      
      // 验证书籍ID
      const { error } = ValidationHelper.validate(
        ValidationHelper.bookIdSchema,
        bookId
      );

      if (error) {
        res.status(400).json(ErrorHandler.createErrorResponse(
          ValidationHelper.createValidationError('bookId', 'Invalid book ID format'),
          requestId
        ));
        return;
      }

      // 获取书籍信息（包含章节列表）
      const bookInfo = await extractorService.extractBookInfo(bookId);
      
      res.json(ErrorHandler.createSuccessResponse(bookInfo.chapters, requestId));
      
    } catch (error) {
      logger.error('Get book chapters request failed', error as Error, {
        requestId,
        bookId: req.params.bookId
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 获取章节内容
   */
  static async getChapterContent(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      const { bookId, chapterId } = req.params;
      const { includeAnnotations, includeFootnotes } = req.query;
      
      // 验证参数
      const bookIdError = ValidationHelper.validate(
        ValidationHelper.bookIdSchema,
        bookId
      ).error;
      
      const chapterIdError = ValidationHelper.validate(
        ValidationHelper.chapterIdSchema,
        chapterId
      ).error;

      if (bookIdError || chapterIdError) {
        res.status(400).json(ErrorHandler.createErrorResponse(
          ValidationHelper.createValidationError('params', 'Invalid book ID or chapter ID format'),
          requestId
        ));
        return;
      }

      // 设置提取选项
      const options: ExtractOptions = {
        includeAnnotations: includeAnnotations !== 'false',
        includeFootnotes: includeFootnotes !== 'false'
      };

      // 获取章节内容
      const chapterContent = await extractorService.getChapterContent(
        bookId,
        chapterId,
        options
      );
      
      res.json(ErrorHandler.createSuccessResponse(chapterContent, requestId));
      
    } catch (error) {
      logger.error('Get chapter content request failed', error as Error, {
        requestId,
        bookId: req.params.bookId,
        chapterId: req.params.chapterId
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 提取内容片段
   */
  static async extractContentSnippets(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      const { bookId } = req.params;
      const { keyword, maxSnippets, contextLength, enableLocalCache } = req.query;
      
      // 验证书籍ID
      const { error } = ValidationHelper.validate(
        ValidationHelper.bookIdSchema,
        bookId
      );

      if (error) {
        res.status(400).json(ErrorHandler.createErrorResponse(
          ValidationHelper.createValidationError('bookId', 'Invalid book ID format'),
          requestId
        ));
        return;
      }

      // 设置提取选项
      const options: ExtractOptions = {
        maxSnippets: maxSnippets ? parseInt(maxSnippets as string) : 20,
        contextLength: contextLength ? parseInt(contextLength as string) : 200,
        enableLocalCache: enableLocalCache !== 'false',
        maxChapters: 10,
        includeAnnotations: true,
        includeFootnotes: true
      };

      // 提取内容片段
      const snippets = await extractorService.extractContentSnippets(
        bookId,
        keyword as string,
        options
      );
      
      res.json(ErrorHandler.createSuccessResponse(snippets, requestId));
      
    } catch (error) {
      logger.error('Extract content snippets request failed', error as Error, {
        requestId,
        bookId: req.params.bookId,
        keyword: req.query.keyword
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }

  /**
   * 获取书籍统计信息
   */
  static async getBookStats(req: Request, res: Response): Promise<void> {
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      const { bookId } = req.params;
      
      // 验证书籍ID
      const { error } = ValidationHelper.validate(
        ValidationHelper.bookIdSchema,
        bookId
      );

      if (error) {
        res.status(400).json(ErrorHandler.createErrorResponse(
          ValidationHelper.createValidationError('bookId', 'Invalid book ID format'),
          requestId
        ));
        return;
      }

      // 获取书籍信息
      const bookInfo = await extractorService.extractBookInfo(bookId);
      
      // 计算统计信息
      const stats = {
        bookId,
        title: bookInfo.title,
        totalChapters: bookInfo.totalChapters,
        estimatedWordCount: bookInfo.totalChapters * 1000, // 估算
        lastUpdated: bookInfo.metadata.lastUpdated,
        source: bookInfo.metadata.source
      };
      
      res.json(ErrorHandler.createSuccessResponse(stats, requestId));
      
    } catch (error) {
      logger.error('Get book stats request failed', error as Error, {
        requestId,
        bookId: req.params.bookId
      });
      
      res.status(500).json(ErrorHandler.createErrorResponse(
        error as Error,
        requestId
      ));
    }
  }
}
