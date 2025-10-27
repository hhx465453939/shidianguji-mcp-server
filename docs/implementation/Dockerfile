# 多阶段构建Dockerfile
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S guji -u 1001

# 复制package文件
COPY package*.json ./

# 安装依赖
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# 开发阶段
FROM base AS development
RUN npm ci
COPY . .
USER guji
EXPOSE 3000
CMD ["npm", "run", "dev"]

# 构建阶段
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段
FROM base AS production

# 复制生产依赖
COPY --from=dependencies /app/node_modules ./node_modules

# 复制构建产物
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# 复制配置文件
COPY config/ ./config/

# 创建日志目录
RUN mkdir -p logs && chown -R guji:nodejs logs

# 切换到非root用户
USER guji

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 暴露端口
EXPOSE 3000

# 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
