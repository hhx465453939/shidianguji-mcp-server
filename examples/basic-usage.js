/**
 * 古籍MCP服务器基础使用示例
 */

const axios = require('axios');

// 配置客户端
const client = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 搜索古籍内容
 */
async function searchAncientTexts(keyword, options = {}) {
  try {
    console.log(`🔍 搜索关键词: ${keyword}`);
    
    const response = await client.get('/search', {
      params: {
        keyword,
        limit: options.limit || 10,
        page: options.page || 1,
        category: options.category,
        dynasty: options.dynasty,
        author: options.author,
        sortBy: options.sortBy || 'relevance',
        sortOrder: options.sortOrder || 'desc'
      }
    });

    if (response.data.success) {
      const result = response.data.data;
      console.log(`✅ 搜索成功: 找到 ${result.totalResults} 个结果，返回 ${result.returnedResults} 个`);
      
      result.results.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`);
        console.log(`   作者: ${item.author} (${item.dynasty})`);
        console.log(`   分类: ${item.category}`);
        console.log(`   摘要: ${item.snippet}`);
        console.log(`   相关性: ${(item.relevanceScore * 100).toFixed(1)}%`);
      });
      
      return result;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('❌ 搜索失败:', error.message);
    throw error;
  }
}

/**
 * 获取书籍信息
 */
async function getBookInfo(bookId) {
  try {
    console.log(`📚 获取书籍信息: ${bookId}`);
    
    const response = await client.get(`/books/${bookId}`);
    
    if (response.data.success) {
      const book = response.data.data;
      console.log(`✅ 获取成功: ${book.title}`);
      console.log(`   作者: ${book.author} (${book.dynasty})`);
      console.log(`   分类: ${book.category}`);
      console.log(`   章节数: ${book.totalChapters}`);
      console.log(`   描述: ${book.description}`);
      
      return book;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('❌ 获取书籍信息失败:', error.message);
    throw error;
  }
}

/**
 * 获取章节内容
 */
async function getChapterContent(bookId, chapterId) {
  try {
    console.log(`📖 获取章节内容: ${bookId}/${chapterId}`);
    
    const response = await client.get(`/books/${bookId}/chapters/${chapterId}`, {
      params: {
        includeAnnotations: true,
        includeFootnotes: true
      }
    });
    
    if (response.data.success) {
      const chapter = response.data.data;
      console.log(`✅ 获取成功: ${chapter.chapterTitle}`);
      console.log(`\n内容:`);
      console.log(chapter.content);
      
      if (chapter.annotations && chapter.annotations.length > 0) {
        console.log(`\n注释:`);
        chapter.annotations.forEach((annotation, index) => {
          console.log(`${index + 1}. ${annotation}`);
        });
      }
      
      return chapter;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('❌ 获取章节内容失败:', error.message);
    throw error;
  }
}

/**
 * 提取内容片段
 */
async function extractContentSnippets(bookId, keyword, options = {}) {
  try {
    console.log(`🔍 提取内容片段: ${bookId} - ${keyword}`);
    
    const response = await client.get(`/books/${bookId}/snippets`, {
      params: {
        keyword,
        maxSnippets: options.maxSnippets || 5,
        contextLength: options.contextLength || 200,
        enableLocalCache: options.enableLocalCache !== false
      }
    });
    
    if (response.data.success) {
      const snippets = response.data.data;
      console.log(`✅ 提取成功: 找到 ${snippets.length} 个片段`);
      
      snippets.forEach((snippet, index) => {
        console.log(`\n片段 ${index + 1}:`);
        console.log(`章节: ${snippet.chapterTitle}`);
        console.log(`内容: ${snippet.content}`);
        console.log(`相关性: ${(snippet.relevanceScore * 100).toFixed(1)}%`);
        if (snippet.citation) {
          console.log(`引用: ${snippet.citation.citationText}`);
        }
      });
      
      return snippets;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('❌ 提取内容片段失败:', error.message);
    throw error;
  }
}

/**
 * 获取搜索建议
 */
async function getSearchSuggestions(keyword) {
  try {
    console.log(`💡 获取搜索建议: ${keyword}`);
    
    const response = await client.get('/search/suggestions', {
      params: { keyword }
    });
    
    if (response.data.success) {
      const suggestions = response.data.data;
      console.log(`✅ 获取成功: ${suggestions.length} 个建议`);
      suggestions.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion}`);
      });
      
      return suggestions;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('❌ 获取搜索建议失败:', error.message);
    throw error;
  }
}

/**
 * 获取热门搜索
 */
async function getPopularSearches() {
  try {
    console.log('🔥 获取热门搜索');
    
    const response = await client.get('/search/popular');
    
    if (response.data.success) {
      const popular = response.data.data;
      console.log(`✅ 获取成功: ${popular.length} 个热门搜索`);
      popular.forEach((item, index) => {
        console.log(`${index + 1}. ${item.keyword} (${item.count} 次)`);
      });
      
      return popular;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('❌ 获取热门搜索失败:', error.message);
    throw error;
  }
}

/**
 * 健康检查
 */
async function healthCheck() {
  try {
    console.log('🏥 健康检查');
    
    const response = await client.get('/health');
    
    if (response.data.success) {
      const health = response.data.data;
      console.log(`✅ 服务状态: ${health.status}`);
      console.log(`   运行时间: ${Math.floor(health.uptime / 60)} 分钟`);
      console.log(`   内存使用: ${health.memory.used}MB / ${health.memory.total}MB`);
      console.log(`   版本: ${health.version}`);
      
      return health;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
    throw error;
  }
}

/**
 * 主函数 - 演示各种功能
 */
async function main() {
  try {
    console.log('🚀 古籍MCP服务器使用示例\n');
    
    // 1. 健康检查
    await healthCheck();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. 获取热门搜索
    await getPopularSearches();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. 搜索古籍内容
    const searchResult = await searchAncientTexts('论语', {
      limit: 3,
      category: '经部'
    });
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. 获取搜索建议
    await getSearchSuggestions('论语');
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. 如果有搜索结果，获取第一本书的详细信息
    if (searchResult && searchResult.results.length > 0) {
      const firstBook = searchResult.results[0];
      const bookInfo = await getBookInfo(firstBook.bookId);
      console.log('\n' + '='.repeat(50) + '\n');
      
      // 6. 获取第一个章节的内容
      if (bookInfo.chapters && bookInfo.chapters.length > 0) {
        const firstChapter = bookInfo.chapters[0];
        await getChapterContent(firstBook.bookId, firstChapter.chapterId);
        console.log('\n' + '='.repeat(50) + '\n');
      }
      
      // 7. 提取内容片段
      await extractContentSnippets(firstBook.bookId, '学而', {
        maxSnippets: 3
      });
    }
    
    console.log('\n🎉 示例运行完成！');
    
  } catch (error) {
    console.error('\n💥 示例运行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  searchAncientTexts,
  getBookInfo,
  getChapterContent,
  extractContentSnippets,
  getSearchSuggestions,
  getPopularSearches,
  healthCheck
};
