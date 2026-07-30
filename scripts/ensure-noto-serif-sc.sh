#!/usr/bin/env bash
# 下载正文宋体（Noto Serif SC）到 public/fonts，供封面出图与 Era 导出使用。
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/public/fonts"
mkdir -p "$DIR"
REG="$DIR/NotoSerifSC-Regular.ttf"
BOLD="$DIR/NotoSerifSC-Bold.ttf"
REG_URL="https://fonts.gstatic.com/s/notoserifsc/v35/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7SCqyWv.ttf"
BOLD_URL="https://fonts.gstatic.com/s/notoserifsc/v35/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7RlrCWv.ttf"

need=0
[[ -f "$REG" && -s "$REG" ]] || need=1
[[ -f "$BOLD" && -s "$BOLD" ]] || need=1
if [[ "$need" -eq 0 ]]; then
  echo "noto-serif-sc: already present"
  exit 0
fi

echo "noto-serif-sc: downloading…"
curl -fsSL -o "$REG" "$REG_URL"
curl -fsSL -o "$BOLD" "$BOLD_URL"
ls -lh "$REG" "$BOLD"
