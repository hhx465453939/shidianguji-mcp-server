# 快速开始指南

## 简介

古籍MCP服务器是一个基于Node.js和TypeScript的现代化古籍知识检索服务，为AI助手提供强大的古籍内容搜索、提取和分析能力。

## 特性

- 🚀 **高性能**: 基于V8引擎，比Python版本快3-5倍
- 🔍 **智能搜索**: 支持关键词、分类、朝代等多维度搜索
- 📚 **内容提取**: 精确提取古籍内容片段和上下文
- 🧠 **AI集成**: 完整的MCP协议支持
- 💾 **双重缓存**: 内存+Redis+本地文件缓存
- 🛡️ **反爬策略**: 智能请求控制和速率限制
- 📊 **监控日志**: Prometheus指标和结构化日志
- 🐳 **容器化**: Docker和Kubernetes支持

## 安装

### 环境要求

- Node.js 18+
- npm 8+
- Redis 6+
- TypeScript 5+

### 1. 克隆项目

```bash
git clone https://github.com/your-username/guji-mcp-server-node.git
cd guji-mcp-server-node
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境

```bash
cp env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：

```env
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
SHIDIANGUJI_BASE_URL=https://www.shidianguji.com
LOG_LEVEL=info
```

### 4. 启动Redis

```bash
# 使用Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 或使用本地安装
redis-server
```

## 运行

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm run build
npm start
```

### 使用Docker

```bash
# 构建镜像
docker build -t guji-mcp-server .

# 运行容器
docker run -d \
  --name guji-mcp-server \
  -p 3000:3000 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  guji-mcp-server
```

### 使用Docker Compose

```bash
docker-compose up -d
```

## 使用示例

### 1. 搜索古籍内容

```bash
curl "http://localhost:3000/api/search?keyword=论语&limit=5"
```

响应：
```json
{
  "success": true,
  "data": {
    "success": true,
    "totalResults": 100,
    "returnedResults": 5,
    "searchTime": 1234,
    "results": [
      {
        "bookId": "LUNYU",
        "title": "论语",
        "author": "孔子",
        "dynasty": "春秋",
        "category": "经部",
        "snippet": "学而时习之，不亦说乎？",
        "relevanceScore": 0.95
      }
    ]
  }
}
```

### 2. 获取书籍信息

```bash
curl "http://localhost:3000/api/books/LUNYU"
```

### 3. 提取内容片段

```bash
curl "http://localhost:3000/api/books/LUNYU/snippets?keyword=学而"
```

### 4. 获取章节内容

```bash
curl "http://localhost:3000/api/books/LUNYU/chapters/1"
```

## MCP协议使用

### 1. 启动MCP服务器

```bash
npm run mcp
```

### 2. 在AI助手中使用

```python
# Python示例
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    async with stdio_client(StdioServerParameters(
        command="node",
        args=["dist/index.js"]
    )) as (read, write):
        async with ClientSession(read, write) as session:
            # 搜索古籍
            result = await session.call_tool(
                "search_ancient_texts",
                {"keyword": "论语", "limit": 10}
            )
            print(result)
```

## API文档

### 搜索API

- `GET /api/search` - 搜索古籍内容
- `GET /api/search/suggestions` - 获取搜索建议
- `GET /api/search/popular` - 获取热门搜索

### 书籍API

- `GET /api/books/:bookId` - 获取书籍信息
- `GET /api/books/:bookId/chapters` - 获取章节列表
- `GET /api/books/:bookId/chapters/:chapterId` - 获取章节内容
- `GET /api/books/:bookId/snippets` - 提取内容片段
- `GET /api/books/:bookId/stats` - 获取书籍统计

### 健康检查API

- `GET /api/health` - 基础健康检查
- `GET /api/health/detailed` - 详细健康检查
- `GET /api/metrics` - 系统指标
- `GET /api/info` - 服务信息

## 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 服务端口 | `3000` |
| `REDIS_URL` | Redis连接URL | `redis://localhost:6379` |
| `SHIDIANGUJI_BASE_URL` | 识典古籍网站URL | `https://www.shidianguji.com` |
| `LOG_LEVEL` | 日志级别 | `info` |

### 配置文件

项目支持JSON配置文件，位于 `config/` 目录：

- `development.json` - 开发环境配置
- `production.json` - 生产环境配置

## 监控和日志

### 健康检查

访问 `http://localhost:3000/api/health` 查看服务状态。

### 指标监控

访问 `http://localhost:3000/api/metrics` 查看系统指标。

### 日志文件

日志文件位于 `logs/` 目录：

- `combined.log` - 综合日志
- `error.log` - 错误日志

## 故障排除

### 常见问题

1. **Redis连接失败**
   - 检查Redis服务是否运行
   - 验证REDIS_URL配置

2. **搜索超时**
   - 检查网络连接
   - 调整超时配置

3. **内存不足**
   - 调整Node.js内存限制
   - 优化缓存配置

### 调试模式

```bash
DEBUG=* npm run dev
```

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License
