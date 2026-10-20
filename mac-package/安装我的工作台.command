#!/bin/bash
# 「我的工作台」Mac 本地版 · 安装器
# 做四件事:
#   1) 让用户选择数据文件夹 (数据库文件就放这里)
#   2) 在桌面生成「我的工作台」图标
#   3) 装好开机自启 (登录后服务在后台静默运行)
#   4) 立刻启动并打开浏览器
set -e

cd "$(dirname "$0")"
PKG_DIR="$(pwd)"
SUPPORT_DIR="$HOME/Library/Application Support/MyWorkbench"
CONFIG="$SUPPORT_DIR/config.sh"
PLIST="$HOME/Library/LaunchAgents/com.archie.workbench.plist"
AGENT_LABEL="com.archie.workbench"

echo "======================================"
echo "  我的工作台 · Mac 本地版 安装"
echo "======================================"
echo

if [ "$(uname -m)" != "arm64" ]; then
  echo "⚠️  检测到不是 Apple Silicon (M 系列) 芯片。"
  echo "    本安装包内置的是 arm64 运行环境, 在 Intel Mac 上无法运行。"
  echo "    请退出安装, 并联系打包含 Intel 版本。"
  echo
  read -r -p "按回车退出…" _
  exit 1
fi

# ---------- 1. 选择数据文件夹 ----------
echo "第 1 步: 请选择存放数据的文件夹 (会弹出选择窗口)"
echo "        建议选「文稿 / Documents」下面的文件夹, 不要选 iCloud 等云盘同步目录。"
echo

DEFAULT_DIR="$HOME/Documents"
CHOSEN=$(osascript -e "POSIX path of (choose folder with prompt \"请选择「我的工作台」存放数据的文件夹:\" default location POSIX file \"$DEFAULT_DIR\")" 2>/dev/null || true)

if [ -z "$CHOSEN" ]; then
  echo "未选择文件夹, 安装已取消。"
  read -r -p "按回车退出…" _
  exit 1
fi
DATA_DIR="${CHOSEN%/}"
echo "数据文件夹: $DATA_DIR"
echo

mkdir -p "$DATA_DIR"
DB_FILE="$DATA_DIR/workbench.db"
mkdir -p "$PKG_DIR/logs" "$SUPPORT_DIR"

# ---------- 2. 写配置 ----------
cat > "$CONFIG" <<EOF
# 「我的工作台」本地版配置 (安装器自动生成, 可手动修改后重启生效)
PKG_DIR="$PKG_DIR"
DATA_DIR="$DATA_DIR"
DB_FILE="$DB_FILE"
PORT="4321"
EOF
chmod 600 "$CONFIG"
echo "第 2 步: 配置已写入 $CONFIG"

# ---------- 3. 桌面图标 ----------
DESKTOP_APP="$HOME/Desktop/我的工作台.app"
rm -rf "$DESKTOP_APP"
cp -R "$PKG_DIR/我的工作台.app" "$DESKTOP_APP"
# 图标: 用系统自带 sips 把 png 转成 icns (失败则用系统默认图标, 不影响使用)
if [ -f "$PKG_DIR/assets/icon.png" ]; then
  mkdir -p "$DESKTOP_APP/Contents/Resources"
  if sips -s format icns "$PKG_DIR/assets/icon.png" --out "$DESKTOP_APP/Contents/Resources/icon.icns" >/dev/null 2>&1; then
    echo "第 3 步: 桌面图标已生成 (含自定义图标)"
  else
    echo "第 3 步: 桌面图标已生成"
  fi
else
  echo "第 3 步: 桌面图标已生成"
fi

# ---------- 4. 开机自启 ----------
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$AGENT_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$PKG_DIR/lib/start-server.sh</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$PKG_DIR/logs/agent.log</string>
  <key>StandardErrorPath</key><string>$PKG_DIR/logs/agent.err.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$AGENT_LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || launchctl load "$PLIST" >/dev/null 2>&1 || true
echo "第 4 步: 已设置开机自启 (登录后自动在后台运行)"

# ---------- 5. 启动并打开 ----------
echo "第 5 步: 正在启动服务…"
bash "$PKG_DIR/lib/start-server.sh" >/dev/null 2>&1 &
for _ in $(seq 1 60); do
  if curl -fs "http://127.0.0.1:4321/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.5
done

if curl -fs "http://127.0.0.1:4321/api/health" >/dev/null 2>&1; then
  open "http://127.0.0.1:4321/"
  echo
  echo "✅ 安装完成! 浏览器应该已经打开了工作台。"
  echo
  echo "   以后使用: 双击桌面上的「我的工作台」图标即可。"
  echo "   数据文件: $DB_FILE"
  echo "   备份方式: 拷走上面这个 .db 文件即可。"
else
  echo
  echo "⚠️  服务似乎没起来, 请把下面这个日志文件发给我排查:"
  echo "    $PKG_DIR/logs/server.log"
fi
echo
read -r -p "按回车关闭本窗口…" _
