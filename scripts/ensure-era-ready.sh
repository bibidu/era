#!/usr/bin/env bash
# 确认 Era Agent + 前端 Bridge 可用；供 era skill / 云端 Agent 调用。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HOST="${ERA_AGENT_HOST:-127.0.0.1}"
PORT="${ERA_AGENT_PORT:-3847}"
DEV_HOST="${ERA_DEV_HOST:-127.0.0.1}"
DEV_PORT="${ERA_DEV_PORT:-5173}"
STATE_DIR="${TMPDIR:-/tmp}/era-agent-run"
mkdir -p "$STATE_DIR"

if [[ ! -d node_modules ]]; then
  echo "==> npm install"
  npm install
fi

health() {
  curl -sf "http://${HOST}:${PORT}/health" 2>/dev/null || true
}

bridge_connected() {
  local body
  body="$(health)"
  [[ -n "$body" ]] && echo "$body" | grep -q '"connected":true'
}

agent_up() {
  local body
  body="$(health)"
  [[ -n "$body" ]] && echo "$body" | grep -q '"ok":true'
}

start_agent_if_needed() {
  if agent_up; then
    echo "==> Agent 已在运行"
    return
  fi
  echo "==> 启动 Agent"
  nohup npm run agent >"$STATE_DIR/agent.log" 2>&1 &
  echo $! >"$STATE_DIR/agent.pid"
  for _ in $(seq 1 40); do
    agent_up && break
    sleep 0.25
  done
  if ! agent_up; then
    echo "!! Agent 启动失败，见 $STATE_DIR/agent.log" >&2
    exit 1
  fi
}

start_dev_if_needed() {
  if curl -sf "http://${DEV_HOST}:${DEV_PORT}/era/" >/dev/null 2>&1; then
    echo "==> 前端已在运行"
    return
  fi
  echo "==> 启动前端"
  nohup npm run dev -- --host "$DEV_HOST" --port "$DEV_PORT" >"$STATE_DIR/dev.log" 2>&1 &
  echo $! >"$STATE_DIR/dev.pid"
  for _ in $(seq 1 60); do
    curl -sf "http://${DEV_HOST}:${DEV_PORT}/era/" >/dev/null 2>&1 && break
    sleep 0.25
  done
  if ! curl -sf "http://${DEV_HOST}:${DEV_PORT}/era/" >/dev/null 2>&1; then
    echo "!! 前端启动失败，见 $STATE_DIR/dev.log" >&2
    exit 1
  fi
}

open_bridge_page() {
  local url="http://${DEV_HOST}:${DEV_PORT}/era/"
  if bridge_connected; then
    echo "==> Bridge 已连接"
    return
  fi
  echo "==> 尝试打开前端以建立 Bridge: $url"
  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  fi
  # 云端：用 Playwright Chromium 保活页面（方案 B）
  if ! bridge_connected && [[ -d node_modules/playwright ]]; then
    echo "==> 使用 Playwright 打开页面保活 Bridge"
    nohup npx playwright install chromium >/dev/null 2>&1 || true
    nohup npx tsx "$ROOT/scripts/keep-bridge-open.mts" "$url" >"$STATE_DIR/bridge.log" 2>&1 &
    echo $! >"$STATE_DIR/bridge.pid"
  fi
  for _ in $(seq 1 40); do
    bridge_connected && break
    sleep 0.5
  done
}

start_agent_if_needed
start_dev_if_needed
open_bridge_page

echo "==> health: $(health)"
if ! agent_up; then
  echo "!! Agent 未就绪" >&2
  exit 1
fi

if ! bridge_connected; then
  echo "!! Bridge 未连接：请手动打开 $DEV_HOST:$DEV_PORT/era/ 并确认右上角 Agent 指示" >&2
  echo "ERA_READY=0"
  exit 2
fi

echo "ERA_READY=1"
echo "OPEN_URL=http://${DEV_HOST}:${DEV_PORT}/era/"
echo "AGENT_URL=http://${HOST}:${PORT}"
