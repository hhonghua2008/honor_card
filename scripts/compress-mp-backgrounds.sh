#!/bin/bash
# 生成小程序用压缩背景（JPEG，约 100–200KB）
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$DIR/assets/templates"
count=0

for src in "$SRC"/*-web.png; do
  [ -f "$src" ] || continue
  base=$(basename "$src" -web.png)
  out="$SRC/${base}-mp.jpg"
  # 最长边 1024，JPEG 质量约 72
  sips -s format jpeg -s formatOptions 72 -Z 1024 "$src" --out "$out" >/dev/null
  size=$(wc -c < "$out" | tr -d ' ')
  echo "→ ${base}-mp.jpg ($((size / 1024))KB)"
  count=$((count + 1))
done

echo "✅ 已生成 $count 张小程序背景图"
