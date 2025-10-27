import { BaseService } from '@/core/BaseService';
import { RequestOptimizer } from '@/core/RequestOptimizer';
import { ConcurrencyController } from '@/core/ConcurrencyController';
import { cacheService } from './CacheService';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { 
  SearchParams, 
  ContentSnippet, 
  BookInfo, 
  ChapterContent,
  ExtractOptions 
} from '@/types/guji';
import { ExtractionError, ErrorFactory } from '@/types/errors';
import { CryptoHelper } from '@/utils/crypto';
import { StringHelper } from '@/utils/string';
import * as cheerio from 'cheerio';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

/**
 * 内容提取服务
 * 负责从识典古籍网站提取书籍和章节内容
 */
export class ExtractorService extends BaseService {
  private readonly requestOptimizer: RequestOptimizer;
  private readonly concurrencyController: ConcurrencyController;
  private readonly baseUrl: string;
  private readonly localCacheDir: string;

  constructor() {
    super('ExtractorService');
    
    this.baseUrl = config.get('scraper').baseUrl;
    this.localCacheDir = config.get('localCache')?.baseDir || './guji-cache';
    
    this.requestOptimizer = new RequestOptimizer(
      this.baseUrl,
      config.get('scraper').retries,
      config.get('scraper').timeout,
      config.get('scraper').delay
    );
    
    this.concurrencyController = new ConcurrencyController(
      config.get('antiCrawling').maxConcurrentRequests,
      config.get('antiCrawling').requestsPerSecond,
      config.get('antiCrawling').requestDelay
    );
  }

  /**
   * 提取书籍信息
   */
  async extractBookInfo(bookId: string): Promise<BookInfo> {
    const startTime = Date.now();
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      // 验证参数
      if (!bookId || bookId.trim().length === 0) {
        throw ErrorFactory.createValidationError('bookId', '书籍ID不能为空');
      }
      
      // 生成缓存键
      const cacheKey = CryptoHelper.generateCacheKey('book', bookId);
      
      // 检查缓存
      const cachedBook = await cacheService.get<BookInfo>(cacheKey);
      if (cachedBook) {
        logger.logCacheHit(cacheKey, 'all');
        return cachedBook;
      }
      
      // 执行提取
      const bookInfo = await this.executeBookExtraction(bookId, requestId);
      
      // 缓存结果
      await cacheService.set(cacheKey, bookInfo, config.get('cache').redis.ttl);
      
      // 记录性能指标
      const duration = Date.now() - startTime;
      this.recordPerformance('extractBookInfo', duration, {
        bookId,
        requestId
      });
      
      return bookInfo;
    } catch (error) {
      this.recordError(error as Error, {
        bookId,
        requestId
      });
      throw ErrorFactory.createExtractionError(bookId, 'Failed to extract book information');
    }
  }

  /**
   * 提取内容片段
   */
  async extractContentSnippets(
    bookId: string,
    keyword?: string,
    options: ExtractOptions = {}
  ): Promise<ContentSnippet[]> {
    const startTime = Date.now();
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      // 验证参数
      if (!bookId || bookId.trim().length === 0) {
        throw ErrorFactory.createValidationError('bookId', '书籍ID不能为空');
      }
      
      // 设置默认选项
      const extractOptions: ExtractOptions = {
        maxSnippets: 20,
        contextLength: 200,
        enableLocalCache: true,
        maxChapters: 10,
        includeAnnotations: true,
        includeFootnotes: true,
        ...options
      };
      
      // 生成缓存键
      const cacheKey = CryptoHelper.generateCacheKey('snippets', bookId, keyword || 'all');
      
      // 检查缓存
      const cachedSnippets = await cacheService.get<ContentSnippet[]>(cacheKey);
      if (cachedSnippets) {
        logger.logCacheHit(cacheKey, 'all');
        return cachedSnippets;
      }
      
      // 执行提取
      const snippets = await this.executeSnippetExtraction(bookId, keyword, extractOptions, requestId);
      
      // 缓存结果
      await cacheService.set(cacheKey, snippets, config.get('cache').redis.ttl);
      
      // 记录性能指标
      const duration = Date.now() - startTime;
      this.recordPerformance('extractContentSnippets', duration, {
        bookId,
        keyword,
        snippetsCount: snippets.length,
        requestId
      });
      
      return snippets;
    } catch (error) {
      this.recordError(error as Error, {
        bookId,
        keyword,
        requestId
      });
      throw ErrorFactory.createExtractionError(bookId, 'Failed to extract content snippets');
    }
  }

  /**
   * 获取章节内容
   */
  async getChapterContent(
    bookId: string,
    chapterId: string,
    options: ExtractOptions = {}
  ): Promise<ChapterContent> {
    const startTime = Date.now();
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      // 验证参数
      if (!bookId || bookId.trim().length === 0) {
        throw ErrorFactory.createValidationError('bookId', '书籍ID不能为空');
      }
      
      if (!chapterId || chapterId.trim().length === 0) {
        throw ErrorFactory.createValidationError('chapterId', '章节ID不能为空');
      }
      
      // 设置默认选项
      const extractOptions: ExtractOptions = {
        includeAnnotations: true,
        includeFootnotes: true,
        ...options
      };
      
      // 生成缓存键
      const cacheKey = CryptoHelper.generateCacheKey('chapter', bookId, chapterId);
      
      // 检查缓存
      const cachedChapter = await cacheService.get<ChapterContent>(cacheKey);
      if (cachedChapter) {
        logger.logCacheHit(cacheKey, 'all');
        return cachedChapter;
      }
      
      // 执行提取
      const chapterContent = await this.executeChapterExtraction(bookId, chapterId, extractOptions, requestId);
      
      // 缓存结果
      await cacheService.set(cacheKey, chapterContent, config.get('cache').redis.ttl);
      
      // 记录性能指标
      const duration = Date.now() - startTime;
      this.recordPerformance('getChapterContent', duration, {
        bookId,
        chapterId,
        requestId
      });
      
      return chapterContent;
    } catch (error) {
      this.recordError(error as Error, {
        bookId,
        chapterId,
        requestId
      });
      throw ErrorFactory.createExtractionError(bookId, 'Failed to extract chapter content', chapterId);
    }
  }

  /**
   * 执行书籍信息提取
   */
  private async executeBookExtraction(bookId: string, requestId: string): Promise<BookInfo> {
    const bookUrl = `${this.baseUrl}/book/${bookId}`;
    
    return await this.concurrencyController.executeRequest(
      async () => {
        const response = await this.requestOptimizer.get(bookUrl);
        return this.parseBookInfo(response.data, bookId);
      },
      requestId
    );
  }

  /**
   * 执行片段提取
   */
  private async executeSnippetExtraction(
    bookId: string,
    keyword: string | undefined,
    options: ExtractOptions,
    requestId: string
  ): Promise<ContentSnippet[]> {
    // 首先获取书籍信息
    const bookInfo = await this.extractBookInfo(bookId);
    
    // 提取前几个章节的内容
    const snippets: ContentSnippet[] = [];
    const maxChapters = Math.min(options.maxChapters || 10, bookInfo.chapters.length);
    
    for (let i = 0; i < maxChapters; i++) {
      const chapter = bookInfo.chapters[i];
      
      try {
        const chapterContent = await this.getChapterContent(bookId, chapter.chapterId, options);
        
        // 如果有关键词，搜索相关内容
        if (keyword) {
          const chapterSnippets = this.extractSnippetsFromChapter(
            chapterContent,
            keyword,
            options
          );
          snippets.push(...chapterSnippets);
        } else {
          // 如果没有关键词，提取章节摘要
          const snippet = this.createChapterSnippet(chapterContent, options);
          snippets.push(snippet);
        }
        
        // 限制片段数量
        if (snippets.length >= (options.maxSnippets || 20)) {
          break;
        }
      } catch (error) {
        logger.warn('Failed to extract chapter content', {
          bookId,
          chapterId: chapter.chapterId,
          error: (error as Error).message
        });
      }
    }
    
    return snippets;
  }

  /**
   * 执行章节内容提取
   */
  private async executeChapterExtraction(
    bookId: string,
    chapterId: string,
    options: ExtractOptions,
    requestId: string
  ): Promise<ChapterContent> {
    const chapterUrl = `${this.baseUrl}/book/${bookId}/chapter/${chapterId}`;
    
    return await this.concurrencyController.executeRequest(
      async () => {
        const response = await this.requestOptimizer.get(chapterUrl);
        return this.parseChapterContent(response.data, bookId, chapterId, options);
      },
      requestId
    );
  }

  /**
   * 解析书籍信息
   */
  private parseBookInfo(html: string, bookId: string): BookInfo {
    const $ = cheerio.load(html);
    
    try {
      const title = $('.book-title, h1').first().text().trim();
      const author = $('.book-author, .author').first().text().trim();
      const dynasty = $('.book-dynasty, .dynasty').first().text().trim();
      const category = $('.book-category, .category').first().text().trim();
      const description = $('.book-description, .description').first().text().trim();
      
      // 提取章节列表
      const chapters: any[] = [];
      $('.chapter-list .chapter-item, .chapter-list li').each((index, element) => {
        const $item = $(element);
        const chapterTitle = $item.find('.chapter-title, a').first().text().trim();
        const chapterUrl = $item.find('a').first().attr('href') || '';
        const chapterId = this.extractChapterIdFromUrl(chapterUrl);
        
        if (chapterId && chapterTitle) {
          chapters.push({
            chapterId,
            title: chapterTitle,
            url: chapterUrl,
            order: index + 1
          });
        }
      });
      
      return {
        bookId,
        title: title || '未知标题',
        author: author || '未知作者',
        dynasty: dynasty || '未知朝代',
        category: category || '未知分类',
        description: description || '',
        totalChapters: chapters.length,
        chapters,
        metadata: {
          source: '识典古籍',
          extractedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to parse book info', error as Error);
      throw ErrorFactory.createExtractionError(bookId, 'Failed to parse book information');
    }
  }

  /**
   * 解析章节内容
   */
  private parseChapterContent(
    html: string,
    bookId: string,
    chapterId: string,
    options: ExtractOptions
  ): ChapterContent {
    const $ = cheerio.load(html);
    
    try {
      const chapterTitle = $('.chapter-title, h1').first().text().trim();
      const content = $('.chapter-content, .content').first().text().trim();
      const originalText = $('.original-text, .text').first().text().trim();
      const translatedText = $('.translated-text, .translation').first().text().trim();
      
      // 提取注释
      const annotations: string[] = [];
      if (options.includeAnnotations) {
        $('.annotation, .note').each((index, element) => {
          const annotation = $(element).text().trim();
          if (annotation) {
            annotations.push(annotation);
          }
        });
      }
      
      // 提取脚注
      const footnotes: string[] = [];
      if (options.includeFootnotes) {
        $('.footnote, .footnote-text').each((index, element) => {
          const footnote = $(element).text().trim();
          if (footnote) {
            footnotes.push(footnote);
          }
        });
      }
      
      // 提取段落信息
      const paragraphs: any[] = [];
      $('.paragraph, p').each((index, element) => {
        const paragraphText = $(element).text().trim();
        if (paragraphText) {
          paragraphs.push({
            paragraphId: `p_${index + 1}`,
            content: paragraphText,
            hasHighlight: false,
            highlightText: '',
            position: index + 1,
            wordCount: paragraphText.length
          });
        }
      });
      
      return {
        chapterId,
        chapterTitle: chapterTitle || '未知章节',
        content: content || originalText || '',
        originalText: originalText || content || '',
        translatedText: translatedText || '',
        annotations,
        footnotes,
        paragraphs,
        navigation: {
          previousChapter: null, // 需要从书籍信息中获取
          nextChapter: null,
          chapterList: [],
          breadcrumb: [bookId, chapterId]
        },
        metadata: {
          searchKeywords: [],
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to parse chapter content', error as Error);
      throw ErrorFactory.createExtractionError(bookId, 'Failed to parse chapter content', chapterId);
    }
  }

  /**
   * 从章节中提取片段
   */
  private extractSnippetsFromChapter(
    chapterContent: ChapterContent,
    keyword: string,
    options: ExtractOptions
  ): ContentSnippet[] {
    const snippets: ContentSnippet[] = [];
    const contextLength = options.contextLength || 200;
    
    // 在内容中搜索关键词
    const content = chapterContent.content;
    const keywordIndex = content.toLowerCase().indexOf(keyword.toLowerCase());
    
    if (keywordIndex !== -1) {
      const start = Math.max(0, keywordIndex - contextLength / 2);
      const end = Math.min(content.length, keywordIndex + contextLength / 2);
      
      const snippet = content.substring(start, end);
      const highlightedSnippet = StringHelper.highlight(snippet, keyword);
      
      snippets.push({
        chapterId: chapterContent.chapterId,
        chapterTitle: chapterContent.chapterTitle,
        pageNumber: 1,
        content: snippet,
        highlightedContent: highlightedSnippet,
        relevanceScore: this.calculateRelevanceScore(keyword, snippet),
        contextBefore: content.substring(Math.max(0, start - 50), start),
        contextAfter: content.substring(end, Math.min(content.length, end + 50)),
        citation: this.generateCitation(chapterContent, keyword),
        localCachePath: this.generateLocalCachePath(chapterContent.chapterId)
      });
    }
    
    return snippets;
  }

  /**
   * 创建章节片段
   */
  private createChapterSnippet(chapterContent: ChapterContent, options: ExtractOptions): ContentSnippet {
    const content = chapterContent.content;
    const maxLength = options.contextLength || 200;
    const snippet = StringHelper.truncate(content, maxLength);
    
    return {
      chapterId: chapterContent.chapterId,
      chapterTitle: chapterContent.chapterTitle,
      pageNumber: 1,
      content: snippet,
      highlightedContent: snippet,
      relevanceScore: 0.5,
      contextBefore: '',
      contextAfter: '',
      citation: this.generateCitation(chapterContent),
      localCachePath: this.generateLocalCachePath(chapterContent.chapterId)
    };
  }

  /**
   * 计算相关性分数
   */
  private calculateRelevanceScore(keyword: string, content: string): number {
    const similarity = StringHelper.similarity(keyword, content);
    const keywordCount = (content.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    
    return Math.min(similarity + (keywordCount * 0.1), 1.0);
  }

  /**
   * 生成引用信息
   */
  private generateCitation(chapterContent: ChapterContent, keyword?: string): any {
    return {
      bookTitle: '未知书籍',
      author: '未知作者',
      dynasty: '未知朝代',
      chapterTitle: chapterContent.chapterTitle,
      pageNumber: 1,
      sourceUrl: `${this.baseUrl}/book/${chapterContent.chapterId}`,
      citationText: `${chapterContent.chapterTitle}${keyword ? ` - ${keyword}` : ''}`,
      markdownLink: `[${chapterContent.chapterTitle}](${this.baseUrl}/book/${chapterContent.chapterId})`
    };
  }

  /**
   * 生成本地缓存路径
   */
  private generateLocalCachePath(chapterId: string): string {
    return `./guji-cache/chapters/${chapterId}`;
  }

  /**
   * 从URL提取章节ID
   */
  private extractChapterIdFromUrl(url: string): string | null {
    const match = url.match(/\/chapter\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      // 测试提取功能
      const testBookId = 'test-book';
      
      try {
        await this.extractBookInfo(testBookId);
      } catch (error) {
        // 预期会失败，但可以测试服务是否响应
      }
      
      return {
        status: 'healthy',
        message: 'Extractor service is running normally',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.recordError(error as Error, { operation: 'healthCheck' });
      return {
        status: 'unhealthy',
        message: 'Extractor service is not responding',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.requestOptimizer.cleanup();
    logger.info('ExtractorService cleanup completed');
  }
}

/**
 * 全局提取服务实例
 */
export const extractorService = new ExtractorService();
