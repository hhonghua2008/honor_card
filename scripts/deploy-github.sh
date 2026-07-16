#!/bin/bash
# HonorCard → GitHub Pages 一键部署
# 前提：已安装 gh 且 gh auth login 完成
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

SITE_URL="https://hhonghua2008.github.io/honor_card"

echo "🏆 HonorCard 部署到 GitHub Pages"
echo ""

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ 需要 GitHub CLI：brew install gh && gh auth login"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "❌ 请先登录：gh auth login"
  exit 1
fi

if ! gh repo view hhonghua2008/honor_card >/dev/null 2>&1; then
  echo "📦 创建仓库 hhonghua2008/honor_card ..."
  gh repo create honor_card --public --source=. --remote=origin --push
else
  git push -u origin main
fi

echo ""
echo "⚙️  启用 GitHub Pages（Actions 源）..."
gh api -X PUT repos/hhonghua2008/honor_card/pages \
  -f build_type=workflow \
  -f source[branch]=main \
  -f source[path]=/ 2>/dev/null || true

echo ""
echo "✅ 推送完成！Actions 会自动部署（约 2–5 分钟）"
echo "🌐 访问地址：$SITE_URL"
echo "   查看进度：gh run list --repo hhonghua2008/honor_card"
