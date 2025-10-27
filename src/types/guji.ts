/**
 * 古籍相关类型定义
 */

// 搜索参数接口
export interface SearchParams {
  keyword: string;
  keywords?: string[];  // 支持多关键词搜索
  category?: '经部' | '史部' | '子部' | '集部';
  dynasty?: string;
  searchType?: 'full_text' | 'title' | 'author';
  fuzzy?: boolean;
  limit?: number;
  bookName?: string;    // 书籍名称筛选
  author?: string;      // 作者筛选
  context?: string;     // 上下文信息
  // 新增分页和排序参数
  page?: number;        // 页码，从1开始
  pageSize?: number;    // 每页大小，默认20
  sortBy?: 'relevance' | 'title' | 'author' | 'dynasty' | 'publishYear';  // 排序方式
  sortOrder?: 'asc' | 'desc';  // 排序顺序
  onlyOriginal?: boolean;      // 仅搜索原字
  onlyFullText?: boolean;      // 仅搜索正文
}

// 搜索结果接口
export interface SearchResult {
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

// 搜索结果项接口
export interface SearchResultItem {
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
  citation?: CitationInfo;  // 引用信息
  localCachePath?: string;  // 本地缓存路径
  // 新增字段
  coverImage?: string;      // 书籍封面图片URL
  publishYear?: string;     // 出版年份
  description?: string;     // 书籍描述
  totalChapters?: number;   // 总章节数
  wordCount?: number;       // 字数统计
  highlightText?: string;   // 高亮显示文本
  searchContext?: string;   // 搜索上下文
}

// 内容片段接口
export interface ContentSnippet {
  chapterId: string;
  chapterTitle: string;
  pageNumber: number;
  content: string;
  highlightedContent: string;
  relevanceScore: number;
  contextBefore: string;
  contextAfter: string;
  citation?: CitationInfo;
  localCachePath?: string;
  // 新增字段
  paragraphId?: string;        // 段落ID
  highlightIndex?: number;     // 高亮索引
  topicId?: string;           // 主题ID
  version?: number;           // 版本号
  contentMatch?: number;      // 内容匹配度
  searchKeywords?: string[];  // 搜索关键词
  originalText?: string;      // 原始文本
  translatedText?: string;    // 译文
  annotations?: string[];     // 注释
  footnotes?: string[];       // 脚注
}

// 引用信息接口
export interface CitationInfo {
  bookTitle: string;
  author: string;
  dynasty: string;
  chapterTitle: string;
  pageNumber: number;
  sourceUrl: string;
  localPath?: string;
  citationText: string;
  markdownLink: string;
  localLink?: string;
}

// 章节信息接口
export interface ChapterInfo {
  chapterId: string;
  title: string;
  url: string;
  order: number;
  wordCount?: number;
}

// 书籍信息接口
export interface BookInfo {
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

// 书籍元数据接口
export interface BookMetadata {
  bookId: string;
  title: string;
  author: string;
  dynasty: string;
  category: string;
  description: string;
  totalChapters: number;
  wordCount: number;
  publishInfo: PublishInfo;
  sourceInfo: {
    url: string;
    extractedAt: string;
    version: string;
  };
}

// 出版信息接口
export interface PublishInfo {
  year: string;
  publisher: string;
  edition: string;
  isbn: string;
}

// 章节内容接口
export interface ChapterContent {
  chapterId: string;
  chapterTitle: string;
  content: string;
  originalText: string;
  translatedText: string;
  annotations: string[];
  footnotes: string[];
  paragraphs: ParagraphInfo[];
  navigation: NavigationInfo;
  metadata: {
    paragraphId?: string;
    highlightIndex?: number;
    topicId?: string;
    version?: number;
    contentMatch?: number;
    searchKeywords: string[];
    extractedAt: string;
  };
}

// 段落信息接口
export interface ParagraphInfo {
  paragraphId: string;
  content: string;
  hasHighlight: boolean;
  highlightText: string;
  position: number;
  wordCount: number;
}

// 导航信息接口
export interface NavigationInfo {
  previousChapter: ChapterLink | null;
  nextChapter: ChapterLink | null;
  chapterList: ChapterLink[];
  breadcrumb: string[];
}

// 章节链接接口
export interface ChapterLink {
  title: string;
  url: string;
  chapterId: string;
}

// 搜索URL参数接口
export interface SearchUrlParams {
  pageFrom: string;
  paragraphId: string;
  keywords: string;
  highlightIndex: number;
  topicId: string;
  version: number;
  contentMatch: number;
  bookId: string;
  chapterId: string;
}

// 内容匹配结果接口
export interface ContentMatchResult {
  totalMatches: number;
  matches: ContentMatch[];
  averageRelevance: number;
}

// 内容匹配接口
export interface ContentMatch {
  keyword: string;
  position: number;
  context: string;
  relevanceScore: number;
  highlightText: string;
}

// 提取选项接口
export interface ExtractOptions {
  maxSnippets?: number;
  contextLength?: number;
  enableLocalCache?: boolean;
  maxChapters?: number;
  includeAnnotations?: boolean;
  includeFootnotes?: boolean;
}

// 分页信息接口
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

// 排序参数接口
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 缓存配置接口
export interface CacheConfig {
  memory: {
    maxSize: number;
    ttl: number;
  };
  redis: {
    ttl: number;
  };
  search: {
    ttl: number;
  };
}

// 搜索配置接口
export interface SearchConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  delay: number;
  searchUrlTemplate: string;
  rateLimit: {
    requestsPerSecond: number;
    maxConcurrentRequests: number;
  };
  cache: CacheConfig;
}

// 提取配置接口
export interface ExtractorConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  delay: number;
  cache: CacheConfig;
  localCache: {
    enabled: boolean;
    baseDir: string;
    maxSize: number;
    ttl: number;
  };
}

// 服务配置接口
export interface ServiceConfig {
  search: SearchConfig;
  extractor: ExtractorConfig;
  cache: CacheConfig;
  logging: {
    level: string;
    file: {
      enabled: boolean;
      path: string;
      maxSize: string;
      maxFiles: number;
    };
  };
}
