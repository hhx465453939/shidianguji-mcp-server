import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  ListToolsResult
} from '@modelcontextprotocol/sdk/types.js';
import { BaseService } from '@/core/BaseService';
import { searchService } from '@/services/SearchService';
import { extractorService } from '@/services/ExtractorService';
import { cacheService } from '@/services/CacheService';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import { 
  SearchParams, 
  ExtractOptions,
  SearchResult,
  ContentSnippet,
  BookInfo,
  ChapterContent
} from '@/types/guji';
import { MCPTool, MCPResponse, MCPError, MCPErrorType, MCPErrorCode } from '@/types/mcp';
import { ErrorFactory } from '@/types/errors';

/**
 * MCP协议服务器
 * 实现Model Context Protocol，为AI助手提供古籍知识检索能力
 */
export class MCPServer extends BaseService {
  private server: Server;
  private tools: MCPTool[] = [];

  constructor() {
    super('MCPServer');
    
    // 初始化MCP服务器
    this.server = new Server(
      {
        name: 'guji-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupTools();
    this.setupHandlers();
  }

  /**
   * 设置MCP工具
   */
  private setupTools(): void {
    this.tools = [
      {
        name: 'search_ancient_texts',
        description: '搜索古籍内容，支持关键词、分类、朝代等多维度搜索',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: '搜索关键词',
              minLength: 1,
              maxLength: 100
            },
            category: {
              type: 'string',
              description: '古籍分类',
              enum: ['经部', '史部', '子部', '集部']
            },
            dynasty: {
              type: 'string',
              description: '朝代',
              maxLength: 50
            },
            author: {
              type: 'string',
              description: '作者',
              maxLength: 100
            },
            limit: {
              type: 'number',
              description: '结果数量限制',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            page: {
              type: 'number',
              description: '页码',
              minimum: 1,
              default: 1
            },
            pageSize: {
              type: 'number',
              description: '每页大小',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            sortBy: {
              type: 'string',
              description: '排序方式',
              enum: ['relevance', 'title', 'author', 'dynasty'],
              default: 'relevance'
            },
            sortOrder: {
              type: 'string',
              description: '排序顺序',
              enum: ['asc', 'desc'],
              default: 'desc'
            }
          },
          required: ['keyword']
        },
        handler: this.handleSearchAncientTexts.bind(this)
      },
      {
        name: 'extract_book_info',
        description: '提取书籍详细信息，包括章节列表和元数据',
        inputSchema: {
          type: 'object',
          properties: {
            bookId: {
              type: 'string',
              description: '书籍ID',
              pattern: '^[A-Z0-9_]+$'
            }
          },
          required: ['bookId']
        },
        handler: this.handleExtractBookInfo.bind(this)
      },
      {
        name: 'extract_content_snippets',
        description: '提取包含关键词的内容片段',
        inputSchema: {
          type: 'object',
          properties: {
            bookId: {
              type: 'string',
              description: '书籍ID',
              pattern: '^[A-Z0-9_]+$'
            },
            keyword: {
              type: 'string',
              description: '搜索关键词',
              minLength: 1,
              maxLength: 100
            },
            maxSnippets: {
              type: 'number',
              description: '最大片段数',
              minimum: 1,
              maximum: 50,
              default: 20
            },
            contextLength: {
              type: 'number',
              description: '上下文长度',
              minimum: 50,
              maximum: 1000,
              default: 200
            },
            enableLocalCache: {
              type: 'boolean',
              description: '是否启用本地缓存',
              default: true
            }
          },
          required: ['bookId']
        },
        handler: this.handleExtractContentSnippets.bind(this)
      },
      {
        name: 'get_chapter_content',
        description: '获取指定章节的完整内容',
        inputSchema: {
          type: 'object',
          properties: {
            bookId: {
              type: 'string',
              description: '书籍ID',
              pattern: '^[A-Z0-9_]+$'
            },
            chapterId: {
              type: 'string',
              description: '章节ID',
              minLength: 1,
              maxLength: 100
            },
            includeAnnotations: {
              type: 'boolean',
              description: '是否包含注释',
              default: true
            },
            includeFootnotes: {
              type: 'boolean',
              description: '是否包含脚注',
              default: true
            }
          },
          required: ['bookId', 'chapterId']
        },
        handler: this.handleGetChapterContent.bind(this)
      },
      {
        name: 'analyze_content_themes',
        description: '分析内容主题和关键词',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: '要分析的内容',
              minLength: 1
            },
            maxThemes: {
              type: 'number',
              description: '最大主题数',
              minimum: 1,
              maximum: 20,
              default: 10
            }
          },
          required: ['content']
        },
        handler: this.handleAnalyzeContentThemes.bind(this)
      }
    ];
  }

  /**
   * 设置MCP处理器
   */
  private setupHandlers(): void {
    // 列出工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));

      return { tools };
    });

    // 调用工具
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const tool = this.tools.find(t => t.name === name);
        if (!tool) {
          throw new Error(`Tool '${name}' not found`);
        }

        const result = await tool.handler(args);
        return result;
      } catch (error) {
        logger.error('Tool execution failed', error as Error, { tool: name, args });
        
        return {
          content: [{
            type: 'text',
            text: `Error: ${(error as Error).message}`
          }],
          isError: true
        };
      }
    });
  }

  /**
   * 处理搜索古籍文本请求
   */
  private async handleSearchAncientTexts(args: any): Promise<CallToolResult> {
    try {
      const searchParams: SearchParams = {
        keyword: args.keyword,
        category: args.category,
        dynasty: args.dynasty,
        author: args.author,
        limit: args.limit || 20,
        page: args.page || 1,
        pageSize: args.pageSize || 20,
        sortBy: args.sortBy || 'relevance',
        sortOrder: args.sortOrder || 'desc'
      };

      const result = await searchService.search(searchParams);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      throw this.createMCPError('SEARCH_FAILED', '搜索失败', error as Error);
    }
  }

  /**
   * 处理提取书籍信息请求
   */
  private async handleExtractBookInfo(args: any): Promise<CallToolResult> {
    try {
      const bookInfo = await extractorService.extractBookInfo(args.bookId);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(bookInfo, null, 2)
        }]
      };
    } catch (error) {
      throw this.createMCPError('EXTRACTION_FAILED', '提取书籍信息失败', error as Error);
    }
  }

  /**
   * 处理提取内容片段请求
   */
  private async handleExtractContentSnippets(args: any): Promise<CallToolResult> {
    try {
      const options: ExtractOptions = {
        maxSnippets: args.maxSnippets || 20,
        contextLength: args.contextLength || 200,
        enableLocalCache: args.enableLocalCache !== false,
        maxChapters: 10,
        includeAnnotations: true,
        includeFootnotes: true
      };

      const snippets = await extractorService.extractContentSnippets(
        args.bookId,
        args.keyword,
        options
      );
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(snippets, null, 2)
        }]
      };
    } catch (error) {
      throw this.createMCPError('EXTRACTION_FAILED', '提取内容片段失败', error as Error);
    }
  }

  /**
   * 处理获取章节内容请求
   */
  private async handleGetChapterContent(args: any): Promise<CallToolResult> {
    try {
      const options: ExtractOptions = {
        includeAnnotations: args.includeAnnotations !== false,
        includeFootnotes: args.includeFootnotes !== false
      };

      const chapterContent = await extractorService.getChapterContent(
        args.bookId,
        args.chapterId,
        options
      );
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(chapterContent, null, 2)
        }]
      };
    } catch (error) {
      throw this.createMCPError('EXTRACTION_FAILED', '获取章节内容失败', error as Error);
    }
  }

  /**
   * 处理分析内容主题请求
   */
  private async handleAnalyzeContentThemes(args: any): Promise<CallToolResult> {
    try {
      // 简单的主题分析实现
      const content = args.content;
      const maxThemes = args.maxThemes || 10;
      
      // 提取关键词（简单实现）
      const words = content.split(/\s+/).filter(word => word.length > 1);
      const wordCount: Record<string, number> = {};
      
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
      
      const themes = Object.entries(wordCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, maxThemes)
        .map(([word, count]) => ({ word, count }));
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ themes }, null, 2)
        }]
      };
    } catch (error) {
      throw this.createMCPError('ANALYSIS_FAILED', '分析内容主题失败', error as Error);
    }
  }

  /**
   * 创建MCP错误
   */
  private createMCPError(code: string, message: string, originalError: Error): MCPError {
    return {
      type: MCPErrorType.INTERNAL_ERROR,
      code,
      message,
      details: {
        originalError: originalError.message,
        stack: originalError.stack
      },
      retryable: true
    };
  }

  /**
   * 启动MCP服务器
   */
  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('MCP Server started successfully', {
        tools: this.tools.length,
        version: '1.0.0'
      });
    } catch (error) {
      logger.error('Failed to start MCP Server', error as Error);
      throw error;
    }
  }

  /**
   * 停止MCP服务器
   */
  async stop(): Promise<void> {
    try {
      await this.server.close();
      logger.info('MCP Server stopped');
    } catch (error) {
      logger.error('Failed to stop MCP Server', error as Error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      // 检查各个服务的健康状态
      const searchHealth = await searchService.healthCheck();
      const extractorHealth = await extractorService.healthCheck();
      const cacheHealth = await cacheService.healthCheck();
      
      const allHealthy = searchHealth.status === 'healthy' && 
                        extractorHealth.status === 'healthy' && 
                        cacheHealth.status === 'healthy';
      
      return {
        status: allHealthy ? 'healthy' : 'degraded',
        message: allHealthy ? 'MCP Server is running normally' : 'Some services are degraded',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.recordError(error as Error, { operation: 'healthCheck' });
      return {
        status: 'unhealthy',
        message: 'MCP Server is not responding',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取服务器信息
   */
  getServerInfo(): {
    name: string;
    version: string;
    tools: string[];
    capabilities: string[];
  } {
    return {
      name: 'guji-mcp-server',
      version: '1.0.0',
      tools: this.tools.map(tool => tool.name),
      capabilities: ['tools', 'search', 'extraction', 'caching']
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      await this.stop();
      await searchService.cleanup();
      await extractorService.cleanup();
      await cacheService.cleanup();
      
      logger.info('MCP Server cleanup completed');
    } catch (error) {
      logger.error('MCP Server cleanup failed', error as Error);
    }
  }
}

/**
 * 全局MCP服务器实例
 */
export const mcpServer = new MCPServer();
