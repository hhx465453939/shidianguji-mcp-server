import { BaseService } from '@/core/BaseService';
import { RequestOptimizer } from '@/core/RequestOptimizer';
import { ConcurrencyController } from '@/core/ConcurrencyController';
import { cacheService } from './CacheService';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { SearchParams, SearchResult, SearchResultItem } from '@/types/guji';
import { SearchError, ErrorFactory } from '@/types/errors';
import { CryptoHelper } from '@/utils/crypto';
import { StringHelper } from '@/utils/string';
import * as cheerio from 'cheerio';

/**
 * 搜索服务
 * 负责从识典古籍网站搜索古籍内容
 */
export class SearchService extends BaseService {
  private readonly requestOptimizer: RequestOptimizer;
  private readonly concurrencyController: ConcurrencyController;
  private readonly baseUrl: string;
  private readonly searchUrlTemplate: string;

  constructor() {
    super('SearchService');
    
    this.baseUrl = config.get('scraper').baseUrl;
    this.searchUrlTemplate = config.get('scraper').searchUrlTemplate;
    
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
   * 搜索古籍内容
   */
  async search(params: SearchParams): Promise<SearchResult> {
    const startTime = Date.now();
    const requestId = CryptoHelper.generateRequestId();
    
    try {
      // 验证参数
      this.validateSearchParams(params);
      
      // 生成缓存键
      const cacheKey = this.generateCacheKey(params);
      
      // 检查缓存
      const cachedResult = await cacheService.get<SearchResult>(cacheKey);
      if (cachedResult) {
        logger.logCacheHit(cacheKey, 'all');
        return cachedResult;
      }
      
      // 执行搜索
      const result = await this.executeSearch(params, requestId);
      
      // 缓存结果
      await cacheService.set(cacheKey, result, config.get('cache').search.ttl);
      
      // 记录性能指标
      const duration = Date.now() - startTime;
      this.recordPerformance('search', duration, {
        keyword: params.keyword,
        resultsCount: result.totalResults,
        requestId
      });
      
      return result;
    } catch (error) {
      this.recordError(error as Error, {
        keyword: params.keyword,
        requestId
      });
      throw ErrorFactory.createSearchError(params.keyword, 'Search operation failed');
    }
  }

  /**
   * 执行搜索操作
   */
  private async executeSearch(params: SearchParams, requestId: string): Promise<SearchResult> {
    const searchUrl = this.buildSearchUrl(params);
    
    return await this.concurrencyController.executeRequest(
      async () => {
        const response = await this.requestOptimizer.get(searchUrl);
        return this.parseSearchResponse(response.data, params);
      },
      requestId
    );
  }

  /**
   * 构建搜索URL
   */
  private buildSearchUrl(params: SearchParams): string {
    const urlParams = new URLSearchParams();
    
    // 基本搜索参数
    urlParams.set('keywords', params.keyword);
    
    if (params.bookName) {
      urlParams.set('bookName', params.bookName);
    }
    
    if (params.author) {
      urlParams.set('author', params.author);
    }
    
    if (params.category) {
      urlParams.set('category', params.category);
    }
    
    if (params.dynasty) {
      urlParams.set('dynasty', params.dynasty);
    }
    
    // 分页参数
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    urlParams.set('page', page.toString());
    urlParams.set('pageSize', pageSize.toString());
    
    // 排序参数
    if (params.sortBy) {
      urlParams.set('sortBy', params.sortBy);
    }
    
    if (params.sortOrder) {
      urlParams.set('sortOrder', params.sortOrder);
    }
    
    // 其他参数
    urlParams.set('page_from', 'home_page');
    urlParams.set('source', 'PC');
    
    return `${this.baseUrl}/search?${urlParams.toString()}`;
  }

  /**
   * 解析搜索响应
   */
  private parseSearchResponse(html: string, params: SearchParams): SearchResult {
    const $ = cheerio.load(html);
    const results: SearchResultItem[] = [];
    
    try {
      // 解析搜索结果列表
      $('.search-result-item').each((index, element) => {
        const $item = $(element);
        
        const bookId = this.extractBookId($item);
        const title = this.extractTitle($item);
        const author = this.extractAuthor($item);
        const dynasty = this.extractDynasty($item);
        const category = this.extractCategory($item);
        const snippet = this.extractSnippet($item);
        const chapterUrl = this.extractChapterUrl($item);
        const bookUrl = this.extractBookUrl($item);
        const relevanceScore = this.calculateRelevanceScore(params.keyword, title, snippet);
        
        if (bookId && title) {
          results.push({
            bookId,
            title,
            author: author || '未知',
            dynasty: dynasty || '未知',
            category: category || '未知',
            snippet: snippet || '',
            chapterUrl: chapterUrl || '',
            bookUrl: bookUrl || '',
            relevanceScore,
            source: '识典古籍',
            citation: this.generateCitation(bookId, title, author, dynasty),
            localCachePath: this.generateLocalCachePath(bookId)
          });
        }
      });
      
      // 解析分页信息
      const totalResults = this.extractTotalResults($);
      const currentPage = params.page || 1;
      const pageSize = params.pageSize || 20;
      const totalPages = Math.ceil(totalResults / pageSize);
      
      // 排序结果
      const sortedResults = this.sortResults(results, params.sortBy, params.sortOrder);
      
      // 限制结果数量
      const limitedResults = sortedResults.slice(0, params.limit || 20);
      
      return {
        success: true,
        totalResults,
        returnedResults: limitedResults.length,
        searchTime: Date.now(),
        results: limitedResults,
        pagination: {
          currentPage,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      };
    } catch (error) {
      logger.error('Failed to parse search response', error as Error);
      throw ErrorFactory.createSearchError(params.keyword, 'Failed to parse search results');
    }
  }

  /**
   * 提取书籍ID
   */
  private extractBookId($item: cheerio.Cheerio<cheerio.Element>): string | null {
    const bookUrl = $item.find('a[href*="/book/"]').attr('href');
    if (bookUrl) {
      const match = bookUrl.match(/\/book\/([^\/]+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  /**
   * 提取标题
   */
  private extractTitle($item: cheerio.Cheerio<cheerio.Element>): string | null {
    return $item.find('.book-title, .title, h3').first().text().trim() || null;
  }

  /**
   * 提取作者
   */
  private extractAuthor($item: cheerio.Cheerio<cheerio.Element>): string | null {
    return $item.find('.author, .book-author').first().text().trim() || null;
  }

  /**
   * 提取朝代
   */
  private extractDynasty($item: cheerio.Cheerio<cheerio.Element>): string | null {
    return $item.find('.dynasty, .book-dynasty').first().text().trim() || null;
  }

  /**
   * 提取分类
   */
  private extractCategory($item: cheerio.Cheerio<cheerio.Element>): string | null {
    return $item.find('.category, .book-category').first().text().trim() || null;
  }

  /**
   * 提取摘要
   */
  private extractSnippet($item: cheerio.Cheerio<cheerio.Element>): string | null {
    return $item.find('.snippet, .book-snippet, .description').first().text().trim() || null;
  }

  /**
   * 提取章节URL
   */
  private extractChapterUrl($item: cheerio.Cheerio<cheerio.Element>): string | null {
    return $item.find('a[href*="/chapter/"]').attr('href') || null;
  }

  /**
   * 提取书籍URL
   */
  private extractBookUrl($item: cheerio.Cheerio<cheerio.Element>): string | null {
    return $item.find('a[href*="/book/"]').attr('href') || null;
  }

  /**
   * 提取总结果数
   */
  private extractTotalResults($: cheerio.CheerioAPI): number {
    const totalText = $('.total-results, .search-count').first().text();
    const match = totalText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 计算相关性分数
   */
  private calculateRelevanceScore(keyword: string, title: string, snippet: string): number {
    let score = 0;
    
    // 标题匹配权重更高
    if (title.toLowerCase().includes(keyword.toLowerCase())) {
      score += 0.7;
    }
    
    // 摘要匹配
    if (snippet.toLowerCase().includes(keyword.toLowerCase())) {
      score += 0.3;
    }
    
    // 关键词相似度
    const titleSimilarity = StringHelper.similarity(keyword, title);
    const snippetSimilarity = StringHelper.similarity(keyword, snippet);
    
    score += titleSimilarity * 0.4;
    score += snippetSimilarity * 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * 排序结果
   */
  private sortResults(
    results: SearchResultItem[],
    sortBy?: string,
    sortOrder?: string
  ): SearchResultItem[] {
    if (!sortBy) return results;
    
    const order = sortOrder === 'asc' ? 1 : -1;
    
    return results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author':
          comparison = a.author.localeCompare(b.author);
          break;
        case 'dynasty':
          comparison = a.dynasty.localeCompare(b.dynasty);
          break;
        default:
          comparison = 0;
      }
      
      return comparison * order;
    });
  }

  /**
   * 生成引用信息
   */
  private generateCitation(bookId: string, title: string, author: string, dynasty: string): any {
    return {
      bookTitle: title,
      author,
      dynasty,
      chapterTitle: '搜索结果',
      pageNumber: 1,
      sourceUrl: `${this.baseUrl}/book/${bookId}`,
      citationText: `${title}，${author}，${dynasty}`,
      markdownLink: `[${title}](${this.baseUrl}/book/${bookId})`
    };
  }

  /**
   * 生成本地缓存路径
   */
  private generateLocalCachePath(bookId: string): string {
    return `./guji-cache/books/${bookId}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(params: SearchParams): string {
    const keyData = {
      keyword: params.keyword,
      category: params.category,
      dynasty: params.dynasty,
      author: params.author,
      page: params.page,
      pageSize: params.pageSize,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder
    };
    
    return CryptoHelper.generateCacheKey('search', JSON.stringify(keyData));
  }

  /**
   * 验证搜索参数
   */
  private validateSearchParams(params: SearchParams): void {
    if (!params.keyword || params.keyword.trim().length === 0) {
      throw ErrorFactory.createValidationError('keyword', '搜索关键词不能为空');
    }
    
    if (params.keyword.length > 100) {
      throw ErrorFactory.createValidationError('keyword', '搜索关键词不能超过100个字符');
    }
    
    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      throw ErrorFactory.createValidationError('limit', '结果数量限制必须在1-100之间');
    }
    
    if (params.page && params.page < 1) {
      throw ErrorFactory.createValidationError('page', '页码必须大于0');
    }
    
    if (params.pageSize && (params.pageSize < 1 || params.pageSize > 100)) {
      throw ErrorFactory.createValidationError('pageSize', '每页大小必须在1-100之间');
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      // 测试搜索功能
      const testParams: SearchParams = {
        keyword: '测试',
        limit: 1
      };
      
      await this.search(testParams);
      
      return {
        status: 'healthy',
        message: 'Search service is running normally',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.recordError(error as Error, { operation: 'healthCheck' });
      return {
        status: 'unhealthy',
        message: 'Search service is not responding',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    await this.requestOptimizer.cleanup();
    logger.info('SearchService cleanup completed');
  }
}

/**
 * 全局搜索服务实例
 */
export const searchService = new SearchService();
