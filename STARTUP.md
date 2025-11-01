# 🚀 Chat Studio 启动指南

本指南将帮助您快速启动完整的 Chat Studio 系统（包括向量检索服务）。

## 📋 前置要求

确保您的系统已安装以下工具：

- **Node.js** >= 18
- **pnpm** >= 8  
- **Python** >= 3.12
- **uv** (Python 包管理器) - [安装指南](https://docs.astral.sh/uv/)

### 安装 uv (如果未安装)

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# 或使用 pip
pip install uv
```

## 🔧 一次性安装步骤

### 1. 安装前后端依赖

```bash
# 在项目根目录
pnpm install:all
```

### 2. 安装 Python 向量检索服务依赖

```bash
cd rag

# 创建虚拟环境
uv venv

# 激活虚拟环境
source .venv/bin/activate  # macOS/Linux
# 或
.venv\Scripts\activate     # Windows

# 安装依赖
uv pip install -e .

# 返回项目根目录
cd ..
```

**注意**: 首次安装时，Sentence-Transformers 会自动下载模型（约 400MB），请耐心等待。

## 🎯 启动服务

### 完整启动（推荐）

需要开启 **3 个终端窗口**：

#### 终端 1: 向量检索服务

```bash
cd rag
./start.sh
```

**预期输出**:
```
🔄 加载嵌入模型: paraphrase-multilingual-MiniLM-L12-v2
✅ 模型加载完成，向量维度: 384
📚 向量数据库初始化完成，当前文档数: 0
🔄 首次启动，同步知识库数据...
✅ 同步完成，共 X 个文档

🚀 向量检索服务启动在端口 5001
📚 当前文档数: X
🔗 API 地址: http://localhost:5001
```

#### 终端 2 & 3: 前后端服务

```bash
# 同时启动前后端
pnpm dev

# 或分别启动
pnpm client:dev  # 终端 2
pnpm server:dev  # 终端 3
```

**预期输出**:
```
前端: http://localhost:5173
后端: http://localhost:3001
```

### 降级模式（无向量检索）

如果不需要向量检索，可以只启动前后端：

```bash
pnpm dev
```

系统会自动降级到关键词匹配模式。

## ✅ 验证安装

### 1. 检查向量服务

```bash
# 健康检查
curl http://localhost:5001/health

# 应返回:
# {"status":"ok","count":10}
```

### 2. 运行测试脚本

```bash
cd rag
./test.sh
```

### 3. 手动测试搜索

```bash
curl -X POST http://localhost:5001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "React是什么", "top_k": 3}'
```

### 4. 访问前端

打开浏览器访问: http://localhost:5173

- 点击侧边栏的「知识库」按钮
- 启用「使用知识库」开关
- 发送问题，观察 AI 是否引用知识库内容

## 🐛 常见问题

### 问题 1: 向量服务启动失败

**症状**: `ModuleNotFoundError: No module named 'chromadb'`

**解决方案**:
```bash
cd rag
source .venv/bin/activate
uv pip install -e .
```

### 问题 2: 模型下载缓慢

**症状**: 下载 Sentence-Transformers 模型很慢

**解决方案**:
```bash
# 使用 Hugging Face 国内镜像
export HF_ENDPOINT=https://hf-mirror.com

# 手动下载模型
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')"
```

### 问题 3: 端口被占用

**症状**: `Address already in use: 5001`

**解决方案**:
```bash
# 检查端口占用
lsof -i :5001

# 杀死占用进程
kill -9 <PID>

# 或使用其他端口
export VECTOR_PORT=5002
./start.sh
```

### 问题 4: ChromaDB 数据损坏

**症状**: `chromadb.errors.InvalidCollectionException`

**解决方案**:
```bash
# 删除向量数据库并重建
cd rag
rm -rf chroma_db/
python api_server.py  # 会自动重建
```

### 问题 5: 知识库搜索无结果

**症状**: AI 回复不包含知识库引用

**检查步骤**:
1. 确认向量服务正在运行: `curl http://localhost:5001/health`
2. 检查知识库是否有数据: 打开侧边栏「知识库」
3. 确认已启用「使用知识库」开关
4. 查看后端日志，确认是否调用了向量检索

## 📊 系统架构

```
用户浏览器 (localhost:5173)
    ↓
Node.js 后端 (localhost:3001)
    ↓
Python 向量服务 (localhost:5001)
    ↓
┌─────────────────────────┐
│ Sentence-Transformers   │ ← 文本嵌入
│ ChromaDB                │ ← 向量存储
└─────────────────────────┘
```

## 🔄 日常使用

### 启动开发环境

```bash
# 终端 1
cd rag && ./start.sh

# 终端 2
pnpm dev
```

### 停止服务

```bash
# 终端 1 (向量服务): Ctrl+C
# 终端 2 (前后端): Ctrl+C
```

### 更新知识库

知识库更新会自动同步到向量库：

1. 在前端添加/编辑/删除文档
2. 后端自动调用 `/sync` 接口
3. 向量库自动更新

### 手动同步

```bash
curl -X POST http://localhost:5001/sync
```

## 📚 进阶使用

### 更换嵌入模型

编辑 `rag/vector_store.py`:

```python
# 多语言模型（默认）
model_name = "paraphrase-multilingual-MiniLM-L12-v2"

# 中文优化模型（更适合中文）
model_name = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"

# 英文专用（更快）
model_name = "all-MiniLM-L6-v2"
```

### 调整相似度阈值

编辑 `server/routes/chat.js`:

```javascript
// 默认阈值 0.3
const filtered = results.filter(r => r.score > 0.3);

// 更严格（更精准）
const filtered = results.filter(r => r.score > 0.5);

// 更宽松（召回更多）
const filtered = results.filter(r => r.score > 0.2);
```

### 监控服务状态

```bash
# 检查向量服务
curl http://localhost:5001/health

# 检查后端
curl http://localhost:3001/api/config/models

# 查看向量服务日志
cd rag && tail -f nohup.out  # 如果后台运行
```

## 🎓 学习资源

- [Sentence-Transformers 文档](https://www.sbert.net/)
- [ChromaDB 文档](https://docs.trychroma.com/)
- [RAG 原理详解](./rag/README.md)

## 💡 提示

1. **首次启动**: 模型下载需要时间，请耐心等待
2. **内存占用**: 建议至少 2GB 可用内存
3. **降级机制**: 向量服务不可用时自动降级到关键词匹配
4. **性能优化**: 向量服务可以后台运行，无需每次启动

---

**遇到问题？** 请查看 [FAQ](./rag/README.md#故障排查) 或提交 Issue
