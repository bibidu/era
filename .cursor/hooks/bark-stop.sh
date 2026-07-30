#!/usr/bin/env bash
# Cursor stop hook: push status:model to Bark (api.day.app).
set -euo pipefail

BARK_KEY="AUuQxuy2zcb3v2VCjuHmgC"
# npmmirror CDN — accessible in mainland China
ICON_URL="https://registry.npmmirror.com/@lobehub/icons-static-png/1.75.0/files/light/cursor.png"

input="$(cat || true)"
if [ -z "${input}" ]; then
  printf '%s\n' '{}'
  exit 0
fi

status="$(printf '%s' "$input" | jq -r '.status // "unknown"')"
model="$(printf '%s' "$input" | jq -r '.model // "unknown"')"
send_text="${status}:${model}"

# Bark path segment must be URL-encoded (model names may contain spaces / special chars)
encoded="$(printf '%s' "$send_text" | jq -sRr @uri)"

url="https://api.day.app/${BARK_KEY}/${encoded}?icon=$(printf '%s' "$ICON_URL" | jq -sRr @uri)"

# Best-effort notify; never fail the agent stop path
curl -fsS --max-time 10 "$url" >/dev/null 2>&1 || true

printf '%s\n' '{}'
