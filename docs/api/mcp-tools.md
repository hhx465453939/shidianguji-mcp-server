# MCP工具定义和API接口

## 工具概览

古籍MCP服务器提供以下工具供AI助手调用：

| 工具名称 | 功能描述 | 输入参数 | 输出格式 |
|----------|----------|----------|----------|
| `search_ancient_texts` | 搜索古籍内容 | keyword, category, dynasty, limit | 搜索结果列表 |
| `extract_book_info` | 提取书籍详细信息 | bookId | 书籍元数据 |
| `extract_content_snippets` | 提取内容片段 | bookId, keyword, options | 内容片段列表 |
| `get_chapter_content` | 获取章节内容 | bookId, chapterId | 完整章节内容 |
| `analyze_content_themes` | 分析内容主题 | content, analysisType | 主题分析结果 |

## 1. 搜索古籍内容工具

### 工具定义

```typescript
{
  name: "search_ancient_texts",
  description: "在识典古籍网站中搜索包含指定关键词的古籍内容",
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description: "搜索关键词，支持中文古籍术语",
        examples: ["道", "德", "仁", "义", "礼"]
      },
      category: {
        type: "string",
        description: "四部分类筛选",
        enum: ["经部", "史部", "子部", "集部"],
        default: null
      },
      dynasty: {
        type: "string", 
        description: "朝代筛选",
        examples: ["先秦", "汉", "唐", "宋", "明", "清"],
        default: null
      },
      searchType: {
        type: "string",
        description: "搜索类型",
        enum: ["full_text", "title", "author"],
        default: "full_text"
      },
      fuzzy: {
        type: "boolean",
        description: "是否启用模糊搜索",
        default: true
      },
      limit: {
        type: "number",
        description: "返回结果数量限制",
        minimum: 1,
        maximum: 100,
        default: 10
      }
    },
    required: ["keyword"]
  }
}
```

### 使用示例

```typescript
// 基础搜索
const result = await mcpClient.callTool("search_ancient_texts", {
  keyword: "道"
});

// 高级搜索
const result = await mcpClient.callTool("search_ancient_texts", {
  keyword: "天人合一",
  category: "经部",
  dynasty: "先秦",
  searchType: "full_text",
  fuzzy: true,
  limit: 20
});
```

### 响应格式

```typescript
interface SearchResult {
  success: boolean;
  totalResults: number;
  returnedResults: number;
  searchTime: number;
  results: SearchResultItem[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface SearchResultItem {
  bookId: string;
  title: string;
  author: string;
  dynasty: string;
  category: string;
  snippet: string;
  chapterUrl: string;
  bookUrl: string;
  relevanceScore: number;
  source: "识典古籍";
}
```

## 2. 提取书籍信息工具

### 工具定义

```typescript
{
  name: "extract_book_info",
  description: "提取指定书籍的详细信息和元数据",
  inputSchema: {
    type: "object",
    properties: {
      bookId: {
        type: "string",
        description: "书籍ID，从搜索结果或URL中获取",
        examples: ["HY1523", "MZ0001", "SG0001"]
      }
    },
    required: ["bookId"]
  }
}
```

### 使用示例

```typescript
const bookInfo = await mcpClient.callTool("extract_book_info", {
  bookId: "HY1523"
});
```

### 响应格式

```typescript
interface BookInfo {
  success: boolean;
  bookId: string;
  title: string;
  author: string;
  dynasty: string;
  category: string;
  description: string;
  totalChapters: number;
  chapters: ChapterInfo[];
  metadata: {
    source: string;
    extractedAt: string;
    lastUpdated: string;
  };
}

interface ChapterInfo {
  chapterId: string;
  title: string;
  url: string;
  order: number;
  wordCount?: number;
}
```

## 3. 提取内容片段工具

### 工具定义

```typescript
{
  name: "extract_content_snippets",
  description: "从指定书籍中提取包含关键词的内容片段",
  inputSchema: {
    type: "object",
    properties: {
      bookId: {
        type: "string",
        description: "书籍ID"
      },
      keyword: {
        type: "string",
        description: "要搜索的关键词"
      },
      contextLength: {
        type: "number",
        description: "上下文长度（字符数）",
        minimum: 50,
        maximum: 1000,
        default: 300
      },
      maxSnippets: {
        type: "number",
        description: "最大片段数量",
        minimum: 1,
        maximum: 50,
        default: 10
      },
      highlightKeyword: {
        type: "boolean",
        description: "是否高亮关键词",
        default: true
      }
    },
    required: ["bookId", "keyword"]
  }
}
```

### 使用示例

```typescript
const snippets = await mcpClient.callTool("extract_content_snippets", {
  bookId: "HY1523",
  keyword: "皇极经世",
  contextLength: 500,
  maxSnippets: 5,
  highlightKeyword: true
});
```

### 响应格式

```typescript
interface ContentSnippets {
  success: boolean;
  bookId: string;
  keyword: string;
  totalSnippets: number;
  snippets: ContentSnippet[];
}

interface ContentSnippet {
  chapterId: string;
  chapterTitle: string;
  pageNumber: number;
  content: string;
  highlightedContent: string;
  relevanceScore: number;
  contextBefore: string;
  contextAfter: string;
}
```

## 4. 获取章节内容工具

### 工具定义

```typescript
{
  name: "get_chapter_content",
  description: "获取指定章节的完整内容",
  inputSchema: {
    type: "object",
    properties: {
      bookId: {
        type: "string",
        description: "书籍ID"
      },
      chapterId: {
        type: "string",
        description: "章节ID或章节URL"
      },
      format: {
        type: "string",
        description: "输出格式",
        enum: ["markdown", "html", "plain"],
        default: "markdown"
      },
      includeMetadata: {
        type: "boolean",
        description: "是否包含元数据",
        default: true
      }
    },
    required: ["bookId", "chapterId"]
  }
}
```

### 使用示例

```typescript
const chapter = await mcpClient.callTool("get_chapter_content", {
  bookId: "HY1523",
  chapterId: "chapter_1",
  format: "markdown",
  includeMetadata: true
});
```

### 响应格式

```typescript
interface ChapterContent {
  success: boolean;
  bookId: string;
  chapterId: string;
  title: string;
  content: string;
  wordCount: number;
  metadata: {
    source: string;
    extractedAt: string;
    format: string;
  };
}
```

## 5. 分析内容主题工具

### 工具定义

```typescript
{
  name: "analyze_content_themes",
  description: "分析古籍内容的主题和关键词",
  inputSchema: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "要分析的内容文本"
      },
      analysisType: {
        type: "string",
        description: "分析类型",
        enum: ["themes", "keywords", "entities", "sentiment"],
        default: "themes"
      },
      maxResults: {
        type: "number",
        description: "最大结果数量",
        minimum: 5,
        maximum: 50,
        default: 20
      }
    },
    required: ["content"]
  }
}
```

### 使用示例

```typescript
const analysis = await mcpClient.callTool("analyze_content_themes", {
  content: "道可道，非常道。名可名，非常名...",
  analysisType: "themes",
  maxResults: 10
});
```

### 响应格式

```typescript
interface ContentAnalysis {
  success: boolean;
  analysisType: string;
  themes: ThemeAnalysis[];
  keywords: KeywordAnalysis[];
  entities: EntityAnalysis[];
  summary: {
    totalThemes: number;
    dominantTheme: string;
    complexity: "low" | "medium" | "high";
  };
}

interface ThemeAnalysis {
  theme: string;
  confidence: number;
  frequency: number;
  relatedKeywords: string[];
}

interface KeywordAnalysis {
  keyword: string;
  frequency: number;
  importance: number;
  context: string[];
}
```

## 错误处理

### 错误类型

```typescript
enum ErrorType {
  INVALID_PARAMETERS = "INVALID_PARAMETERS",
  BOOK_NOT_FOUND = "BOOK_NOT_FOUND",
  CHAPTER_NOT_FOUND = "CHAPTER_NOT_FOUND",
  SEARCH_FAILED = "SEARCH_FAILED",
  EXTRACTION_FAILED = "EXTRACTION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR = "INTERNAL_ERROR"
}
```

### 错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    code: number;
    retryable: boolean;
    details?: any;
  };
}
```

### 常见错误处理

```typescript
try {
  const result = await mcpClient.callTool("search_ancient_texts", {
    keyword: "道"
  });
} catch (error) {
  if (error.type === ErrorType.RATE_LIMIT_EXCEEDED) {
    // 处理限流错误
    await delay(1000);
    // 重试请求
  } else if (error.type === ErrorType.NETWORK_ERROR) {
    // 处理网络错误
    console.error("网络连接失败，请检查网络状态");
  } else {
    // 处理其他错误
    console.error("搜索失败:", error.message);
  }
}
```

## 性能优化建议

### 1. 缓存策略

```typescript
// 搜索结果缓存
const cacheKey = `search:${keyword}:${category}:${dynasty}`;
const cached = await cache.get(cacheKey);
if (cached) {
  return cached;
}

// 书籍信息缓存
const bookCacheKey = `book:${bookId}`;
const bookInfo = await cache.get(bookCacheKey);
```

### 2. 批量处理

```typescript
// 批量搜索多个关键词
const keywords = ["道", "德", "仁", "义"];
const results = await Promise.all(
  keywords.map(keyword => 
    mcpClient.callTool("search_ancient_texts", { keyword })
  )
);
```

### 3. 分页处理

```typescript
// 分页获取大量结果
let page = 1;
const allResults = [];

while (true) {
  const result = await mcpClient.callTool("search_ancient_texts", {
    keyword: "道",
    page,
    limit: 50
  });
  
  allResults.push(...result.results);
  
  if (!result.pagination.hasNext) break;
  page++;
}
```

## 最佳实践

### 1. 参数验证

```typescript
// 验证搜索参数
function validateSearchParams(params: SearchParams): void {
  if (!params.keyword || params.keyword.trim().length === 0) {
    throw new Error("关键词不能为空");
  }
  
  if (params.limit && (params.limit < 1 || params.limit > 100)) {
    throw new Error("结果数量限制必须在1-100之间");
  }
}
```

### 2. 错误重试

```typescript
// 带重试的请求
async function callToolWithRetry(
  toolName: string, 
  params: any, 
  maxRetries: number = 3
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await mcpClient.callTool(toolName, params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.retryable) {
        await delay(1000 * Math.pow(2, i)); // 指数退避
      } else {
        throw error;
      }
    }
  }
}
```

### 3. 结果处理

```typescript
// 处理搜索结果
function processSearchResults(results: SearchResult): ProcessedResults {
  return {
    ...results,
    results: results.results.map(item => ({
      ...item,
      snippet: highlightKeywords(item.snippet, searchKeyword),
      relevanceScore: calculateRelevance(item, searchKeyword)
    }))
  };
}
```
