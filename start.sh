#!/bin/bash
# HonorCard 一键启动脚本
# 用法: chmod +x start.sh && ./start.sh

PORT=${1:-8787}
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🏆 HonorCard 启动中..."
echo "   目录: $DIR"
echo "   端口: $PORT"
echo ""

# 检查端口占用
if lsof -i :$PORT >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，尝试使用..."
    echo "   如需更换端口: ./start.sh 8080"
else
    cd "$DIR" && python3 -m http.server $PORT --bind 127.0.0.1 &
    SERVER_PID=$!
    sleep 1
    
    if kill -0 $SERVER_PID 2>/dev/null; then
        echo "✅ 服务器已启动!"
        echo "   PID: $SERVER_PID"
        echo ""
        echo "🌐 打开浏览器访问:"
        echo "   http://127.0.0.1:$PORT"
        echo ""
        echo "按 Ctrl+C 停止服务器"
        wait $SERVER_PID
    else
        echo "❌ 启动失败"
        exit 1
    fi
fi
