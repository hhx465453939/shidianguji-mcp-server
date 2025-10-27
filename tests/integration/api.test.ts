import request from 'supertest';
import { createApp } from '@/app';

// Mock the services to avoid actual HTTP requests
jest.mock('@/services/SearchService');
jest.mock('@/services/ExtractorService');
jest.mock('@/services/CacheService');

describe('API Integration Tests', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  describe('Health Endpoints', () => {
    it('GET /api/health should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
    });

    it('GET /api/health/detailed should return detailed health status', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data.services).toHaveProperty('mcp');
      expect(response.body.data.services).toHaveProperty('search');
      expect(response.body.data.services).toHaveProperty('extractor');
      expect(response.body.data.services).toHaveProperty('cache');
    });

    it('GET /api/metrics should return system metrics', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('cpu');
      expect(response.body.data).toHaveProperty('system');
    });

    it('GET /api/info should return service information', async () => {
      const response = await request(app)
        .get('/api/info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('capabilities');
      expect(response.body.data).toHaveProperty('tools');
    });
  });

  describe('Search Endpoints', () => {
    it('GET /api/search should handle search requests', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ keyword: '论语' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success');
      expect(response.body.data).toHaveProperty('totalResults');
      expect(response.body.data).toHaveProperty('results');
    });

    it('GET /api/search/suggestions should return suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions')
        .query({ keyword: '论语' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /api/search/popular should return popular searches', async () => {
      const response = await request(app)
        .get('/api/search/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Book Endpoints', () => {
    it('GET /api/books/:bookId should return book info', async () => {
      const response = await request(app)
        .get('/api/books/LUNYU')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bookId');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('author');
    });

    it('GET /api/books/:bookId/chapters should return chapters', async () => {
      const response = await request(app)
        .get('/api/books/LUNYU/chapters')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /api/books/:bookId/chapters/:chapterId should return chapter content', async () => {
      const response = await request(app)
        .get('/api/books/LUNYU/chapters/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('chapterId');
      expect(response.body.data).toHaveProperty('chapterTitle');
      expect(response.body.data).toHaveProperty('content');
    });

    it('GET /api/books/:bookId/snippets should return content snippets', async () => {
      const response = await request(app)
        .get('/api/books/LUNYU/snippets')
        .query({ keyword: '学而' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /api/books/:bookId/stats should return book statistics', async () => {
      const response = await request(app)
        .get('/api/books/LUNYU/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('bookId');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('totalChapters');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type', 'RESOURCE_NOT_FOUND');
    });

    it('should return 400 for invalid book ID format', async () => {
      const response = await request(app)
        .get('/api/books/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('type', 'VALIDATION_ERROR');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });
});
