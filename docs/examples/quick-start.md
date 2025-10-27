# 快速开始指南

## 1. 环境准备

### 1.1 系统要求

```bash
# 检查Node.js版本
node --version  # 需要 >= 18.0.0

# 检查npm版本
npm --version   # 需要 >= 8.0.0

# 检查Redis是否运行
redis-cli ping  # 应该返回 PONG
```

### 1.2 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd guji-mcp-server-node

# 安装依赖
npm install

# 或使用yarn
yarn install
```

## 2. 配置设置

### 2.1 环境变量配置

创建 `.env` 文件：

```bash
# 复制配置模板
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器配置
NODE_ENV=development
PORT=3000
HOST=localhost

# Redis配置
REDIS_URL=redis://localhost:6379

# 识典古籍网站配置
SHIDIANGUJI_BASE_URL=https://www.shidianguji.com
REQUEST_TIMEOUT=30000
REQUEST_DELAY=1000
MAX_RETRIES=3

# 缓存配置
CACHE_TTL=3600
MEMORY_CACHE_SIZE=100

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 监控配置
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 2.2 配置文件

创建 `config/development.json`：

```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "cors": {
      "origin": "*",
      "credentials": true
    }
  },
  "redis": {
    "url": "redis://localhost:6379",
    "ttl": 3600,
    "maxRetries": 3
  },
  "scraper": {
    "baseUrl": "https://www.shidianguji.com",
    "timeout": 30000,
    "retries": 3,
    "delay": 1000
  },
  "cache": {
    "memory": {
      "maxSize": 100,
      "ttl": 300
    },
    "redis": {
      "ttl": 3600
    }
  }
}
```

## 3. 开发环境启动

### 3.1 启动Redis

```bash
# 使用Docker启动Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 或使用本地Redis
redis-server
```

### 3.2 启动开发服务器

```bash
# 启动开发服务器（带热重载）
npm run dev

# 或使用yarn
yarn dev
```

### 3.3 验证服务

```bash
# 检查服务状态
curl http://localhost:3000/health

# 预期响应
{
  "status": "healthy",
  "timestamp": "2025-01-27T22:00:00Z",
  "uptime": 123.456,
  "memory": {
    "used": "45.2MB",
    "free": "2.1GB"
  }
}
```

## 4. 基础使用示例

### 4.1 搜索古籍内容

```typescript
// 使用curl测试
curl -X POST http://localhost:3000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "道",
    "category": "经部",
    "limit": 5
  }'
```

```typescript
// 使用JavaScript/TypeScript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000/api/v1'
});

async function searchAncientTexts() {
  try {
    const response = await client.post('/search', {
      keyword: '道',
      category: '经部',
      limit: 5
    });
    
    console.log('搜索结果:', response.data);
  } catch (error) {
    console.error('搜索失败:', error.message);
  }
}

searchAncientTexts();
```

### 4.2 提取书籍信息

```typescript
// 提取书籍详细信息
async function extractBookInfo() {
  try {
    const response = await client.post('/extract/book', {
      bookId: 'HY1523'
    });
    
    console.log('书籍信息:', response.data);
  } catch (error) {
    console.error('提取失败:', error.message);
  }
}

extractBookInfo();
```

### 4.3 提取内容片段

```typescript
// 提取包含关键词的内容片段
async function extractContentSnippets() {
  try {
    const response = await client.post('/extract/snippets', {
      bookId: 'HY1523',
      keyword: '皇极经世',
      contextLength: 300,
      maxSnippets: 5
    });
    
    console.log('内容片段:', response.data);
  } catch (error) {
    console.error('提取失败:', error.message);
  }
}

extractContentSnippets();
```

## 5. MCP客户端集成

### 5.1 Claude Desktop配置

编辑 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "guji-server": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/guji-mcp-server-node",
      "env": {
        "NODE_ENV": "production",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```

### 5.2 在Claude中使用

```
用户: 请搜索关于"道"的古籍内容

Claude: 我来为您搜索关于"道"的古籍内容...

[调用 search_ancient_texts 工具]
参数: {"keyword": "道", "limit": 10}

搜索结果:
1. 《道德经》- 老子 (先秦)
   内容片段: "道可道，非常道。名可名，非常名..."
   
2. 《庄子》- 庄子 (先秦)
   内容片段: "道者，万物之所由也..."
   
...更多结果
```

## 6. 测试和调试

### 6.1 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "search"

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

### 6.2 代码质量检查

```bash
# 运行ESLint检查
npm run lint

# 自动修复ESLint问题
npm run lint:fix

# 运行Prettier格式化
npm run format

# 类型检查
npm run type-check
```

### 6.3 调试模式

```bash
# 启动调试模式
npm run dev -- --inspect

# 或使用nodemon调试
nodemon --inspect --exec ts-node src/index.ts
```

在Chrome中打开 `chrome://inspect` 进行调试。

## 7. 生产环境部署

### 7.1 构建项目

```bash
# 构建生产版本
npm run build

# 检查构建结果
ls -la dist/
```

### 7.2 Docker部署

```bash
# 构建Docker镜像
npm run docker:build

# 运行Docker容器
npm run docker:run

# 使用Docker Compose
npm run docker:compose
```

### 7.3 环境变量配置

生产环境 `.env` 配置：

```env
NODE_ENV=production
PORT=3000
REDIS_URL=redis://redis:6379
LOG_LEVEL=warn
ENABLE_METRICS=true
```

## 8. 监控和日志

### 8.1 查看日志

```bash
# 查看实时日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 查看所有日志
tail -f logs/combined.log
```

### 8.2 性能监控

```bash
# 访问Prometheus指标
curl http://localhost:9090/metrics

# 访问健康检查
curl http://localhost:3000/health

# 访问性能指标
curl http://localhost:3000/metrics
```

### 8.3 Grafana仪表板

访问 `http://localhost:3001` 查看Grafana仪表板：
- 用户名: admin
- 密码: admin

## 9. 常见问题解决

### 9.1 Redis连接问题

```bash
# 检查Redis是否运行
redis-cli ping

# 重启Redis
docker restart redis

# 检查Redis日志
docker logs redis
```

### 9.2 端口冲突问题

```bash
# 检查端口占用
netstat -tulpn | grep :3000

# 杀死占用进程
kill -9 <PID>

# 或修改端口
export PORT=3001
npm start
```

### 9.3 内存不足问题

```bash
# 检查内存使用
free -h

# 增加Node.js内存限制
node --max-old-space-size=4096 dist/index.js
```

### 9.4 依赖安装问题

```bash
# 清理缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 或使用yarn
yarn install
```

## 10. 下一步

1. **阅读API文档**: 了解所有可用的API接口
2. **查看示例代码**: 学习更多使用场景
3. **自定义配置**: 根据需求调整配置
4. **集成测试**: 编写自动化测试
5. **性能优化**: 根据监控数据优化性能

## 11. 获取帮助

- **文档**: 查看 `docs/` 目录下的详细文档
- **示例**: 查看 `examples/` 目录下的示例代码
- **问题**: 在GitHub Issues中提问
- **讨论**: 加入项目讨论群

---

**恭喜！** 您已经成功启动了古籍MCP服务器。现在可以开始探索古籍知识的海洋了！ 🎉
