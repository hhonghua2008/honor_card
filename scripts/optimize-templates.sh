#!/bin/bash
# 批量生成模板 WebP 与画廊缩略图
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$DIR/assets/templates"
THUMB="$SRC/thumbs"
mkdir -p "$THUMB"

has_cwebp=0
command -v cwebp >/dev/null 2>&1 && has_cwebp=1

for png in "$SRC"/tpl-*.png; do
  [ -f "$png" ] || continue
  base=$(basename "$png" .png)
  echo "→ $base"

  # 缩略图 400px 宽 JPEG（画廊用，体积小）
  sips -Z 400 "$png" --out "$THUMB/${base}.jpg" >/dev/null 2>&1

  if [ "$has_cwebp" = 1 ]; then
    cwebp -q 82 "$png" -o "$SRC/${base}.webp" 2>/dev/null
  else
    # 无 cwebp 时用 sips 缩小 PNG 作为 web 版
    sips -Z 1200 "$png" --out "$SRC/${base}-web.png" >/dev/null 2>&1
  fi
done

echo "✅ 完成。缩略图 → $THUMB/"
if [ "$has_cwebp" = 1 ]; then echo "   WebP → $SRC/*.webp"; else echo "   降级 web PNG → *-web.png"; fi
