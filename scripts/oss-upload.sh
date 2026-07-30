#!/usr/bin/env bash
# 上传本地文件到阿里云 OSS（私有读，对象存储无 CDN），stdout 打印 12 小时签名 URL。
# 封面图（文件名含 __cover_keep__，或识别为 cover*）：永久保留 + 公共读（查看无过期）。
# 存图前会自动调用 oss-cleanup-expired.sh，删除前缀下超过 14 小时的旧对象（省存储费；跳过封面标记）。
# 依赖：ossutil（默认 ~/.local/bin/ossutil）、~/.ossutilconfig
#
# 用法:
#   bash scripts/oss-upload.sh <local-file> [remote-key]
#   bash scripts/oss-upload.sh --cover <local-file> [remote-key]   # 强制按封面（永久）上传
#   bash scripts/oss-upload.sh --dir <local-dir> [remote-prefix]
#   bash scripts/oss-upload.sh --rewrite-html <index.html>
#   bash scripts/oss-upload.sh --sign <remote-key>   # 仅对已有对象重新签名（不触发清理）
#
# 环境变量（可选）:
#   OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET
#                     Cursor Cloud Secrets 注入；若无 ~/.ossutilconfig 则自动写入
#   OSS_ENDPOINT      默认 oss-cn-beijing.aliyuncs.com
#   OSS_BUCKET        默认 agent-17718139319
#   OSS_REGION        默认 oss-cn-beijing
#   OSS_PREFIX        默认 era/assets
#   OSS_SIGN_TIMEOUT  签名有效期秒数，默认 43200（12 小时）；封面图不使用签名
#   OSSUTIL           ossutil 可执行路径
#   OSS_SKIP_CLEANUP=1  跳过上传前的过期清理
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OSSUTIL="${OSSUTIL:-${HOME}/.local/bin/ossutil}"
BUCKET="${OSS_BUCKET:-agent-17718139319}"
REGION="${OSS_REGION:-oss-cn-beijing}"
PREFIX="${OSS_PREFIX:-era/assets}"
SIGN_TIMEOUT="${OSS_SIGN_TIMEOUT:-43200}"
ENDPOINT="${OSS_ENDPOINT:-oss-cn-beijing.aliyuncs.com}"
CONFIG_PATH="${HOME}/.ossutilconfig"

# 对象 key / 文件名中的永久封面标记（清理脚本会跳过）
COVER_KEEP_MARK="__cover_keep__"

ensure_ossutil_config() {
  if [[ -f "$CONFIG_PATH" ]]; then
    return 0
  fi
  local key_id="${OSS_ACCESS_KEY_ID:-}"
  local key_secret="${OSS_ACCESS_KEY_SECRET:-}"
  if [[ -z "$key_id" || -z "$key_secret" ]]; then
    echo "错误: 缺少 ~/.ossutilconfig，且未设置 OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET。" >&2
    echo "请在 Cursor Cloud Agents → Secrets 配置上述两个变量，或本机写入 ~/.ossutilconfig。" >&2
    exit 1
  fi
  umask 077
  # ossutil v2 的 v4 签名要求 region，且只认 cn-beijing 这种不带 oss- 前缀的写法
  cat >"$CONFIG_PATH" <<EOF
[Credentials]
language=CH
endpoint=${ENDPOINT}
region=${REGION#oss-}
accessKeyID=${key_id}
accessKeySecret=${key_secret}
EOF
  chmod 600 "$CONFIG_PATH"
  echo "oss-upload: 已从环境变量写入 ${CONFIG_PATH}" >&2
}

if [[ ! -x "$OSSUTIL" ]]; then
  if command -v ossutil >/dev/null 2>&1; then
    OSSUTIL="$(command -v ossutil)"
  else
    echo "错误: 找不到 ossutil。请安装到 ~/.local/bin/ossutil 或设置 OSSUTIL。" >&2
    exit 1
  fi
fi

ensure_ossutil_config

# 存图前清理超过 14h 的旧对象（签名默认 12h，多留 2h 缓冲；封面标记对象会被跳过）
run_cleanup_before_store() {
  if [[ "${OSS_SKIP_CLEANUP:-0}" == "1" ]]; then
    return 0
  fi
  bash "${SCRIPT_DIR}/oss-cleanup-expired.sh" || {
    echo "警告: 过期对象清理未完全成功，继续上传" >&2
  }
}

is_cover_keep_key() {
  local name="$1"
  [[ "$name" == *"${COVER_KEEP_MARK}"* ]]
}

# 识别封面文件名：cover.png / cover-xxx.png / xxx__cover_keep__.png 等
looks_like_cover_name() {
  local base
  base="$(basename "$1")"
  if is_cover_keep_key "$base"; then
    return 0
  fi
  # cover.png / cover.jpg / cover-foo.png / cover_bar.webp
  if [[ "$base" =~ ^[Cc]over([._-].+)?\.(png|jpe?g|webp|gif|svg)$ ]]; then
    return 0
  fi
  return 1
}

# 在扩展名前插入 __cover_keep__（已有则原样返回）
ensure_cover_keep_key() {
  local key="$1"
  if is_cover_keep_key "$key"; then
    echo "$key"
    return
  fi
  local dir base name ext
  dir="$(dirname "$key")"
  base="$(basename "$key")"
  if [[ "$base" == *.* ]]; then
    name="${base%.*}"
    ext="${base##*.}"
    base="${name}${COVER_KEEP_MARK}.${ext}"
  else
    base="${base}${COVER_KEEP_MARK}"
  fi
  if [[ "$dir" == "." ]]; then
    echo "$base"
  else
    echo "${dir}/${base}"
  fi
}

# 公共读封面 URL（无 Expires，长期可访问）
public_url() {
  local key="$1"
  # 路径编码：保留 /
  local encoded
  encoded="$(
    python3 - "$key" <<'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe="/"))
PY
  )"
  echo "https://${BUCKET}.${ENDPOINT}/${encoded}"
}

# 对象保持私有；返回带 Expires / OSSAccessKeyId / Signature 的临时 URL（默认 12h）
sign_url() {
  local key="$1"
  local raw
  # ossutil v2 用 --expires-duration，v1 用 --timeout
  raw="$("$OSSUTIL" sign "oss://${BUCKET}/${key}" --expires-duration "${SIGN_TIMEOUT}s" 2>/dev/null | grep -Eo 'https?://[^[:space:]]+' | tail -1)"
  if [[ -z "$raw" ]]; then
    raw="$("$OSSUTIL" sign "oss://${BUCKET}/${key}" --timeout "$SIGN_TIMEOUT" 2>/dev/null | grep -Eo 'https?://[^[:space:]]+' | tail -1)"
  fi
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

# 设置对象 ACL（兼容 ossutil v2 set-props / api，以及 v1 set-acl）
set_object_acl() {
  local key="$1"
  local acl="$2"
  if "$OSSUTIL" set-props "oss://${BUCKET}/${key}" --acl "$acl" >/dev/null 2>&1; then
    return 0
  fi
  if "$OSSUTIL" api put-object-acl --bucket "$BUCKET" --key "$key" --object-acl "$acl" >/dev/null 2>&1; then
    return 0
  fi
  if "$OSSUTIL" set-acl "oss://${BUCKET}/${key}" "$acl" -f >/dev/null 2>&1; then
    return 0
  fi
  echo "警告: 未能设置对象 ACL=${acl} key=${key}" >&2
  return 1
}

# 封面：公共读 + 永久 URL；其它：私有 + 12h 签名
deliver_url() {
  local key="$1"
  if is_cover_keep_key "$key"; then
    set_object_acl "$key" public-read || true
    public_url "$key"
  else
    set_object_acl "$key" private || true
    sign_url "$key"
  fi
}

upload_one() {
  local local_path="$1"
  local key="$2"
  local force_cover="${3:-0}"
  if [[ ! -f "$local_path" ]]; then
    echo "错误: 文件不存在: $local_path" >&2
    exit 1
  fi
  local is_cover=0
  if [[ "$force_cover" == "1" ]] || looks_like_cover_name "$local_path" || looks_like_cover_name "$key"; then
    is_cover=1
    key="$(ensure_cover_keep_key "$key")"
    echo "oss-upload: 封面永久保留 ${key}" >&2
  fi
  # 封面在上传时直接带 public-read，避免仅依赖事后 set-acl（ossutil v1/v2 语法不同）
  if [[ "$is_cover" == "1" ]]; then
    "$OSSUTIL" cp "$local_path" "oss://${BUCKET}/${key}" -f --acl public-read >/dev/null
  else
    "$OSSUTIL" cp "$local_path" "oss://${BUCKET}/${key}" -f >/dev/null
  fi
  deliver_url "$key"
}

rewrite_html() {
  local html_path="$1"
  node "${SCRIPT_DIR}/oss-rewrite-html.mjs" "$html_path"
}

FORCE_COVER=0
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cover)
      FORCE_COVER=1
      shift
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done
set -- "${ARGS[@]+"${ARGS[@]}"}"

case "${1:-}" in
  --dir)
    run_cleanup_before_store
    local_dir="${2:?需要本地目录}"
    remote_prefix="${3:-${PREFIX}/$(basename "$local_dir")-$(date +%Y%m%d-%H%M%S)}"
    find "$local_dir" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' -o -iname '*.svg' \) | while read -r f; do
      rel="${f#"$local_dir"/}"
      key="${remote_prefix%/}/${rel}"
      url="$(upload_one "$f" "$key" "$FORCE_COVER")"
      echo "$url"
    done
    ;;
  --rewrite-html)
    run_cleanup_before_store
    rewrite_html "${2:?需要 HTML 路径}"
    ;;
  --sign)
    key="${2:?需要 object key}"
    if looks_like_cover_name "$key" || is_cover_keep_key "$key"; then
      key="$(ensure_cover_keep_key "$key")"
    fi
    deliver_url "$key"
    ;;
  -h|--help)
    sed -n '2,26p' "$0"
    ;;
  *)
    run_cleanup_before_store
    local_file="${1:?需要本地文件路径}"
    remote_key="${2:-${PREFIX}/$(date +%Y%m%d-%H%M%S)/$(basename "$local_file")}"
    upload_one "$local_file" "$remote_key" "$FORCE_COVER"
    ;;
esac
