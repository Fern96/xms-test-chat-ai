#!/bin/bash

# 向量检索服务启动脚本

cd "$(dirname "$0")"

echo "🔍 启动向量检索服务..."

# 检查虚拟环境
if [ ! -d ".venv" ]; then
    echo "⚠️  虚拟环境不存在，正在创建..."
    uv venv
fi

# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
echo "📦 检查依赖..."
uv pip install -e .

# 启动服务
echo "🚀 启动 API 服务器..."
python api_server.py
