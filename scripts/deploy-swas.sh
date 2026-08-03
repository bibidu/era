#!/usr/bin/env bash
# 构建前端并发布到阿里云轻量（39.106）Caddy 静态目录
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOST="${SWAS_HOST:-39.106.179.17}"
USER="${SWAS_USER:-root}"
SSH_KEY="${SWAS_SSH_KEY:-$HOME/.ssh/id_ed25519}"
if [[ ! -f "$SSH_KEY" && -f /tmp/aliyun-swas/id_ed25519 ]]; then
  SSH_KEY=/tmp/aliyun-swas/id_ed25519
fi
REMOTE_WEB="${SWAS_WEB_DIR:-/opt/era-web}"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o IdentitiesOnly=yes)

echo "==> build (ERA_BASE=/)"
ERA_BASE=/ npm run build

echo "==> sync dist -> ${USER}@${HOST}:${REMOTE_WEB}"
ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" "mkdir -p '$REMOTE_WEB'"
rsync -az --delete -e "ssh ${SSH_OPTS[*]}" ./dist/ "${USER}@${HOST}:${REMOTE_WEB}/"

echo "==> reload caddy gateway"
ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" 'docker exec era-gateway caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || docker restart era-gateway'

echo "==> done"
echo "   http://${HOST}/"
echo "   http://${HOST}/?tab=data"
