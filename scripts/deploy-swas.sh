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

# 把本机/Cursor Secrets 的 OSS 密钥传到远端启动提取服务（不落盘进 git）
OSS_ID_FOR_REMOTE="${OSS_ACCESS_KEY_ID:-${ALIYUN_ACCESS_KEY_ID:-}}"
OSS_SECRET_FOR_REMOTE="${OSS_ACCESS_KEY_SECRET:-${ALIYUN_ACCESS_KEY_SECRET:-}}"

echo "==> SSH ${USER}@${HOST}: git pull + build → ${REMOTE_WEB}"
ssh "${SSH_OPTS[@]}" "${USER}@${HOST}" \
  env REMOTE_REPO="$REMOTE_REPO" REMOTE_WEB="$REMOTE_WEB" GIT_URL="$GIT_URL" GIT_BRANCH="$GIT_BRANCH" \
  OSS_ACCESS_KEY_ID="$OSS_ID_FOR_REMOTE" OSS_ACCESS_KEY_SECRET="$OSS_SECRET_FOR_REMOTE" \
  OSS_BUCKET="${OSS_BUCKET:-agent-17718139319}" OSS_ENDPOINT="${OSS_ENDPOINT:-oss-cn-beijing.aliyuncs.com}" \
  OSS_PREFIX="${OSS_PREFIX:-era/assets}" \
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

echo "    apply social video migrations"
# 注意：SSH 远端脚本走 bash -s（stdin=heredoc），docker exec 不能挂 -i 抢 stdin（除重定向文件外）
for migration in \
  supabase/migrations/20260804120000_era_social_video_extract_status.sql \
  supabase/migrations/20260804140000_era_social_video_extract_data.sql \
  supabase/migrations/20260804222000_era_social_video_temp_govern_status.sql \
  supabase/migrations/20260807180000_era_app_login_users.sql \
  supabase/migrations/20260810140000_kuifou_assets.sql
do
  if [[ -f "$migration" ]]; then
    echo "    apply $(basename "$migration")"
    docker exec -i era-db psql -U era -d era < "$migration" \
      || echo "    warn: migration apply failed (may already be applied): $migration"
  fi
done
# 迁移后必须刷新 PostgREST schema cache，否则 PATCH extract_* 会 PGRST204
echo "    reload PostgREST schema cache"
docker exec era-db psql -U era -d era -c "NOTIFY pgrst, 'reload schema';" </dev/null \
  || docker restart era-rest \
  || echo "    warn: schema reload failed"

echo "    build (ERA_BASE=/)"
ERA_BASE=/ npm run build

echo "    sync dist → ${REMOTE_WEB}"
# /opt/apt-web、/opt/kuifou-web 经 compose 挂到 gateway 的 /srv/apt、/srv/kuifou；切勿把内容放进 REMOTE_WEB。
# 只读挂载 REMOTE_WEB→/srv 时，宿主机必须先有 apt/、kuifou/ 空目录作挂载点，否则嵌套挂载失败。
mkdir -p "$REMOTE_WEB" /opt/apt-web /opt/kuifou-web "${REMOTE_WEB}/apt" "${REMOTE_WEB}/kuifou"
# rsync --delete 必须排除 apt/、kuifou/，避免清掉挂载点或误删内容。
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude apt --exclude apt/ \
    --exclude kuifou --exclude kuifou/ \
    dist/ "${REMOTE_WEB}/"
  mkdir -p "${REMOTE_WEB}/apt" "${REMOTE_WEB}/kuifou"
else
  # 无 rsync 时逐项同步，保留 apt/、kuifou/ 目录
  shopt -s dotglob nullglob
  for entry in dist/*; do
    base="$(basename "$entry")"
    [[ "$base" == "apt" || "$base" == "kuifou" ]] && continue
    rm -rf "${REMOTE_WEB:?}/${base}"
    cp -a "$entry" "$REMOTE_WEB/"
  done
  shopt -u dotglob nullglob
  mkdir -p "${REMOTE_WEB}/apt" "${REMOTE_WEB}/kuifou"
fi

echo "    sync Caddyfile / compose → /opt/era-db"
if [[ -f "$REMOTE_REPO/deploy/swas/Caddyfile" ]]; then
  cp "$REMOTE_REPO/deploy/swas/Caddyfile" /opt/era-db/Caddyfile
fi
if [[ -f "$REMOTE_REPO/deploy/swas/docker-compose.yml" ]]; then
  cp "$REMOTE_REPO/deploy/swas/docker-compose.yml" /opt/era-db/docker-compose.yml
  compose_up() {
    (cd /opt/era-db && docker compose up -d db rest gateway) \
      || (cd /opt/era-db && docker-compose up -d db rest gateway) \
      || echo "    warn: docker compose up failed"
  }
  compose_up
fi

# compose 插件若坏掉，兜底保证 gateway 仍挂着独立站目录
ensure_standalone_mounts() {
  mkdir -p /opt/apt-web /opt/kuifou-web /opt/era-web/apt /opt/era-web/kuifou
  local need_recreate=0
  if docker inspect era-gateway >/dev/null 2>&1; then
    local mounts
    mounts=$(docker inspect -f '{{range .Mounts}}{{println .Source}}{{end}}' era-gateway)
    if echo "$mounts" | grep -qx '/opt/apt-web'; then
      echo "    apt mount ok"
    else
      need_recreate=1
    fi
    if echo "$mounts" | grep -qx '/opt/kuifou-web'; then
      echo "    kuifou mount ok"
    else
      need_recreate=1
    fi
    if [[ "$need_recreate" -eq 0 ]]; then
      return 0
    fi
    echo "    recreate era-gateway with apt + kuifou mounts"
    docker rm -f era-gateway >/dev/null 2>&1 || true
  else
    echo "    start era-gateway with apt + kuifou mounts"
  fi
  docker run -d \
    --name era-gateway \
    --restart unless-stopped \
    --network era-net \
    -p 80:80 -p 443:443 -p 3000:3000 \
    --add-host=host.docker.internal:host-gateway \
    --memory=96m \
    -v /opt/era-db/Caddyfile:/etc/caddy/Caddyfile:ro \
    -v /opt/era-web:/srv:ro \
    -v /opt/apt-web:/srv/apt:ro \
    -v /opt/kuifou-web:/srv/kuifou:ro \
    -v era-caddy-data:/data \
    -v era-caddy-config:/config \
    caddy:2-alpine >/dev/null
}
ensure_standalone_mounts

ERA_REST_IP=""
if docker inspect era-rest >/dev/null 2>&1; then
  ERA_REST_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' era-rest 2>/dev/null | head -1 || true)
fi
if [[ -n "$ERA_REST_IP" ]]; then
  ERA_REST_INTERNAL="http://${ERA_REST_IP}:3000"
else
  ERA_REST_INTERNAL="http://127.0.0.1:54321"
fi
echo "    ERA_REST_INTERNAL=${ERA_REST_INTERNAL}"

echo "    start extract-task-server"
mkdir -p /var/log/era
AUTH_HASH=$(node -e "import('./scripts/era-auth-core.mjs').then(m=>console.log(m.computeEraAuthHash('17718139319','521312')))" 2>/dev/null || true)
cat >/etc/era-extract-task.env <<EOF
OSS_ACCESS_KEY_ID=${OSS_ACCESS_KEY_ID:-}
OSS_ACCESS_KEY_SECRET=${OSS_ACCESS_KEY_SECRET:-}
OSS_BUCKET=${OSS_BUCKET:-agent-17718139319}
OSS_ENDPOINT=${OSS_ENDPOINT:-oss-cn-beijing.aliyuncs.com}
OSS_PREFIX=${OSS_PREFIX:-era/assets}
EXTRACT_TASK_PORT=8791
EXTRACT_TASK_HOST=0.0.0.0
ERA_REST_URL=http://127.0.0.1/rest/v1
ERA_REST_INTERNAL=${ERA_REST_INTERNAL}
ERA_AUTH_HASH=${AUTH_HASH:-}
# 本机直打 Supabase Functions，避免经鉴权网关二次登录；extract-task 已带 anon key
DASHSCOPE_PROXY_URL=https://kzoxyextxjwscrpjowud.functions.supabase.co/dashscope-video-extract
EOF
chmod 600 /etc/era-extract-task.env
cat >/etc/systemd/system/era-extract-task.service <<'UNIT'
[Unit]
Description=Era social extract task server
After=network.target docker.service

[Service]
Type=simple
WorkingDirectory=/opt/era
EnvironmentFile=/etc/era-extract-task.env
ExecStart=/usr/bin/node /opt/era/scripts/extract-task-server.mjs
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable era-extract-task.service >/dev/null 2>&1 || true
systemctl restart era-extract-task.service

echo "    start era-auth-proxy"
cat >/etc/era-auth-proxy.env <<EOF
ERA_AUTH_PROXY_PORT=8793
ERA_AUTH_PROXY_HOST=0.0.0.0
ERA_REST_INTERNAL=${ERA_REST_INTERNAL}
ERA_EXTRACT_UPSTREAM=http://127.0.0.1:8791
ERA_FUNCTIONS_UPSTREAM=https://kzoxyextxjwscrpjowud.functions.supabase.co
EOF
chmod 600 /etc/era-auth-proxy.env
cat >/etc/systemd/system/era-auth-proxy.service <<'AUTHUNIT'
[Unit]
Description=Era auth gateway (login + REST/Functions)
After=network.target docker.service era-extract-task.service

[Service]
Type=simple
WorkingDirectory=/opt/era
EnvironmentFile=/etc/era-auth-proxy.env
ExecStart=/usr/bin/node /opt/era/scripts/era-auth-proxy.mjs
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
AUTHUNIT
systemctl daemon-reload
systemctl enable era-auth-proxy.service >/dev/null 2>&1 || true
systemctl restart era-auth-proxy.service

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
