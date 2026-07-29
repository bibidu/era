#!/usr/bin/env bash
# 删除阿里云 OSS 指定前缀下「最后修改时间」早于阈值的对象，避免签名过期后仍占存储产生费用。
# 默认：清理 era/assets/ 下超过 14 小时的对象。
#
# 用法:
#   bash scripts/oss-cleanup-expired.sh
#   bash scripts/oss-cleanup-expired.sh --dry-run
#   OSS_CLEANUP_MAX_AGE_HOURS=14 bash scripts/oss-cleanup-expired.sh
#
# 环境变量（可选）:
#   OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET  同 oss-upload.sh（缺配置文件时自动写入）
#   OSS_ENDPOINT / OSS_BUCKET / OSS_PREFIX / OSSUTIL
#   OSS_CLEANUP_MAX_AGE_HOURS         默认 14
#   OSS_CLEANUP_DRY_RUN=1             只列出不删除
#   OSS_SKIP_CLEANUP=1                跳过（由 oss-upload.sh 识别）
set -euo pipefail

OSSUTIL="${OSSUTIL:-${HOME}/.local/bin/ossutil}"
BUCKET="${OSS_BUCKET:-agent-17718139319}"
PREFIX="${OSS_PREFIX:-era/assets}"
MAX_AGE_HOURS="${OSS_CLEANUP_MAX_AGE_HOURS:-14}"
DRY_RUN="${OSS_CLEANUP_DRY_RUN:-0}"
ENDPOINT="${OSS_ENDPOINT:-oss-cn-beijing.aliyuncs.com}"
CONFIG_PATH="${HOME}/.ossutilconfig"

ensure_ossutil_config() {
  if [[ -f "$CONFIG_PATH" ]]; then
    return 0
  fi
  local key_id="${OSS_ACCESS_KEY_ID:-}"
  local key_secret="${OSS_ACCESS_KEY_SECRET:-}"
  if [[ -z "$key_id" || -z "$key_secret" ]]; then
    return 1
  fi
  umask 077
  cat >"$CONFIG_PATH" <<EOF
[Credentials]
language=CH
endpoint=${ENDPOINT}
accessKeyID=${key_id}
accessKeySecret=${key_secret}
EOF
  chmod 600 "$CONFIG_PATH"
  echo "oss-cleanup: 已从环境变量写入 ${CONFIG_PATH}" >&2
  return 0
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
  esac
done

if [[ "${OSS_SKIP_CLEANUP:-0}" == "1" ]]; then
  echo "oss-cleanup: 已跳过（OSS_SKIP_CLEANUP=1）" >&2
  exit 0
fi

if [[ ! -x "$OSSUTIL" ]]; then
  if command -v ossutil >/dev/null 2>&1; then
    OSSUTIL="$(command -v ossutil)"
  else
    echo "oss-cleanup: 找不到 ossutil，跳过清理" >&2
    exit 0
  fi
fi

if [[ ! -f "$CONFIG_PATH" ]]; then
  if ! ensure_ossutil_config; then
    echo "oss-cleanup: 缺少 ~/.ossutilconfig 且无 OSS_ACCESS_KEY_*，跳过清理" >&2
    exit 0
  fi
fi

if ! [[ "$MAX_AGE_HOURS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "错误: OSS_CLEANUP_MAX_AGE_HOURS 无效: $MAX_AGE_HOURS" >&2
  exit 1
fi

# 截止时间戳（秒）；GNU date（Linux）
CUTOFF_EPOCH="$(date -u -d "${MAX_AGE_HOURS} hours ago" +%s)"
PREFIX_TRIMMED="${PREFIX#/}"
PREFIX_TRIMMED="${PREFIX_TRIMMED%/}"
LIST_URI="oss://${BUCKET}/${PREFIX_TRIMMED}/"

echo "oss-cleanup: 扫描 ${LIST_URI}（删除 LastModified < ${MAX_AGE_HOURS}h 前）" >&2

# ossutil ls 典型行:
# 2026-07-28 12:00:00 +0800 CST      12345  Standard  ETAG  oss://bucket/key
# 跳过表头与汇总行
mapfile -t LINES < <("$OSSUTIL" ls "$LIST_URI" 2>/dev/null | grep -E 'oss://' || true)

deleted=0
skipped=0
failed=0

for line in "${LINES[@]}"; do
  # 取最后一个 oss:// 字段为对象
  key_uri="$(echo "$line" | grep -Eo 'oss://[^[:space:]]+' | tail -1 || true)"
  [[ -z "$key_uri" ]] && continue
  # 目录占位（以 / 结尾）跳过
  [[ "$key_uri" == */ ]] && continue

  # 前两列通常是日期与时间（本地/带时区展示）
  date_part="$(echo "$line" | awk '{print $1}')"
  time_part="$(echo "$line" | awk '{print $2}')"
  tz_part="$(echo "$line" | awk '{print $3}')"

  if [[ -z "$date_part" || -z "$time_part" ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  # 兼容 "+0800" / "+0000" / "UTC"
  if [[ "$tz_part" =~ ^[+-][0-9]{4}$ ]]; then
    ts_raw="${date_part} ${time_part} ${tz_part}"
    obj_epoch="$(date -u -d "$ts_raw" +%s 2>/dev/null || true)"
  else
    # 无明确偏移时按 UTC 解析日期时间
    obj_epoch="$(date -u -d "${date_part} ${time_part}" +%s 2>/dev/null || true)"
  fi

  if [[ -z "${obj_epoch:-}" ]]; then
    echo "oss-cleanup: 无法解析时间，跳过: $line" >&2
    skipped=$((skipped + 1))
    continue
  fi

  if (( obj_epoch >= CUTOFF_EPOCH )); then
    skipped=$((skipped + 1))
    continue
  fi

  age_h="$(awk -v now="$(date -u +%s)" -v t="$obj_epoch" 'BEGIN { printf "%.1f", (now - t) / 3600 }')"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "oss-cleanup: [dry-run] 将删除 (${age_h}h) $key_uri" >&2
    deleted=$((deleted + 1))
    continue
  fi

  if "$OSSUTIL" rm "$key_uri" -f >/dev/null 2>&1; then
    echo "oss-cleanup: 已删除 (${age_h}h) $key_uri" >&2
    deleted=$((deleted + 1))
  else
    echo "oss-cleanup: 删除失败 $key_uri" >&2
    failed=$((failed + 1))
  fi
done

echo "oss-cleanup: 完成 deleted=${deleted} kept_or_skipped=${skipped} failed=${failed} dry_run=${DRY_RUN}" >&2
# 清理失败不阻断上传；非 0 仅在解析参数错误时
exit 0
