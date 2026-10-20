#!/bin/bash
# 「我的工作台」Mac 本地版 · 卸载器
# 默认保留数据文件夹里的 .db 文件, 只移除程序、桌面图标与开机自启。
AGENT_LABEL="com.archie.workbench"
CONFIG="$HOME/Library/Application Support/MyWorkbench/config.sh"
PLIST="$HOME/Library/LaunchAgents/$AGENT_LABEL.plist"
DESKTOP_APP="$HOME/Desktop/我的工作台.app"

echo "======================================"
echo "  我的工作台 · 卸载"
echo "======================================"
echo
DATA_HINT="(未找到配置, 请自行留意数据文件夹)"
if [ -f "$CONFIG" ]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
  DATA_HINT="$DB_FILE"
fi

read -r -p "确定卸载吗? 程序会移除, 数据文件默认保留。 (y/N) " ans
case "$ans" in
  y|Y) ;;
  *) echo "已取消。"; read -r -p "按回车关闭…" _; exit 0 ;;
esac

echo "· 停止后台服务…"
launchctl bootout "gui/$(id -u)/$AGENT_LABEL" >/dev/null 2>&1 || launchctl unload "$PLIST" >/dev/null 2>&1 || true
pkill -f "workbench-mac/app/server.js" >/dev/null 2>&1 || true
pkill -f "我的工作台.*server.js" >/dev/null 2>&1 || true

echo "· 移除开机自启…"
rm -f "$PLIST"

echo "· 移除桌面图标…"
rm -rf "$DESKTOP_APP"

echo
echo "✅ 已卸载。您的数据仍然保留在:"
echo "   $DATA_HINT"
echo "   (想彻底清理就手动删除这个 .db 文件)"
echo
read -r -p "按回车关闭…" _
