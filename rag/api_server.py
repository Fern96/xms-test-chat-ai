"""
向量检索 HTTP 服务
提供 REST API 供 Node.js 调用
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from vector_store import VectorKnowledgeBase
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

# 初始化向量知识库
KB_JSON_PATH = Path(__file__).parent.parent / "server" / "data" / "kb.json"
CHROMA_DB_PATH = Path(__file__).parent / "chroma_db"

kb = VectorKnowledgeBase(
    persist_directory=str(CHROMA_DB_PATH),
    model_name="paraphrase-multilingual-MiniLM-L12-v2"  # 支持中英文
)

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({"status": "ok", "count": kb.collection.count()})

@app.route('/search', methods=['POST'])
def search():
    """
    语义搜索接口
    
    Request Body:
        {
            "query": "搜索查询",
            "top_k": 3
        }
    
    Response:
        {
            "results": [
                {
                    "id": "doc_id",
                    "title": "标题",
                    "content": "内容",
                    "score": 0.95,
                    "metadata": {...}
                }
            ]
        }
    """
    data = request.json
    query = data.get('query', '')
    top_k = data.get('top_k', 3)
    
    if not query:
        return jsonify({"error": "查询不能为空"}), 400
    
    try:
        results = kb.search(query, top_k=top_k)
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sync', methods=['POST'])
def sync():
    """
    从 kb.json 同步数据
    
    Response:
        {
            "message": "同步成功",
            "count": 10
        }
    """
    try:
        kb.sync_from_json(str(KB_JSON_PATH))
        return jsonify({
            "message": "同步成功",
            "count": kb.collection.count()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/add', methods=['POST'])
def add_document():
    """
    添加文档
    
    Request Body:
        {
            "id": "doc_id",
            "title": "标题",
            "content": "内容",
            "metadata": {...}
        }
    """
    data = request.json
    doc_id = data.get('id')
    title = data.get('title')
    content = data.get('content')
    metadata = data.get('metadata', {})
    
    if not all([doc_id, title, content]):
        return jsonify({"error": "缺少必需字段"}), 400
    
    try:
        kb.add_document(doc_id, title, content, metadata)
        return jsonify({"message": "添加成功"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/update', methods=['POST'])
def update_document():
    """
    更新文档
    
    Request Body:
        {
            "id": "doc_id",
            "title": "标题",
            "content": "内容",
            "metadata": {...}
        }
    """
    data = request.json
    doc_id = data.get('id')
    title = data.get('title')
    content = data.get('content')
    metadata = data.get('metadata', {})
    
    if not all([doc_id, title, content]):
        return jsonify({"error": "缺少必需字段"}), 400
    
    try:
        kb.update_document(doc_id, title, content, metadata)
        return jsonify({"message": "更新成功"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/delete', methods=['POST'])
def delete_document():
    """
    删除文档
    
    Request Body:
        {
            "id": "doc_id"
        }
    """
    data = request.json
    doc_id = data.get('id')
    
    if not doc_id:
        return jsonify({"error": "缺少文档ID"}), 400
    
    try:
        kb.delete_document(doc_id)
        return jsonify({"message": "删除成功"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # 首次启动时同步数据
    if os.path.exists(KB_JSON_PATH):
        print("🔄 首次启动，同步知识库数据...")
        kb.sync_from_json(str(KB_JSON_PATH))
    
    # 启动服务
    port = int(os.environ.get('VECTOR_PORT', 5001))
    print(f"\n🚀 向量检索服务启动在端口 {port}")
    print(f"📚 当前文档数: {kb.collection.count()}")
    print(f"🔗 API 地址: http://localhost:{port}\n")
    
    app.run(host='0.0.0.0', port=port, debug=False)
