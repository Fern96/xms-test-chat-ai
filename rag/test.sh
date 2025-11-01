#!/bin/bash

# RAG 向量检索系统测试脚本

echo "🧪 开始测试 RAG 向量检索系统..."
echo ""

# 检查向量服务是否运行
echo "1️⃣ 检查向量检索服务状态..."
HEALTH_CHECK=$(curl -s http://localhost:5001/health 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ 向量检索服务运行中"
    echo "   $HEALTH_CHECK"
else
    echo "❌ 向量检索服务未运行"
    echo "   请先启动: cd rag && ./start.sh"
    exit 1
fi

echo ""
echo "2️⃣ 测试语义搜索..."
SEARCH_RESULT=$(curl -s -X POST http://localhost:5001/search \
    -H "Content-Type: application/json" \
    -d '{"query": "React 是什么框架", "top_k": 2}')

if echo "$SEARCH_RESULT" | grep -q "results"; then
    echo "✅ 语义搜索成功"
    echo "$SEARCH_RESULT" | python3 -m json.tool 2>/dev/null || echo "$SEARCH_RESULT"
else
    echo "❌ 语义搜索失败"
    echo "$SEARCH_RESULT"
fi

echo ""
echo "3️⃣ 测试数据同步..."
SYNC_RESULT=$(curl -s -X POST http://localhost:5001/sync)

if echo "$SYNC_RESULT" | grep -q "message"; then
    echo "✅ 数据同步成功"
    echo "$SYNC_RESULT" | python3 -m json.tool 2>/dev/null || echo "$SYNC_RESULT"
else
    echo "❌ 数据同步失败"
    echo "$SYNC_RESULT"
fi

echo ""
echo "4️⃣ 测试多语言支持（中英文）..."
EN_RESULT=$(curl -s -X POST http://localhost:5001/search \
    -H "Content-Type: application/json" \
    -d '{"query": "What is React framework", "top_k": 1}')

if echo "$EN_RESULT" | grep -q "results"; then
    echo "✅ 英文搜索成功"
else
    echo "❌ 英文搜索失败"
fi

echo ""
echo "🎉 测试完成！"
echo ""
echo "📖 使用指南:"
echo "   - 启动向量服务: cd rag && ./start.sh"
echo "   - 启动前后端: pnpm dev"
echo "   - 查看详细文档: cat rag/README.md"
