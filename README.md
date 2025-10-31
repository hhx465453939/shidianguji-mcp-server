# 识典古籍 MCP Server（Node.js/TypeScript）

面向 AI 助手的古籍知识检索与内容提取服务，支持 MCP（Model Context Protocol）工具调用，亦可作为可选的 HTTP API 服务运行。

- MCP 工具：搜索古籍、提取书籍信息、提取内容片段、获取章节内容、主题分析
- 性能与稳定：请求并发控制、缓存（内存/Redis/本地）、统一错误与日志、可观测性
- 部署形态：本地开发、Docker、Docker Compose、K8s（示例清单）

## 目录
- 快速开始
- 本地开发
- 环境与配置
- 运行模式（MCP / HTTP API）
- MCP 客户端与 IDE 集成
- Docker 与 Compose
- 测试与质量保障
- 监控与日志
- 常见问题

## 快速开始

```bash
# 克隆
git clone https://github.com/your-org/shidianguji-mcp-server.git
cd shidianguji-mcp-server

# 安装依赖（Node 18+）
npm install

# 准备环境变量
cp env.example .env

# 启动开发（MCP 标准 I/O 模式）
npm run dev
```

默认入口为 `src/index.ts`（MCP 标准 I/O 服务器）。

## 本地开发

- Node.js >= 18，npm >= 8
- Redis >= 6（建议 7）
- 可选：Docker / Docker Compose / K8s

启动 Redis（任选其一）：
```bash
# Docker 方式
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 本地安装
redis-server
```

常用脚本：
```bash
npm run dev          # ts-node + nodemon，开发（MCP 标准 I/O）
npm run build        # tsc 产物 + esbuild 打包入口
npm start            # 运行打包后的入口（dist/index.js）
npm test             # Jest
npm run lint         # ESLint
```

## 环境与配置

- 环境变量：复制 `env.example` 为 `.env` 并按需调整
- 配置文件：`config/development.json`、`config/production.json`

关键变量（示例）：
```env
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
SHIDIANGUJI_BASE_URL=https://www.shidianguji.com
LOG_LEVEL=info
```

配置加载入口：`src/config/index.ts`。

## 运行模式

### 1) MCP（标准 I/O，默认）
- 入口：`src/index.ts` → `MCPServer.start()` 使用 `StdioServerTransport`
- 构建后入口：`dist/index.js`

运行：
```bash
# 开发（ts-node）
npm run dev

# 生产（编译后）
npm run build
node dist/index.js
```

可用 MCP 工具参考：`docs/api/mcp-tools.md`，核心实现：`src/mcp/MCPServer.ts`。

### 2) HTTP API（可选）
工程内包含完整的 Express API（路由、控制器、服务），如需启动 HTTP 服务用于 REST 访问：

开发方式（ts-node）：
```bash
npx ts-node -e "require('./src/app').startHttpServer()"
```

生产方式（编译后）：
```bash
npm run build
node -e "require('./dist/app.js').startHttpServer()"
```

- 路由入口：`src/routes/index.ts`
- 示例端点：`/api/search`、`/api/books/:bookId`、`/api/health`
- 应与 `docker-compose.yml` 的健康检查与端口映射保持一致（见下）

> 注意：默认 `npm start` 仍然运行 MCP 标准 I/O。如需容器内运行 HTTP，请将容器启动命令调整为 `node -e "require('./dist/app.js').startHttpServer()"` 或在镜像中提供对应入口脚本。

## MCP 客户端与 IDE 集成

### Claude Desktop（Windows/macOS）
配置文件：
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

将本服务注册为 MCP 服务器（标准 I/O，命令示例为 Node 入口）：
```json
{
  "mcpServers": {
    "guji-mcp-server": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "REDIS_URL": "redis://localhost:6379",
        "LOG_LEVEL": "info"
      },
      "cwd": "D:/development/shidianguji-mcp-server"
    }
  }
}
```
- Windows 路径请按实际仓库位置修改 `cwd`
- 开发态也可用 `ts-node`：`"command": "npx", "args": ["ts-node", "src/index.ts"]`

启动 Claude Desktop 后，选择/启用该 MCP 服务器，即可在对话中调用 `search_ancient_texts` 等工具。

### Python（mcp 客户端）
```python
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

async def main():
    async with stdio_client(StdioServerParameters(
        command="node",
        args=["dist/index.js"]
    )) as (read, write):
        async with ClientSession(read, write) as session:
            result = await session.call_tool("search_ancient_texts", {"keyword": "论语", "limit": 5})
            print(result)
```

### Node（本地调用 MCP）
可参考 `docs/api/mcp-tools.md` 的参数与响应结构，在任意 MCP 客户端中调用。

## Docker 与 Compose

构建镜像：
```bash
npm run docker:build
```

快速启动（Compose，包含 Redis/Prometheus/Grafana/Nginx）：
```bash
docker-compose up -d
```

- 默认 `Dockerfile` 的 `CMD` 为 `node dist/index.js`（MCP 标准 I/O）
- `docker-compose.yml` 中的健康检查与 `3000` 端口针对 HTTP API，如需在容器中启用 HTTP：
  - 调整服务启动命令为：`node -e "require('/app/dist/app.js').startHttpServer()"`
  - 或自定义入口脚本以启动 HTTP 服务

> 如仅需 MCP（不暴露 HTTP），可删除/注释 Compose 内对 `/api/health` 的健康检查与端口映射。

## 测试与质量保障

```bash
npm test
npm run test:watch
npm run test:coverage
npm run lint
```
- 测试入口与配置：`jest.config.js`、`tests/setup.ts`
- 规则参考：`.cursor/rules/*`（项目结构、TS 规范、测试约定、工作流实践）

## 监控与日志
- Prometheus 与 Grafana：参考 `prometheus.yml`、`docker-compose.yml`
- Nginx 反向代理：参考 `nginx.conf`
- 日志目录：`logs/`

## 常见问题（FAQ）
- 无法连接 Redis：确认 `REDIS_URL` 与服务状态（容器或本地）
- HTTP 健康检查失败：若运行 MCP 模式，请取消 Compose 的 `/api/health` 健康检查或启用 HTTP 模式
- Claude 无法识别 MCP：检查 `claude_desktop_config.json` 的 `command/args/cwd` 路径，确保能执行 `node dist/index.js`

## 许可证
MIT
