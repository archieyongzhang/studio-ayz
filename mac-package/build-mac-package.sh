#!/bin/bash
# 打「我的工作台」Mac 本地版安装包 (在开发沙箱/Linux 上跑, 产出 macOS 用的 zip)
#
# 用法:  bash mac-package/build-mac-package.sh
# 产出:  mac-package/dist/我的工作台-Mac版.zip  (+ 下载页 index.html)
#        —— 放在工作区里, 沙箱回收重建后仍在, 下载服务可直接指向这个目录
#
# 做这些事:
#   1) BUILD_TARGET=local 构建 Next.js (别名切到 SQLite 数据层) → standalone
#   2) 组装包目录: app/ (程序) + migrations/ + runtime/node (Apple Silicon) + 安装脚本
#   3) 生成 zip (保留可执行权限)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_NAME="我的工作台-Mac版"
PKG="/tmp/$PKG_NAME"
NODE_VER="v24.21.0"
NODE_TARBALL="node-${NODE_VER}-darwin-arm64.tar.gz"
NODE_URL="https://nodejs.org/dist/${NODE_VER}/${NODE_TARBALL}"
DIST_DIR="$ROOT/mac-package/dist"
# 用 ASCII 文件名: 预览/下载代理对中文文件名支持不好
ZIP_OUT="$DIST_DIR/workbench-mac.zip"

cd "$ROOT"

echo "== 1/4 构建本地版 (SQLite 数据层) =="
BUILD_TARGET=local pnpm build

echo "== 2/4 组装包目录 =="
rm -rf "$PKG"
mkdir -p "$PKG"

# 2.1 安装脚本 / 启动器 / 图标
cp -R mac-package/. "$PKG/"
rm -f "$PKG/build-mac-package.sh" "$PKG/README.md" "$PKG/make-zip.py" \
      "$PKG/flatten-nm.py" "$PKG/copy-tree.py"

# 2.2 程序本体 (standalone) —— 解引用拷贝, 包内不留符号链接 (macOS 解压更稳妥)
mkdir -p "$PKG/app"
python3 "$ROOT/mac-package/copy-tree.py" .next/standalone "$PKG/app"
mkdir -p "$PKG/app/.next"
python3 "$ROOT/mac-package/copy-tree.py" .next/static "$PKG/app/.next/static"
if [ -d public ]; then python3 "$ROOT/mac-package/copy-tree.py" public "$PKG/app/public"; fi

# 清掉构建机 (Linux) 平台相关的原生包: 本地版不使用 next/image, 无需 sharp
rm -rf "$PKG/app/node_modules/sharp" \
       "$PKG/app/node_modules/.pnpm/sharp@"* \
       "$PKG/app/node_modules/@img" \
       "$PKG/app/node_modules/.pnpm/@img+"*

# 2.3 数据库迁移文件 + 迁移脚本
mkdir -p "$PKG/app/migrations"
cp -R drizzle-sqlite/. "$PKG/app/migrations/"
mkdir -p "$PKG/app/scripts"
cp scripts/migrate-local.mjs "$PKG/app/scripts/"

# 2.4 依赖树: 摊平 pnpm 虚拟存储 + 补上 drizzle-orm 完整包 (含 migrator 子路径)
if [ -d node_modules/drizzle-orm ]; then
  rm -rf "$PKG/app/node_modules/drizzle-orm"
  python3 "$ROOT/mac-package/copy-tree.py" node_modules/drizzle-orm "$PKG/app/node_modules/drizzle-orm"
fi
python3 "$ROOT/mac-package/flatten-nm.py" "$PKG/app"
# 摊平后可能又被带回来的构建机平台包 (sharp 及其 @img 二进制): 本地版用不到, 删掉
rm -rf "$PKG/app/node_modules/@img" "$PKG/app/node_modules/sharp"

# 2.5 运行环境 (Apple Silicon Node, 只留可执行文件)
echo "== 3/4 准备 Node 运行环境 (Apple Silicon) =="
mkdir -p "$PKG/runtime"
if [ ! -x "$PKG/runtime/node/bin/node" ]; then
  if [ ! -f "/tmp/$NODE_TARBALL" ]; then
    curl -sL -o "/tmp/$NODE_TARBALL" "$NODE_URL"
  fi
  rm -rf "$PKG/runtime/node" "$PKG/runtime/node-${NODE_VER}-darwin-arm64"
  tar xzf "/tmp/$NODE_TARBALL" -C "$PKG/runtime"
  mv "$PKG/runtime/node-${NODE_VER}-darwin-arm64" "$PKG/runtime/node"
  # 精简: 只留 node 可执行文件与许可
  rm -rf "$PKG/runtime/node/lib" "$PKG/runtime/node/include" \
         "$PKG/runtime/node/share" "$PKG/runtime/node/bin/npm" \
         "$PKG/runtime/node/bin/npx" "$PKG/runtime/node/bin/corepack"
fi

# 2.6 权限
chmod +x "$PKG/安装我的工作台.command" "$PKG/卸载我的工作台.command" \
         "$PKG/lib/"*.sh "$PKG/我的工作台.app/Contents/MacOS/launch"
chmod +x "$PKG/runtime/node/bin/node"
mkdir -p "$PKG/logs"

echo "== 4/4 打包 zip =="
mkdir -p "$DIST_DIR"
rm -f "$ZIP_OUT"
python3 "$ROOT/mac-package/make-zip.py" "$PKG" "$ZIP_OUT"
# 下载页一并放进 dist, 下载服务直接指向这个目录即可
cp "$ROOT/mac-package/download-page/index.html" "$DIST_DIR/index.html"

echo
echo "✅ 完成: $ZIP_OUT"
du -sh "$ZIP_OUT"
