/**
 * MCP协议相关类型定义
 */

// MCP工具接口
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPInputSchema;
  handler: (params: any) => Promise<MCPResponse>;
}

// MCP输入模式接口
export interface MCPInputSchema {
  type: 'object';
  properties: Record<string, MCPPropertySchema>;
  required?: string[];
}

// MCP属性模式接口
export interface MCPPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: MCPPropertySchema;
  properties?: Record<string, MCPPropertySchema>;
  default?: any;
}

// MCP请求接口
export interface MCPRequest {
  tool: string;
  params: Record<string, any>;
  requestId?: string;
  timestamp?: string;
}

// MCP响应接口
export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: MCPError;
  metadata?: {
    requestId: string;
    timestamp: string;
    version: string;
    pagination?: PaginationInfo;
  };
}

// MCP错误接口
export interface MCPError {
  type: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
  retryable?: boolean;
}

// MCP成功响应接口
export interface MCPSuccessResponse<T = any> {
  success: true;
  data: T;
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
    pagination?: PaginationInfo;
  };
}

// MCP错误响应接口
export interface MCPErrorResponse {
  success: false;
  error: MCPError;
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

// 搜索工具参数接口
export interface SearchToolParams {
  keyword: string;
  category?: '经部' | '史部' | '子部' | '集部';
  dynasty?: string;
  author?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'relevance' | 'title' | 'author' | 'dynasty';
  sortOrder?: 'asc' | 'desc';
}

// 提取工具参数接口
export interface ExtractToolParams {
  bookId: string;
  keyword?: string;
  maxSnippets?: number;
  contextLength?: number;
  enableLocalCache?: boolean;
}

// 书籍信息工具参数接口
export interface BookInfoToolParams {
  bookId: string;
  includeChapters?: boolean;
  includeMetadata?: boolean;
}

// 章节内容工具参数接口
export interface ChapterContentToolParams {
  bookId: string;
  chapterId: string;
  includeAnnotations?: boolean;
  includeFootnotes?: boolean;
}

// MCP工具注册接口
export interface MCPToolRegistration {
  name: string;
  description: string;
  inputSchema: MCPInputSchema;
  handler: MCPToolHandler;
}

// MCP工具处理器类型
export type MCPToolHandler = (params: any) => Promise<MCPResponse>;

// MCP服务器配置接口
export interface MCPServerConfig {
  name: string;
  version: string;
  description: string;
  tools: MCPToolRegistration[];
  port: number;
  host: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  timeout: number;
}

// MCP中间件接口
export interface MCPMiddleware {
  name: string;
  handler: (req: MCPRequest, res: MCPResponse, next: () => void) => void;
}

// MCP错误类型枚举
export enum MCPErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  CACHE_ERROR = 'CACHE_ERROR'
}

// MCP错误代码枚举
export enum MCPErrorCode {
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  PARSE_ERROR = 'PARSE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR'
}

// MCP工具定义常量
export const MCP_TOOLS = {
  SEARCH_ANCIENT_TEXTS: 'search_ancient_texts',
  EXTRACT_BOOK_INFO: 'extract_book_info',
  EXTRACT_CONTENT_SNIPPETS: 'extract_content_snippets',
  GET_CHAPTER_CONTENT: 'get_chapter_content',
  ANALYZE_CONTENT_THEMES: 'analyze_content_themes'
} as const;

// MCP工具描述常量
export const MCP_TOOL_DESCRIPTIONS = {
  [MCP_TOOLS.SEARCH_ANCIENT_TEXTS]: '搜索古籍内容，支持关键词、分类、朝代等多维度搜索',
  [MCP_TOOLS.EXTRACT_BOOK_INFO]: '提取书籍详细信息，包括章节列表和元数据',
  [MCP_TOOLS.EXTRACT_CONTENT_SNIPPETS]: '提取包含关键词的内容片段',
  [MCP_TOOLS.GET_CHAPTER_CONTENT]: '获取指定章节的完整内容',
  [MCP_TOOLS.ANALYZE_CONTENT_THEMES]: '分析内容主题和关键词'
} as const;

// 分页信息接口（从guji.ts导入）
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number;
  prevPage?: number;
}
