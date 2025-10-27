import { Router } from 'express';
import searchRoutes from './search';
import bookRoutes from './books';
import healthRoutes from './health';

/**
 * 主路由
 */
const router = Router();

// 注册子路由
router.use('/search', searchRoutes);
router.use('/books', bookRoutes);
router.use('/health', healthRoutes);

export default router;
