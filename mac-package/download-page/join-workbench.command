#!/bin/bash
# 「我的工作台」Mac 版 · 合并下载分块
# 用法: 把 6 个分块 (part-00 ~ part-05) 和本脚本下载到同一个文件夹, 双击本脚本即可。
#       它会合并成一个 workbench-mac.zip 并校验完整性, 然后打开所在文件夹。
set -e

EXPECTED="2f8c25843d2e65d98bec775a1d7de4eba6bf8da6648ad07be6313a83abddb1a1"
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"

say() { osascript -e "display dialog \"$1\" buttons {\"好\"} default button 1 with title \"我的工作台 · 合并分块\"" >/dev/null 2>&1 || echo "$1"; }

find_dir() {
  for d in "$SELF_DIR" "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents"; do
    if [ -f "$d/part-00" ]; then echo "$d"; return 0; fi
  done
  return 1
}

DIR="$(find_dir)" || { say "没找到分块文件。请把 part-00 ~ part-05 和本脚本放在同一个文件夹里再双击。"; exit 1; }

echo "分块所在文件夹: $DIR"
MISSING=""
for i in 00 01 02 03 04 05; do
  [ -f "$DIR/part-$i" ] || MISSING="$MISSING part-$i"
done
[ -n "$MISSING" ] && { say "缺少分块:$MISSING
请确认 6 个分块都下载完整（part-00 到 part-05）。"; exit 1; }

OUT="$DIR/workbench-mac.zip"
rm -f "$OUT"
cat "$DIR/part-00" "$DIR/part-01" "$DIR/part-02" "$DIR/part-03" "$DIR/part-04" "$DIR/part-05" > "$OUT"

ACTUAL="$(shasum -a 256 "$OUT" | awk '{print $1}')"
if [ "$ACTUAL" != "$EXPECTED" ]; then
  say "合并后校验失败（文件可能下载不完整）。
实际: $ACTUAL
请删掉分块重新下载一遍再试。"
  exit 1
fi

open -R "$OUT"
say "✅ 合并完成并通过完整性校验！

文件位置:
$OUT

接下来: 双击解压后的「安装我的工作台.command」开始安装。"
