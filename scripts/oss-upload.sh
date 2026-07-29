#!/usr/bin/env bash
# 上传本地文件到阿里云 OSS（私有读，对象存储无 CDN），stdout 打印 12 小时签名 URL。
# 依赖：ossutil（默认 ~/.local/bin/ossutil）、~/.ossutilconfig
#
# 用法:
#   bash scripts/oss-upload.sh <local-file> [remote-key]
#   bash scripts/oss-upload.sh --dir <local-dir> [remote-prefix]
#   bash scripts/oss-upload.sh --rewrite-html <index.html>
#   bash scripts/oss-upload.sh --sign <remote-key>   # 仅对已有对象重新签名
#
# 环境变量（可选）:
#   OSS_BUCKET        默认 agent-17718139319
#   OSS_REGION        默认 oss-cn-beijing
#   OSS_PREFIX        默认 era/assets
#   OSS_SIGN_TIMEOUT  签名有效期秒数，默认 43200（12 小时）
#   OSSUTIL           ossutil 可执行路径
set -euo pipefail

OSSUTIL="${OSSUTIL:-${HOME}/.local/bin/ossutil}"
BUCKET="${OSS_BUCKET:-agent-17718139319}"
REGION="${OSS_REGION:-oss-cn-beijing}"
PREFIX="${OSS_PREFIX:-era/assets}"
SIGN_TIMEOUT="${OSS_SIGN_TIMEOUT:-43200}"

if [[ ! -x "$OSSUTIL" ]]; then
  if command -v ossutil >/dev/null 2>&1; then
    OSSUTIL="$(command -v ossutil)"
  else
    echo "错误: 找不到 ossutil。请安装到 ~/.local/bin/ossutil 或设置 OSSUTIL。" >&2
    exit 1
  fi
fi

if [[ ! -f "${HOME}/.ossutilconfig" ]]; then
  echo "错误: 缺少 ~/.ossutilconfig。请先配置 AccessKey。" >&2
  exit 1
fi

# 对象保持私有；返回带 Expires / OSSAccessKeyId / Signature 的临时 URL（默认 12h）
sign_url() {
  local key="$1"
  local raw
  raw="$("$OSSUTIL" sign "oss://${BUCKET}/${key}" --timeout "$SIGN_TIMEOUT" 2>/dev/null | grep -Eo 'https?://[^[:space:]]+' | tail -1)"
  if [[ -z "$raw" ]]; then
    echo "错误: 签名失败 oss://${BUCKET}/${key}" >&2
    exit 1
  fi
  # 统一 https，避免混合内容
  if [[ "$raw" == http://* ]]; then
    echo "https://${raw#http://}"
  else
    echo "$raw"
  fi
}

upload_one() {
  local local_path="$1"
  local key="$2"
  if [[ ! -f "$local_path" ]]; then
    echo "错误: 文件不存在: $local_path" >&2
    exit 1
  fi
  "$OSSUTIL" cp "$local_path" "oss://${BUCKET}/${key}" -f >/dev/null
  # 强制对象私有，防止误设公共读导致盗刷
  "$OSSUTIL" set-acl "oss://${BUCKET}/${key}" private -f >/dev/null 2>&1 || true
  sign_url "$key"
}

rewrite_html() {
  local html_path="$1"
  node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/oss-rewrite-html.mjs" "$html_path"
}

case "${1:-}" in
  --dir)
    local_dir="${2:?需要本地目录}"
    remote_prefix="${3:-${PREFIX}/$(basename "$local_dir")-$(date +%Y%m%d-%H%M%S)}"
    find "$local_dir" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' -o -iname '*.svg' \) | while read -r f; do
      rel="${f#"$local_dir"/}"
      key="${remote_prefix%/}/${rel}"
      url="$(upload_one "$f" "$key")"
      echo "$url"
    done
    ;;
  --rewrite-html)
    rewrite_html "${2:?需要 HTML 路径}"
    ;;
  --sign)
    sign_url "${2:?需要 object key}"
    ;;
  -h|--help)
    sed -n '2,20p' "$0"
    ;;
  *)
    local_file="${1:?需要本地文件路径}"
    remote_key="${2:-${PREFIX}/$(date +%Y%m%d-%H%M%S)/$(basename "$local_file")}"
    upload_one "$local_file" "$remote_key"
    ;;
esac
