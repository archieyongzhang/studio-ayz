#!/bin/bash
# 「我的工作台」本地版 · 常驻启动脚本 (开机自启的 LaunchAgent 调它, 安装器也用它)
set -e
CONFIG="$HOME/Library/Application Support/MyWorkbench/config.sh"
if [ ! -f "$CONFIG" ]; then
  echo "[start] 未找到配置 $CONFIG, 请先运行安装器"
  exit 1
fi
# shellcheck disable=SC1090
source "$CONFIG"

NODE="$PKG_DIR/runtime/node/bin/node"
LOG="$PKG_DIR/logs/server.log"
mkdir -p "$PKG_DIR/logs" "$DATA_DIR"

export WORKBENCH_DB="$DB_FILE"
export MIGRATIONS_DIR="$PKG_DIR/app/migrations"
export PORT HOSTNAME=127.0.0.1

# 启动前先跑一遍版本化迁移: 升级包时只补差异, 已有数据不受影响
"$NODE" --no-warnings "$PKG_DIR/app/scripts/migrate-local.mjs" >>"$LOG" 2>&1

cd "$PKG_DIR/app"
exec "$NODE" --no-warnings server.js >>"$LOG" 2>&1
