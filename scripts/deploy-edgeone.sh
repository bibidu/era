#!/usr/bin/env bash
# 构建并部署 Era 前端到腾讯云 EdgeOne Makers，打印线上 URL。
#
# 用法:
#   bash scripts/deploy-edgeone.sh
#   bash scripts/deploy-edgeone.sh --preview
#
# 环境变量:
#   EDGEONE_API_TOKEN  可选；未登录 CLI 时必填
#   EDGEONE_PROJECT    默认 era
#   ERA_BASE           构建 base，默认 /
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 本机代理经常指向已关闭的 7890，部署时默认绕过
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy || true
export NO_PROXY="${NO_PROXY:-*}"

ENV="production"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --preview|-e) ENV="preview"; shift;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0;;
    *) echo "未知参数: $1" >&2; exit 1;;
  esac
done

PROJECT="${EDGEONE_PROJECT:-bibidu-era}"
export ERA_BASE="${ERA_BASE:-/}"
TOKEN_ARGS=()
if [[ -n "${EDGEONE_API_TOKEN:-}" ]]; then
  TOKEN_ARGS=(-t "$EDGEONE_API_TOKEN")
fi

if ! command -v edgeone >/dev/null 2>&1; then
  echo "==> 安装 edgeone CLI…"
  npm install -g edgeone
fi

echo "==> 安装依赖"
npm ci

echo "==> 构建 (ERA_BASE=${ERA_BASE})"
npm run build
node scripts/inject-build-version.mjs

echo "==> 部署到 EdgeOne Makers  project=${PROJECT} env=${ENV}"
EO_BIN="edgeone"
if ! command -v edgeone >/dev/null 2>&1; then
  EO_BIN="npx --yes edgeone@latest"
fi

set +e
# shellcheck disable=SC2086
OUT="$(${EO_BIN} makers deploy ./dist -n "$PROJECT" -e "$ENV" --json "${TOKEN_ARGS[@]}" 2>&1)"
CODE=$?
set -e
echo "$OUT"

if [[ $CODE -ne 0 ]]; then
  echo "部署失败 (exit=$CODE)" >&2
  exit "$CODE"
fi

# 从 JSON 或文本中提取 URL（须保留 eo_token/eo_time，大陆访问缺参会 401）
URL="$(echo "$OUT" | perl -ne 'print "$1\n" if /"(?:url|domain|accessUrl|projectUrl)"\s*:\s*"(https?:[^"]+)"/' | tail -1)"
if [[ -z "$URL" ]]; then
  URL="$(echo "$OUT" | grep -Eo 'https?://[a-zA-Z0-9._/-]+\.(edgeone\.app|pages\.edgeone\.ai|edgeone\.site|edgeone\.cool)[^[:space:]"<>]*' | tail -1 || true)"
fi

if [[ -n "$URL" ]]; then
  echo ""
  echo "EDGEONE_URL=$URL"
  if [[ "$URL" != *eo_token=* ]]; then
    echo "警告: 部署 URL 未含 eo_token。若项目加速区域含中国大陆，裸域名在大陆可能返回 401；请绑定自定义域名或到控制台复制预览链接。" >&2
  else
    echo "提示: 预览链接含 eo_token，约 3 小时有效；长期访问请绑定自定义域名。" >&2
  fi
else
  echo ""
  echo "部署完成，但未能自动解析 URL。请到 EdgeOne 控制台查看项目「${PROJECT}」。" >&2
fi
