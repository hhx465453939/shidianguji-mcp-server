import { Router } from 'express';
import { HealthController } from '@/controllers/HealthController';
import { ErrorHandler } from '@/core/ErrorHandler';

/**
 * 健康检查路由
 */
const router = Router();

/**
 * @route GET /api/health
 * @desc 基础健康检查
 * @access Public
 */
router.get('/', HealthController.health);

/**
 * @route GET /api/health/detailed
 * @desc 详细健康检查
 * @access Public
 */
router.get('/detailed', HealthController.healthDetailed);

/**
 * @route GET /api/metrics
 * @desc 获取系统指标
 * @access Public
 */
router.get('/metrics', HealthController.metrics);

/**
 * @route GET /api/info
 * @desc 获取服务信息
 * @access Public
 */
router.get('/info', HealthController.info);

export default router;
