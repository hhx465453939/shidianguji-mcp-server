import { Router } from 'express';
import { BookController } from '@/controllers/BookController';
import { ErrorHandler } from '@/core/ErrorHandler';

/**
 * 书籍路由
 */
const router = Router();

/**
 * @route GET /api/books/:bookId
 * @desc 获取书籍信息
 * @access Public
 */
router.get('/:bookId', BookController.getBookInfo);

/**
 * @route GET /api/books/:bookId/chapters
 * @desc 获取书籍章节列表
 * @access Public
 */
router.get('/:bookId/chapters', BookController.getBookChapters);

/**
 * @route GET /api/books/:bookId/chapters/:chapterId
 * @desc 获取章节内容
 * @access Public
 */
router.get('/:bookId/chapters/:chapterId', BookController.getChapterContent);

/**
 * @route GET /api/books/:bookId/snippets
 * @desc 提取内容片段
 * @access Public
 */
router.get('/:bookId/snippets', BookController.extractContentSnippets);

/**
 * @route GET /api/books/:bookId/stats
 * @desc 获取书籍统计信息
 * @access Public
 */
router.get('/:bookId/stats', BookController.getBookStats);

export default router;
