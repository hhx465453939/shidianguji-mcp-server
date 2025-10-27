import request from 'supertest';
import express from 'express';
import { SearchController } from '@/controllers/SearchController';
import { searchService } from '@/services/SearchService';

// Mock the search service
jest.mock('@/services/SearchService');

const app = express();
app.use(express.json());
app.get('/search', SearchController.search);
app.get('/search/suggestions', SearchController.getSuggestions);
app.get('/search/popular', SearchController.getPopularSearches);

describe('SearchController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /search', () => {
    it('should return search results for valid parameters', async () => {
      const mockSearchResult = {
        success: true,
        totalResults: 10,
        returnedResults: 10,
        searchTime: Date.now(),
        results: [
          {
            bookId: 'LUNYU',
            title: '论语',
            author: '孔子',
            dynasty: '春秋',
            category: '经部',
            snippet: '学而时习之，不亦说乎？',
            chapterUrl: '/book/LUNYU/chapter/1',
            bookUrl: '/book/LUNYU',
            relevanceScore: 0.9,
            source: '识典古籍'
          }
        ]
      };

      (searchService.search as jest.Mock).mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get('/search')
        .query({ keyword: '论语' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResult);
      expect(searchService.search).toHaveBeenCalledWith({
        keyword: '论语',
        limit: 20,
        page: 1,
        pageSize: 20,
        sortBy: 'relevance',
        sortOrder: 'desc'
      });
    });

    it('should return 400 for invalid parameters', async () => {
      const response = await request(app)
        .get('/search')
        .query({ keyword: '' }) // Empty keyword should fail
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });

    it('should handle search service errors', async () => {
      (searchService.search as jest.Mock).mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/search')
        .query({ keyword: '论语' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('GET /search/suggestions', () => {
    it('should return search suggestions', async () => {
      const response = await request(app)
        .get('/search/suggestions')
        .query({ keyword: '论语' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 for missing keyword', async () => {
      const response = await request(app)
        .get('/search/suggestions')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /search/popular', () => {
    it('should return popular searches', async () => {
      const response = await request(app)
        .get('/search/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('keyword');
      expect(response.body.data[0]).toHaveProperty('count');
    });
  });
});
