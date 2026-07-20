#!/usr/bin/env bash
# 一键进入 Era 仓库，启动 Agent REST + 前端，便于 WorkBuddy / OpenClaw 对话改图文。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# 端口/主机优先级：命令行参数 > 环境变量 > 默认值
# 用法: ./scripts/start-local-agent.sh [--agent-host H] [--agent-port P] [--dev-host H] [--dev-port P]
AGENT_HOST_ARG=""
AGENT_PORT_ARG=""
DEV_HOST_ARG=""
DEV_PORT_ARG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent-host) AGENT_HOST_ARG="$2"; shift 2;;
    --agent-port) AGENT_PORT_ARG="$2"; shift 2;;
    --dev-host)   DEV_HOST_ARG="$2";   shift 2;;
    --dev-port)   DEV_PORT_ARG="$2";   shift 2;;
    --) shift; break;;
    -h|--help)
      sed -n '2p' "$0" >&2
      echo "用法: $(basename "$0") [--agent-host H] [--agent-port P] [--dev-host H] [--dev-port P]" >&2
      echo "未指定时回退环境变量 ERA_AGENT_HOST/ERA_AGENT_PORT/ERA_DEV_HOST/ERA_DEV_PORT，再回退默认 127.0.0.1:3847 / 127.0.0.1:5173。" >&2
      exit 0;;
    *) echo "未知参数: $1" >&2; exit 1;;
  esac
done

HOST="${AGENT_HOST_ARG:-${ERA_AGENT_HOST:-127.0.0.1}}"
PORT="${AGENT_PORT_ARG:-${ERA_AGENT_PORT:-3847}}"
DEV_HOST="${DEV_HOST_ARG:-${ERA_DEV_HOST:-127.0.0.1}}"
DEV_PORT="${DEV_PORT_ARG:-${ERA_DEV_PORT:-5173}}"

# 透传给后端进程（server/runtime.ts 读 ERA_AGENT_HOST/PORT）
export ERA_AGENT_HOST="$HOST"
export ERA_AGENT_PORT="$PORT"

echo "==> Era 目录: $ROOT"

if [[ ! -d node_modules ]]; then
  echo "==> 安装依赖 (npm install)…"
  npm install
fi

# 释放端口（若已有旧进程）
free_port() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      echo "==> 释放端口 $p (pid: $pids)"
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
      sleep 0.4
    fi
  fi
}

free_port "$PORT"
free_port "$DEV_PORT"

AGENT_PID=""
DEV_PID=""

cleanup() {
  echo ""
  echo "==> 正在停止服务…"
  [[ -n "$AGENT_PID" ]] && kill "$AGENT_PID" 2>/dev/null || true
  [[ -n "$DEV_PID" ]] && kill "$DEV_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "==> 已退出"
}
trap cleanup EXIT INT TERM

echo "==> 启动 Agent REST + Bridge  http://${HOST}:${PORT}"
npm run agent &
AGENT_PID=$!

# 等 Agent 就绪
for _ in $(seq 1 40); do
  if curl -sf "http://${HOST}:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -sf "http://${HOST}:${PORT}/health" >/dev/null 2>&1; then
  echo "!! Agent 启动失败，请检查上方日志" >&2
  exit 1
fi

echo "==> 启动前端 Vite  http://${DEV_HOST}:${DEV_PORT}/era/  (→ 后端 ${HOST}:${PORT})"
# VITE_ERA_AGENT_HOST/PORT 让前端连到指定后端（见 useEraAgentBridge.ts），不传则回退默认 3847
VITE_ERA_AGENT_HOST="$HOST" VITE_ERA_AGENT_PORT="$PORT" npm run dev -- --host "$DEV_HOST" --port "$DEV_PORT" &
DEV_PID=$!

# 等前端就绪
for _ in $(seq 1 60); do
  if curl -sf "http://${DEV_HOST}:${DEV_PORT}/era/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

OPEN_URL="http://${DEV_HOST}:${DEV_PORT}/era/"
if command -v open >/dev/null 2>&1; then
  open "$OPEN_URL" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$OPEN_URL" >/dev/null 2>&1 || true
fi

cat <<EOF

========================================
Era 本地对话环境已就绪
========================================
前端:   ${OPEN_URL}
Agent:  http://${HOST}:${PORT}
Bridge: ws://${HOST}:${PORT}/bridge
健康检查: curl -s http://${HOST}:${PORT}/health

下一步:
1. 浏览器确认右上角出现「Agent」指示
2. WorkBuddy / OpenClaw 配置 MCP（cwd 指向本仓库）:
   command: npx
   args:    ["tsx", "server/mcp.ts"]
   cwd:     ${ROOT}
   env:     ERA_AGENT_URL=http://${HOST}:${PORT}
3. 在 IM / Agent 里直接对话改内容、标题、高亮、出图

按 Ctrl+C 停止全部服务
========================================

EOF

# 阻塞等待子进程
wait
