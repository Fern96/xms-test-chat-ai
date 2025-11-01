# RAG 向量检索服务

基于 Sentence-Transformers 和 ChromaDB 的语义检索系统

## 🚀 快速开始

### 1. 安装依赖

```bash
cd rag

# 使用 uv 安装（推荐）
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv pip install -e .
```

### 2. 启动服务

```bash
# 方法1: 使用启动脚本（推荐）
chmod +x start.sh
./start.sh

# 方法2: 手动启动
python api_server.py
```

服务默认运行在 **端口 5001**

### 3. 验证服务

```bash
# 健康检查
curl http://localhost:5001/health

# 同步知识库数据
curl -X POST http://localhost:5001/sync

# 语义搜索测试
curl -X POST http://localhost:5001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "React是什么", "top_k": 3}'
```

## 📚 技术架构

### 核心组件

1. **Sentence-Transformers** - 多语言文本嵌入
   - 模型: `paraphrase-multilingual-MiniLM-L12-v2`
   - 维度: 384
   - 支持: 中文、英文及其他50+语言

2. **ChromaDB** - 向量数据库
   - 本地持久化存储
   - 支持相似度搜索
   - 自动索引管理

3. **Flask** - REST API 服务
   - 端口: 5001（可通过环境变量配置）
   - 支持 CORS 跨域

### 工作流程

```
用户查询
    ↓
Node.js 后端 (chat.js)
    ↓
HTTP 请求 → Python Flask API (5001端口)
    ↓
Sentence-Transformers 编码 → 向量嵌入
    ↓
ChromaDB 相似度搜索 → Top-K 结果
    ↓
返回结果 → 注入到 AI 上下文
    ↓
AI 生成回答（带引用）
```

## 🔌 API 接口

### 1. 健康检查

```http
GET /health
```

**响应**:
```json
{
  "status": "ok",
  "count": 10
}
```

### 2. 语义搜索

```http
POST /search
Content-Type: application/json

{
  "query": "搜索内容",
  "top_k": 3
}
```

**响应**:
```json
{
  "results": [
    {
      "id": "doc_123",
      "title": "文档标题",
      "content": "文档内容...",
      "score": 0.856,
      "metadata": {
        "category": "技术",
        "tags": "React,前端"
      }
    }
  ]
}
```

### 3. 同步数据

```http
POST /sync
```

从 `server/data/kb.json` 同步所有文档到向量库

### 4. 添加文档

```http
POST /add
Content-Type: application/json

{
  "id": "doc_123",
  "title": "文档标题",
  "content": "文档内容",
  "metadata": {
    "category": "技术",
    "tags": "React"
  }
}
```

### 5. 更新文档

```http
POST /update
Content-Type: application/json

{
  "id": "doc_123",
  "title": "新标题",
  "content": "新内容"
}
```

### 6. 删除文档

```http
POST /delete
Content-Type: application/json

{
  "id": "doc_123"
}
```

## 🔧 配置

### 环境变量

```bash
# 服务端口（默认: 5001）
export VECTOR_PORT=5001

# ChromaDB 存储路径（默认: ./chroma_db）
export CHROMA_DB_PATH=./chroma_db
```

### 模型配置

可在 `vector_store.py` 中修改嵌入模型：

```python
# 多语言模型（默认）
model_name = "paraphrase-multilingual-MiniLM-L12-v2"

# 中文优化模型
# model_name = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"

# 英文专用模型
# model_name = "all-MiniLM-L6-v2"
```

## 🎯 集成说明

### Node.js 后端集成

已在 `server/routes/chat.js` 中集成：

```javascript
// 自动调用向量检索
const results = await fetch('http://localhost:5001/search', {
  method: 'POST',
  body: JSON.stringify({ query, top_k: 3 })
});

// 降级到关键词匹配（当向量服务不可用时）
if (!results.ok) {
  // 使用原有的 N-gram 关键词匹配
}
```

### 自动同步

知识库每次更新（增删改）时，自动同步到向量库：

```javascript
// server/routes/kb.js
function writeStore(store) {
  fs.writeFileSync(kbFile, JSON.stringify(store));
  syncToVectorStore(); // 自动同步
}
```

## 📊 性能优化

### 相似度阈值

默认只返回相似度 > 0.3 的结果：

```python
# vector_store.py
filtered = results.filter(r => r.score > 0.3)
```

### 批量处理

首次同步时批量添加文档，避免重复计算：

```python
kb.sync_from_json('kb.json')  # 批量同步
```

### 模型缓存

Sentence-Transformers 自动缓存模型到 `~/.cache/torch/sentence_transformers/`

## 🐛 故障排查

### 1. 服务无法启动

```bash
# 检查端口占用
lsof -i :5001

# 检查 Python 环境
which python
python --version
```

### 2. 模型下载失败

```bash
# 使用国内镜像
export HF_ENDPOINT=https://hf-mirror.com

# 手动下载模型
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')"
```

### 3. ChromaDB 错误

```bash
# 清空数据重建
rm -rf chroma_db/
python api_server.py
```

## 📝 注意事项

1. **首次启动**: 会自动下载模型（约 400MB），请耐心等待
2. **内存占用**: 建议至少 2GB 可用内存
3. **降级机制**: 向量服务不可用时，自动降级到关键词匹配
4. **数据持久化**: ChromaDB 数据存储在 `chroma_db/` 目录

## 🔗 相关资源

- [Sentence-Transformers 文档](https://www.sbert.net/)
- [ChromaDB 文档](https://docs.trychroma.com/)
- [Flask 文档](https://flask.palletsprojects.com/)
