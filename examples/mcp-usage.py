#!/usr/bin/env python3
"""
古籍MCP服务器MCP协议使用示例
"""

import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

class GujiMCPClient:
    """古籍MCP客户端"""
    
    def __init__(self):
        self.session = None
    
    async def connect(self):
        """连接到MCP服务器"""
        try:
            print("🔌 连接到古籍MCP服务器...")
            
            # 配置MCP服务器参数
            server_params = StdioServerParameters(
                command="node",
                args=["dist/index.js"],
                env={"NODE_ENV": "production"}
            )
            
            # 建立连接
            self.read, self.write = await stdio_client(server_params)
            self.session = ClientSession(self.read, self.write)
            
            print("✅ 连接成功！")
            return True
            
        except Exception as e:
            print(f"❌ 连接失败: {e}")
            return False
    
    async def disconnect(self):
        """断开连接"""
        if self.session:
            await self.session.close()
            print("🔌 连接已断开")
    
    async def search_ancient_texts(self, keyword, **kwargs):
        """搜索古籍内容"""
        try:
            print(f"🔍 搜索古籍: {keyword}")
            
            params = {
                "keyword": keyword,
                "limit": kwargs.get("limit", 10),
                "page": kwargs.get("page", 1),
                "category": kwargs.get("category"),
                "dynasty": kwargs.get("dynasty"),
                "author": kwargs.get("author"),
                "sortBy": kwargs.get("sortBy", "relevance"),
                "sortOrder": kwargs.get("sortOrder", "desc")
            }
            
            # 调用MCP工具
            result = await self.session.call_tool(
                "search_ancient_texts",
                params
            )
            
            if result.content and len(result.content) > 0:
                data = json.loads(result.content[0].text)
                print(f"✅ 搜索成功: 找到 {data.get('totalResults', 0)} 个结果")
                
                # 显示搜索结果
                for i, item in enumerate(data.get('results', [])[:5]):
                    print(f"\n{i+1}. {item.get('title', '未知标题')}")
                    print(f"   作者: {item.get('author', '未知')} ({item.get('dynasty', '未知')})")
                    print(f"   分类: {item.get('category', '未知')}")
                    print(f"   摘要: {item.get('snippet', '无摘要')}")
                    print(f"   相关性: {item.get('relevanceScore', 0)*100:.1f}%")
                
                return data
            else:
                print("❌ 搜索失败: 无结果")
                return None
                
        except Exception as e:
            print(f"❌ 搜索失败: {e}")
            return None
    
    async def extract_book_info(self, book_id):
        """提取书籍信息"""
        try:
            print(f"📚 提取书籍信息: {book_id}")
            
            result = await self.session.call_tool(
                "extract_book_info",
                {"bookId": book_id}
            )
            
            if result.content and len(result.content) > 0:
                data = json.loads(result.content[0].text)
                print(f"✅ 提取成功: {data.get('title', '未知标题')}")
                print(f"   作者: {data.get('author', '未知')} ({data.get('dynasty', '未知')})")
                print(f"   分类: {data.get('category', '未知')}")
                print(f"   章节数: {data.get('totalChapters', 0)}")
                print(f"   描述: {data.get('description', '无描述')}")
                
                return data
            else:
                print("❌ 提取失败: 无结果")
                return None
                
        except Exception as e:
            print(f"❌ 提取失败: {e}")
            return None
    
    async def extract_content_snippets(self, book_id, keyword=None, **kwargs):
        """提取内容片段"""
        try:
            print(f"🔍 提取内容片段: {book_id} - {keyword or '全部'}")
            
            params = {
                "bookId": book_id,
                "maxSnippets": kwargs.get("maxSnippets", 5),
                "contextLength": kwargs.get("contextLength", 200),
                "enableLocalCache": kwargs.get("enableLocalCache", True)
            }
            
            if keyword:
                params["keyword"] = keyword
            
            result = await self.session.call_tool(
                "extract_content_snippets",
                params
            )
            
            if result.content and len(result.content) > 0:
                data = json.loads(result.content[0].text)
                print(f"✅ 提取成功: 找到 {len(data)} 个片段")
                
                # 显示片段
                for i, snippet in enumerate(data[:3]):
                    print(f"\n片段 {i+1}:")
                    print(f"章节: {snippet.get('chapterTitle', '未知')}")
                    print(f"内容: {snippet.get('content', '无内容')}")
                    print(f"相关性: {snippet.get('relevanceScore', 0)*100:.1f}%")
                
                return data
            else:
                print("❌ 提取失败: 无结果")
                return None
                
        except Exception as e:
            print(f"❌ 提取失败: {e}")
            return None
    
    async def get_chapter_content(self, book_id, chapter_id, **kwargs):
        """获取章节内容"""
        try:
            print(f"📖 获取章节内容: {book_id}/{chapter_id}")
            
            params = {
                "bookId": book_id,
                "chapterId": chapter_id,
                "includeAnnotations": kwargs.get("includeAnnotations", True),
                "includeFootnotes": kwargs.get("includeFootnotes", True)
            }
            
            result = await self.session.call_tool(
                "get_chapter_content",
                params
            )
            
            if result.content and len(result.content) > 0:
                data = json.loads(result.content[0].text)
                print(f"✅ 获取成功: {data.get('chapterTitle', '未知章节')}")
                print(f"\n内容:")
                print(data.get('content', '无内容'))
                
                # 显示注释
                annotations = data.get('annotations', [])
                if annotations:
                    print(f"\n注释:")
                    for i, annotation in enumerate(annotations[:3]):
                        print(f"{i+1}. {annotation}")
                
                return data
            else:
                print("❌ 获取失败: 无结果")
                return None
                
        except Exception as e:
            print(f"❌ 获取失败: {e}")
            return None
    
    async def analyze_content_themes(self, content, max_themes=10):
        """分析内容主题"""
        try:
            print(f"🧠 分析内容主题: {len(content)} 字符")
            
            result = await self.session.call_tool(
                "analyze_content_themes",
                {
                    "content": content,
                    "maxThemes": max_themes
                }
            )
            
            if result.content and len(result.content) > 0:
                data = json.loads(result.content[0].text)
                themes = data.get('themes', [])
                print(f"✅ 分析成功: 找到 {len(themes)} 个主题")
                
                # 显示主题
                for i, theme in enumerate(themes[:5]):
                    print(f"{i+1}. {theme.get('word', '未知')} ({theme.get('count', 0)} 次)")
                
                return data
            else:
                print("❌ 分析失败: 无结果")
                return None
                
        except Exception as e:
            print(f"❌ 分析失败: {e}")
            return None

async def main():
    """主函数 - 演示MCP协议使用"""
    client = GujiMCPClient()
    
    try:
        # 连接到MCP服务器
        if not await client.connect():
            return
        
        print("\n" + "="*50)
        
        # 1. 搜索古籍内容
        search_result = await client.search_ancient_texts("论语", limit=3, category="经部")
        print("\n" + "="*50)
        
        # 2. 如果有搜索结果，获取第一本书的详细信息
        if search_result and search_result.get('results'):
            first_book = search_result['results'][0]
            book_id = first_book.get('bookId')
            
            if book_id:
                book_info = await client.extract_book_info(book_id)
                print("\n" + "="*50)
                
                # 3. 获取第一个章节的内容
                if book_info and book_info.get('chapters'):
                    first_chapter = book_info['chapters'][0]
                    chapter_id = first_chapter.get('chapterId')
                    
                    if chapter_id:
                        chapter_content = await client.get_chapter_content(book_id, chapter_id)
                        print("\n" + "="*50)
                        
                        # 4. 分析章节内容主题
                        if chapter_content and chapter_content.get('content'):
                            await client.analyze_content_themes(chapter_content['content'])
                            print("\n" + "="*50)
                
                # 5. 提取内容片段
                await client.extract_content_snippets(book_id, "学而", maxSnippets=3)
        
        print("\n🎉 MCP协议示例运行完成！")
        
    except KeyboardInterrupt:
        print("\n⏹️ 用户中断")
    except Exception as e:
        print(f"\n💥 运行失败: {e}")
    finally:
        # 断开连接
        await client.disconnect()

if __name__ == "__main__":
    # 运行主函数
    asyncio.run(main())
