#!/bin/bash
# HonorCard → GitHub Pages 一键部署
# 前提：已安装 gh 且 gh auth login 完成
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

SITE_URL="https://hhonghua2008.github.io/honor_card"

echo "🏆 HonorCard 部署到 GitHub Pages"
echo ""

GH="${GH_BIN:-gh}"
if ! command -v "$GH" >/dev/null 2>&1 && [ -x /tmp/gh_2.65.0_macOS_arm64/bin/gh ]; then
  GH=/tmp/gh_2.65.0_macOS_arm64/bin/gh
fi

if git ls-remote git@github.com:hhonghua2008/honor_card.git >/dev/null 2>&1; then
  echo "📤 推送到已有仓库 ..."
  git push -u origin main
elif command -v "$GH" >/dev/null 2>&1 && "$GH" auth status >/dev/null 2>&1; then
  echo "📦 创建仓库 hhonghua2008/honor_card ..."
  "$GH" repo create honor_card --public --source=. --remote=origin --push
else
  echo "❌ 远程仓库尚不存在。"
  echo "   请在浏览器打开：https://github.com/new?name=honor_card"
  echo "   创建公开空仓库（不要勾选 README），然后重新运行本脚本。"
  exit 1
fi

if command -v "$GH" >/dev/null 2>&1 && "$GH" auth status >/dev/null 2>&1; then
  echo ""
  echo "⚙️  启用 GitHub Pages（Actions 源）..."
  "$GH" api -X PUT repos/hhonghua2008/honor_card/pages \
    -f build_type=workflow \
    -f source[branch]=main \
    -f source[path]=/ 2>/dev/null || true
fi

echo ""
echo "✅ 推送完成！Actions 会自动部署（约 2–5 分钟）"
echo "🌐 访问地址：$SITE_URL"
echo "   查看进度：gh run list --repo hhonghua2008/honor_card"
