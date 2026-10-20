#!/bin/bash
# 「我的工作台」Mac 本地版 · 启动器 (被桌面图标 .app 调用)
# 逻辑: 服务已在跑 → 直接开浏览器; 没在跑 → 启动(优先拉起开机自启的常驻进程) → 等就绪 → 开浏览器
CONFIG="$HOME/Library/Application Support/MyWorkbench/config.sh"
AGENT_LABEL="com.archie.workbench"

if [ ! -f "$CONFIG" ]; then
  osascript -e 'display alert "还没安装" message "请先双击安装包里的「安装我的工作台.command」完成安装。" as critical' >/dev/null 2>&1
  exit 1
fi
# shellcheck disable=SC1090
source "$CONFIG"

URL="http://127.0.0.1:$PORT/"
LOG="$PKG_DIR/logs/server.log"
mkdir -p "$PKG_DIR/logs" "$DATA_DIR"

is_up() { curl -fs "$URL/api/health" >/dev/null 2>&1; }

if ! is_up; then
  # 若装了开机自启, 让 launchd 拉起它 (避免重复起两个进程抢端口)
  if [ -f "$HOME/Library/LaunchAgents/$AGENT_LABEL.plist" ]; then
    launchctl kickstart -k "gui/$(id -u)/$AGENT_LABEL" >/dev/null 2>&1 || true
  fi
  for _ in $(seq 1 20); do is_up && break; sleep 0.5; done

  # 仍未起来 → 手动拉起
  if ! is_up; then
    export WORKBENCH_DB="$DB_FILE"
    export MIGRATIONS_DIR="$PKG_DIR/app/migrations"
    export PORT HOSTNAME=127.0.0.1
    "$PKG_DIR/runtime/node/bin/node" --no-warnings "$PKG_DIR/app/scripts/migrate-local.mjs" >>"$LOG" 2>&1 || true
    ( cd "$PKG_DIR/app" && nohup "$PKG_DIR/runtime/node/bin/node" --no-warnings server.js >>"$LOG" 2>&1 & )
    for _ in $(seq 1 60); do is_up && break; sleep 0.5; done
  fi
fi

if is_up; then
  open "$URL"
else
  osascript -e "display alert \"启动失败\" message \"请把日志发给开发者排查:\n$LOG\" as critical" >/dev/null 2>&1
fi
