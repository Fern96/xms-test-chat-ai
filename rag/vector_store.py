"""
向量知识库服务
使用 Sentence-Transformers 和 ChromaDB 实现语义检索
"""

import os
import json
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from pathlib import Path

class VectorKnowledgeBase:
    def __init__(self, persist_directory: str = "./chroma_db", model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        """
        初始化向量知识库
        
        Args:
            persist_directory: ChromaDB 持久化目录
            model_name: Sentence-Transformers 模型名称
                       默认使用多语言模型，支持中英文
        """
        # 初始化嵌入模型
        print(f"🔄 加载嵌入模型: {model_name}")
        self.embedding_model = SentenceTransformer(model_name)
        print(f"✅ 模型加载完成，向量维度: {self.embedding_model.get_sentence_embedding_dimension()}")
        
        # 初始化 ChromaDB 客户端
        self.chroma_client = chromadb.Client(Settings(
            persist_directory=persist_directory,
            anonymized_telemetry=False
        ))
        
        # 获取或创建集合
        self.collection = self.chroma_client.get_or_create_collection(
            name="knowledge_base",
            metadata={"description": "Chat Studio知识库向量存储"}
        )
        
        print(f"📚 向量数据库初始化完成，当前文档数: {self.collection.count()}")
    
    def add_document(self, doc_id: str, title: str, content: str, metadata: Dict[str, Any] = None) -> None:
        """
        添加文档到向量库
        
        Args:
            doc_id: 文档ID
            title: 文档标题
            content: 文档内容
            metadata: 元数据（分类、标签等）
        """
        # 合并标题和内容进行嵌入
        text_to_embed = f"{title}\n\n{content}"
        
        # 生成嵌入向量
        embedding = self.embedding_model.encode(text_to_embed).tolist()
        
        # 准备元数据
        meta = metadata or {}
        meta.update({
            "title": title,
            "content_length": len(content)
        })
        
        # 添加到 ChromaDB
        self.collection.add(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[content],
            metadatas=[meta]
        )
        
        print(f"✅ 文档已添加: {title} (ID: {doc_id})")
    
    def update_document(self, doc_id: str, title: str, content: str, metadata: Dict[str, Any] = None) -> None:
        """
        更新文档
        
        Args:
            doc_id: 文档ID
            title: 文档标题
            content: 文档内容
            metadata: 元数据
        """
        # 先删除旧文档
        try:
            self.collection.delete(ids=[doc_id])
        except:
            pass
        
        # 添加新文档
        self.add_document(doc_id, title, content, metadata)
        print(f"🔄 文档已更新: {title} (ID: {doc_id})")
    
    def delete_document(self, doc_id: str) -> None:
        """
        删除文档
        
        Args:
            doc_id: 文档ID
        """
        self.collection.delete(ids=[doc_id])
        print(f"🗑️  文档已删除: ID={doc_id}")
    
    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        语义搜索
        
        Args:
            query: 查询文本
            top_k: 返回前K个结果
            
        Returns:
            搜索结果列表，每个结果包含: id, title, content, score, metadata
        """
        # 生成查询向量
        query_embedding = self.embedding_model.encode(query).tolist()
        
        # 在 ChromaDB 中搜索
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        # 格式化结果
        formatted_results = []
        if results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                formatted_results.append({
                    "id": results['ids'][0][i],
                    "title": results['metadatas'][0][i].get('title', 'Unknown'),
                    "content": results['documents'][0][i],
                    "score": float(1 - results['distances'][0][i]),  # 转换距离为相似度
                    "metadata": results['metadatas'][0][i]
                })
        
        return formatted_results
    
    def sync_from_json(self, json_file_path: str) -> None:
        """
        从 JSON 文件同步数据到向量库
        
        Args:
            json_file_path: kb.json 文件路径
        """
        if not os.path.exists(json_file_path):
            print(f"⚠️  文件不存在: {json_file_path}")
            return
        
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        docs = data.get('docs', [])
        print(f"🔄 开始同步 {len(docs)} 个文档...")
        
        # 清空现有数据
        existing_ids = self.collection.get()['ids']
        if existing_ids:
            self.collection.delete(ids=existing_ids)
            print(f"🗑️  已清空 {len(existing_ids)} 个旧文档")
        
        # 批量添加文档
        for doc in docs:
            metadata = {
                "category": doc.get('category', ''),
                "tags": ','.join(doc.get('tags', [])),
                "type": doc.get('type', 'text')
            }
            self.add_document(
                doc_id=doc['id'],
                title=doc['title'],
                content=doc['content'],
                metadata=metadata
            )
        
        print(f"✅ 同步完成，共 {len(docs)} 个文档")

def main():
    """测试函数"""
    # 初始化向量库
    kb = VectorKnowledgeBase()
    
    # 测试搜索
    query = "React 是什么"
    results = kb.search(query, top_k=3)
    
    print(f"\n🔍 搜索: {query}")
    print(f"📊 找到 {len(results)} 个结果:\n")
    
    for i, result in enumerate(results, 1):
        print(f"{i}. {result['title']}")
        print(f"   相似度: {result['score']:.4f}")
        print(f"   内容: {result['content'][:100]}...")
        print()

if __name__ == "__main__":
    main()

