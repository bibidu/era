#!/usr/bin/env bash
# 发布前端到阿里云轻量（39.106）：先确保代码已推到远端，再 SSH 到服务器 git pull + 构建。
# 比本机打包 rsync 更快（尤其 Cloud Agent 美西 → 北京跨境）。
#
# 用法:
#   npm run deploy:swas
#   bash scripts/deploy-swas.sh
#   bash scripts/deploy-swas.sh --no-push
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SERVER_ENV="${SWAS_SERVER_ENV:-$ROOT/deploy/swas/server.env}"
SERVER_SECRETS="${SWAS_SERVER_SECRETS:-$ROOT/deploy/swas/server.secrets.env}"
if [[ -f "$SERVER_ENV" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck disable=SC1091
  source "$SERVER_ENV"
  set +a
fi
if [[ -f "$SERVER_SECRETS" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck disable=SC1091
  source "$SERVER_SECRETS"
  set +a
fi

HOST="${SWAS_HOST:-39.106.179.17}"
USER="${SWAS_USER:-root}"
REMOTE_REPO="${SWAS_REPO_DIR:-/opt/era}"
REMOTE_WEB="${SWAS_WEB_DIR:-/opt/era-web}"
GIT_URL="${SWAS_GIT_URL:-https://github.com/bibidu/era.git}"
GIT_BRANCH="${SWAS_GIT_BRANCH:-main}"

SSH_KEY="${SWAS_SSH_KEY:-$ROOT/deploy/swas/id_rsa}"
if [[ "$SSH_KEY" != /* ]]; then
  SSH_KEY="$ROOT/$SSH_KEY"
fi
if [[ ! -f "$SSH_KEY" && -f /tmp/aliyun-swas/id_ed25519 ]]; then
  SSH_KEY=/tmp/aliyun-swas/id_ed25519
fi
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/id_ed25519" ]]; then
  SSH_KEY="$HOME/.ssh/id_ed25519"
fi
if [[ ! -f "$SSH_KEY" ]]; then
  echo "错误: 找不到 SSH 私钥。请放置 deploy/swas/id_rsa 或设置 SWAS_SSH_KEY。" >&2
  exit 1
fi
chmod 600 "$SSH_KEY" 2>/dev/null || true

SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o IdentitiesOnly=yes -o ConnectTimeout=20)

DO_PUSH_CHECK=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-push) DO_PUSH_CHECK=0; shift ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$DO_PUSH_CHECK" == "1" ]]; then
  echo "==> 确认 ${GIT_BRANCH} 已推送到 origin"
  git fetch origin "$GIT_BRANCH" --quiet
  LOCAL=$(git rev-parse "origin/${GIT_BRANCH}")
  echo "    origin/${GIT_BRANCH} = ${LOCAL:0:12}"
fi

echo "==> SSH ${USER}@${HOST}: git pull + build → ${REMOTE_WEB}"
ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" \
  env REMOTE_REPO="$REMOTE_REPO" REMOTE_WEB="$REMOTE_WEB" GIT_URL="$GIT_URL" GIT_BRANCH="$GIT_BRANCH" \
  bash -s <<'REMOTE'
set -euo pipefail

if [[ ! -d "$REMOTE_REPO/.git" ]]; then
  echo "    clone $GIT_URL → $REMOTE_REPO"
  rm -rf "$REMOTE_REPO"
  git clone --depth 50 "$GIT_URL" "$REMOTE_REPO"
fi

cd "$REMOTE_REPO"
echo "    fetch/reset origin/${GIT_BRANCH}"
git remote set-url origin "$GIT_URL"
git fetch --depth 50 origin "$GIT_BRANCH"
git checkout -B "$GIT_BRANCH" "origin/${GIT_BRANCH}"
git reset --hard "origin/${GIT_BRANCH}"
git clean -fd
echo "    HEAD=$(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

echo "    npm ci"
npm ci --no-audit --no-fund

if [[ -x scripts/ensure-noto-serif-sc.sh ]]; then
  echo "    ensure noto fonts"
  bash scripts/ensure-noto-serif-sc.sh || true
fi

echo "    build (ERA_BASE=/)"
ERA_BASE=/ npm run build

echo "    sync dist → ${REMOTE_WEB}"
mkdir -p "$REMOTE_WEB"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete dist/ "${REMOTE_WEB}/"
else
  rm -rf "${REMOTE_WEB:?}/"*
  cp -a dist/. "$REMOTE_WEB/"
fi

echo "    reload caddy"
docker exec era-gateway caddy reload --config /etc/caddy/Caddyfile 2>/dev/null \
  || docker restart era-gateway

echo "    done HEAD=$(git rev-parse --short HEAD)"
REMOTE

echo "==> 验收"
CODE=$(curl -sS -o /tmp/era-deploy-index.html -w '%{http_code}' "http://${HOST}/" || true)
echo "    GET / → HTTP ${CODE}"
if [[ "$CODE" != "200" ]]; then
  echo "警告: 首页未返回 200" >&2
fi

echo "==> done"
echo "   http://${HOST}/"
echo "   http://${HOST}/?tab=data"
echo "   http://${HOST}/?tab=stitch"
