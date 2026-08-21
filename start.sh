#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "错误：未找到 pnpm，请先安装 Node.js 和 pnpm。"
  exit 1
fi

if [ ! -d node_modules ]; then
  pnpm install
fi

pnpm run build

web_url="http://127.0.0.1:3080"
if command -v curl >/dev/null 2>&1 \
  && curl --fail --silent --show-error --max-time 2 "$web_url" \
    | grep --quiet 'window.__DSH_BOOT__'; then
  echo "DeepSeek Harness 已在 $web_url 运行，直接使用现有服务。"
  if command -v open >/dev/null 2>&1; then
    if ! open "$web_url"; then
      echo "无法自动打开浏览器，请手动访问 $web_url。"
    fi
  fi
  exit 0
fi

pnpm dsh web
