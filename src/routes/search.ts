import { Router } from 'express';
import { SearchController } from '@/controllers/SearchController';
import { ErrorHandler } from '@/core/ErrorHandler';

/**
 * 搜索路由
 */
const router = Router();

/**
 * @route GET /api/search
 * @desc 搜索古籍内容
 * @access Public
 */
router.get('/', SearchController.search);

/**
 * @route GET /api/search/suggestions
 * @desc 获取搜索建议
 * @access Public
 */
router.get('/suggestions', SearchController.getSuggestions);

/**
 * @route GET /api/search/popular
 * @desc 获取热门搜索
 * @access Public
 */
router.get('/popular', SearchController.getPopularSearches);

export default router;
