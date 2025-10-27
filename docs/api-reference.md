# API参考文档

## 概述

古籍MCP服务器提供RESTful API和MCP协议两种接口，支持古籍内容的搜索、提取和分析。

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **Content-Type**: `application/json`
- **字符编码**: UTF-8

## 认证

目前API不需要认证，但建议在生产环境中添加适当的认证机制。

## 错误处理

所有API响应都遵循统一的格式：

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "requestId": "req_1234567890",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "code": "INVALID_PARAMETERS",
    "message": "参数验证失败",
    "field": "keyword"
  },
  "metadata": {
    "requestId": "req_1234567890",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

## 搜索API

### 搜索古籍内容

```http
GET /api/search
```

#### 参数

| 参数 | 类型 | 必需 | 描述 | 示例 |
|------|------|------|------|------|
| `keyword` | string | 是 | 搜索关键词 | `论语` |
| `category` | string | 否 | 古籍分类 | `经部` |
| `dynasty` | string | 否 | 朝代 | `春秋` |
| `author` | string | 否 | 作者 | `孔子` |
| `limit` | number | 否 | 结果数量限制 | `20` |
| `page` | number | 否 | 页码 | `1` |
| `pageSize` | number | 否 | 每页大小 | `20` |
| `sortBy` | string | 否 | 排序方式 | `relevance` |
| `sortOrder` | string | 否 | 排序顺序 | `desc` |

#### 响应

```json
{
  "success": true,
  "data": {
    "success": true,
    "totalResults": 100,
    "returnedResults": 20,
    "searchTime": 1234,
    "results": [
      {
        "bookId": "LUNYU",
        "title": "论语",
        "author": "孔子",
        "dynasty": "春秋",
        "category": "经部",
        "snippet": "学而时习之，不亦说乎？",
        "chapterUrl": "/book/LUNYU/chapter/1",
        "bookUrl": "/book/LUNYU",
        "relevanceScore": 0.95,
        "source": "识典古籍",
        "citation": {
          "bookTitle": "论语",
          "author": "孔子",
          "dynasty": "春秋",
          "chapterTitle": "学而",
          "pageNumber": 1,
          "sourceUrl": "https://www.shidianguji.com/book/LUNYU",
          "citationText": "论语，孔子，春秋",
          "markdownLink": "[论语](https://www.shidianguji.com/book/LUNYU)"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 获取搜索建议

```http
GET /api/search/suggestions
```

#### 参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `keyword` | string | 是 | 搜索关键词 |

#### 响应

```json
{
  "success": true,
  "data": [
    "论语 原文",
    "论语 译文",
    "论语 注释",
    "论语 解析",
    "论语 全文"
  ]
}
```

### 获取热门搜索

```http
GET /api/search/popular
```

#### 响应

```json
{
  "success": true,
  "data": [
    { "keyword": "论语", "count": 1250 },
    { "keyword": "道德经", "count": 980 },
    { "keyword": "史记", "count": 856 }
  ]
}
```

## 书籍API

### 获取书籍信息

```http
GET /api/books/{bookId}
```

#### 路径参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍ID |

#### 响应

```json
{
  "success": true,
  "data": {
    "bookId": "LUNYU",
    "title": "论语",
    "author": "孔子",
    "dynasty": "春秋",
    "category": "经部",
    "description": "《论语》是儒家学派的经典著作之一...",
    "totalChapters": 20,
    "chapters": [
      {
        "chapterId": "1",
        "title": "学而",
        "url": "/book/LUNYU/chapter/1",
        "order": 1
      }
    ],
    "metadata": {
      "source": "识典古籍",
      "extractedAt": "2024-01-01T00:00:00.000Z",
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 获取书籍章节列表

```http
GET /api/books/{bookId}/chapters
```

#### 响应

```json
{
  "success": true,
  "data": [
    {
      "chapterId": "1",
      "title": "学而",
      "url": "/book/LUNYU/chapter/1",
      "order": 1
    }
  ]
}
```

### 获取章节内容

```http
GET /api/books/{bookId}/chapters/{chapterId}
```

#### 路径参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍ID |
| `chapterId` | string | 是 | 章节ID |

#### 查询参数

| 参数 | 类型 | 必需 | 描述 | 默认值 |
|------|------|------|------|--------|
| `includeAnnotations` | boolean | 否 | 是否包含注释 | `true` |
| `includeFootnotes` | boolean | 否 | 是否包含脚注 | `true` |

#### 响应

```json
{
  "success": true,
  "data": {
    "chapterId": "1",
    "chapterTitle": "学而",
    "content": "学而时习之，不亦说乎？有朋自远方来，不亦乐乎？",
    "originalText": "學而時習之，不亦說乎？有朋自遠方來，不亦樂乎？",
    "translatedText": "学习并时常复习，不是很愉快吗？",
    "annotations": [
      "学：学习",
      "习：复习",
      "说：同'悦'，愉快"
    ],
    "footnotes": [
      "注1：此章讲学习的方法和态度"
    ],
    "paragraphs": [
      {
        "paragraphId": "p_1",
        "content": "学而时习之，不亦说乎？",
        "hasHighlight": false,
        "highlightText": "",
        "position": 1,
        "wordCount": 10
      }
    ],
    "navigation": {
      "previousChapter": null,
      "nextChapter": {
        "title": "为政",
        "url": "/book/LUNYU/chapter/2",
        "chapterId": "2"
      },
      "chapterList": [],
      "breadcrumb": ["LUNYU", "1"]
    },
    "metadata": {
      "searchKeywords": [],
      "extractedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 提取内容片段

```http
GET /api/books/{bookId}/snippets
```

#### 路径参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍ID |

#### 查询参数

| 参数 | 类型 | 必需 | 描述 | 默认值 |
|------|------|------|------|--------|
| `keyword` | string | 否 | 搜索关键词 | - |
| `maxSnippets` | number | 否 | 最大片段数 | `20` |
| `contextLength` | number | 否 | 上下文长度 | `200` |
| `enableLocalCache` | boolean | 否 | 是否启用本地缓存 | `true` |

#### 响应

```json
{
  "success": true,
  "data": [
    {
      "chapterId": "1",
      "chapterTitle": "学而",
      "pageNumber": 1,
      "content": "学而时习之，不亦说乎？",
      "highlightedContent": "学而时习之，不亦说乎？",
      "relevanceScore": 0.95,
      "contextBefore": "",
      "contextAfter": "有朋自远方来，不亦乐乎？",
      "citation": {
        "bookTitle": "论语",
        "author": "孔子",
        "dynasty": "春秋",
        "chapterTitle": "学而",
        "pageNumber": 1,
        "sourceUrl": "https://www.shidianguji.com/book/LUNYU/chapter/1",
        "citationText": "论语·学而",
        "markdownLink": "[论语·学而](https://www.shidianguji.com/book/LUNYU/chapter/1)"
      }
    }
  ]
}
```

### 获取书籍统计信息

```http
GET /api/books/{bookId}/stats
```

#### 响应

```json
{
  "success": true,
  "data": {
    "bookId": "LUNYU",
    "title": "论语",
    "totalChapters": 20,
    "estimatedWordCount": 20000,
    "lastUpdated": "2024-01-01T00:00:00.000Z",
    "source": "识典古籍"
  }
}
```

## 健康检查API

### 基础健康检查

```http
GET /api/health
```

#### 响应

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production",
    "nodeVersion": "v18.17.0",
    "memory": {
      "used": 128,
      "total": 256,
      "free": 128
    }
  }
}
```

### 详细健康检查

```http
GET /api/health/detailed
```

#### 响应

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production",
    "nodeVersion": "v18.17.0",
    "services": {
      "mcp": {
        "status": "healthy",
        "message": "MCP Server is running normally",
        "timestamp": "2024-01-01T00:00:00.000Z"
      },
      "search": {
        "status": "healthy",
        "message": "Search service is running normally",
        "timestamp": "2024-01-01T00:00:00.000Z"
      },
      "extractor": {
        "status": "healthy",
        "message": "Extractor service is running normally",
        "timestamp": "2024-01-01T00:00:00.000Z"
      },
      "cache": {
        "status": "healthy",
        "message": "Cache service is running normally",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    },
    "memory": {
      "used": 128,
      "total": 256,
      "free": 128
    },
    "system": {
      "platform": "linux",
      "arch": "x64",
      "pid": 1234,
      "cpuUsage": {
        "user": 1000000,
        "system": 500000
      }
    }
  }
}
```

### 系统指标

```http
GET /api/metrics
```

#### 响应

```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "memory": {
      "used": 134217728,
      "total": 268435456,
      "external": 12345678,
      "rss": 150000000
    },
    "cpu": {
      "user": 1000000,
      "system": 500000
    },
    "system": {
      "platform": "linux",
      "arch": "x64",
      "pid": 1234,
      "version": "v18.17.0"
    },
    "config": {
      "environment": "production",
      "port": 3000,
      "host": "0.0.0.0"
    }
  }
}
```

### 服务信息

```http
GET /api/info
```

#### 响应

```json
{
  "success": true,
  "data": {
    "name": "Guji MCP Server",
    "version": "1.0.0",
    "description": "基于Node.js的古籍MCP服务器，为AI助手提供古籍知识检索能力",
    "author": "pp",
    "license": "MIT",
    "repository": "https://github.com/your-username/guji-mcp-server-node",
    "documentation": "https://github.com/your-username/guji-mcp-server-node#readme",
    "capabilities": ["tools", "search", "extraction", "caching"],
    "tools": [
      "search_ancient_texts",
      "extract_book_info",
      "extract_content_snippets",
      "get_chapter_content",
      "analyze_content_themes"
    ],
    "endpoints": {
      "search": "/api/search",
      "books": "/api/books",
      "health": "/api/health",
      "metrics": "/api/metrics"
    },
    "mcp": {
      "protocol": "Model Context Protocol",
      "version": "0.4.0",
      "transport": "stdio"
    }
  }
}
```

## 状态码

| 状态码 | 描述 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源未找到 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 502 | 网关错误 |
| 503 | 服务不可用 |

## 速率限制

- 一般API: 10请求/秒
- 搜索API: 5请求/秒
- 突发限制: 20请求

## 示例代码

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000
});

// 搜索古籍
async function searchAncientTexts(keyword) {
  try {
    const response = await client.get('/search', {
      params: { keyword, limit: 10 }
    });
    return response.data;
  } catch (error) {
    console.error('Search failed:', error.response.data);
    throw error;
  }
}

// 获取书籍信息
async function getBookInfo(bookId) {
  try {
    const response = await client.get(`/books/${bookId}`);
    return response.data;
  } catch (error) {
    console.error('Get book info failed:', error.response.data);
    throw error;
  }
}
```

### Python

```python
import requests

class GujiClient:
    def __init__(self, base_url='http://localhost:3000/api'):
        self.base_url = base_url
        self.session = requests.Session()
    
    def search(self, keyword, **params):
        response = self.session.get(f'{self.base_url}/search', params={
            'keyword': keyword,
            **params
        })
        response.raise_for_status()
        return response.json()
    
    def get_book_info(self, book_id):
        response = self.session.get(f'{self.base_url}/books/{book_id}')
        response.raise_for_status()
        return response.json()

# 使用示例
client = GujiClient()
result = client.search('论语', limit=5)
print(result)
```

### cURL

```bash
# 搜索古籍
curl "http://localhost:3000/api/search?keyword=论语&limit=5"

# 获取书籍信息
curl "http://localhost:3000/api/books/LUNYU"

# 获取章节内容
curl "http://localhost:3000/api/books/LUNYU/chapters/1"

# 健康检查
curl "http://localhost:3000/api/health"
```
