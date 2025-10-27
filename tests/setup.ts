/**
 * 测试环境设置
 */

import { config } from '@/config';

// 设置测试环境
process.env.NODE_ENV = 'test';

// 设置测试配置
process.env.LOG_LEVEL = 'error';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.SHIDIANGUJI_BASE_URL = 'https://www.shidianguji.com';

// 清理控制台输出
console.log = jest.fn();
console.warn = jest.fn();
console.error = jest.fn();

// 设置测试超时
jest.setTimeout(30000);

// 全局测试钩子
beforeAll(async () => {
  // 测试前的全局设置
});

afterAll(async () => {
  // 测试后的全局清理
});

beforeEach(() => {
  // 每个测试前的设置
});

afterEach(() => {
  // 每个测试后的清理
  jest.clearAllMocks();
});
