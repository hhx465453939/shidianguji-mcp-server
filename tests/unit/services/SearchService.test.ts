import { SearchService } from '@/services/SearchService';
import { SearchParams } from '@/types/guji';

// Mock the dependencies
jest.mock('@/services/CacheService');
jest.mock('@/core/RequestOptimizer');
jest.mock('@/core/ConcurrencyController');

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService();
  });

  afterEach(async () => {
    await searchService.cleanup();
  });

  describe('search', () => {
    it('should validate search parameters', async () => {
      const invalidParams = {
        keyword: '', // Empty keyword should fail
        limit: 200 // Exceeds maximum limit
      };

      await expect(searchService.search(invalidParams as SearchParams))
        .rejects.toThrow();
    });

    it('should accept valid search parameters', async () => {
      const validParams: SearchParams = {
        keyword: '论语',
        limit: 20,
        page: 1,
        pageSize: 20
      };

      // Mock the search execution to avoid actual HTTP requests
      jest.spyOn(searchService as any, 'executeSearch').mockResolvedValue({
        success: true,
        totalResults: 10,
        returnedResults: 10,
        searchTime: Date.now(),
        results: []
      });

      const result = await searchService.search(validParams);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('totalResults');
      expect(result).toHaveProperty('results');
    });

    it('should handle search with different categories', async () => {
      const params: SearchParams = {
        keyword: '道德经',
        category: '子部',
        dynasty: '春秋',
        author: '老子'
      };

      jest.spyOn(searchService as any, 'executeSearch').mockResolvedValue({
        success: true,
        totalResults: 5,
        returnedResults: 5,
        searchTime: Date.now(),
        results: []
      });

      const result = await searchService.search(params);

      expect(result.success).toBe(true);
    });
  });

  describe('buildSearchUrl', () => {
    it('should build correct search URL', () => {
      const params: SearchParams = {
        keyword: '测试',
        category: '经部',
        page: 2,
        pageSize: 10
      };

      const url = (searchService as any).buildSearchUrl(params);

      expect(url).toContain('keywords=测试');
      expect(url).toContain('category=经部');
      expect(url).toContain('page=2');
      expect(url).toContain('pageSize=10');
    });
  });

  describe('parseSearchResponse', () => {
    it('should parse search response correctly', () => {
      const mockHtml = `
        <div class="search-result-item">
          <h3 class="book-title">论语</h3>
          <div class="book-author">孔子</div>
          <div class="book-dynasty">春秋</div>
          <div class="book-category">经部</div>
          <div class="snippet">学而时习之，不亦说乎？</div>
          <a href="/book/LUNYU">查看详情</a>
        </div>
      `;

      const params: SearchParams = {
        keyword: '论语'
      };

      const result = (searchService as any).parseSearchResponse(mockHtml, params);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('totalResults');
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should calculate relevance score correctly', () => {
      const keyword = '论语';
      const title = '论语·学而';
      const snippet = '学而时习之，不亦说乎？';

      const score = (searchService as any).calculateRelevanceScore(keyword, title, snippet);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await searchService.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('message');
      expect(health).toHaveProperty('timestamp');
      expect(['healthy', 'unhealthy']).toContain(health.status);
    });
  });
});
