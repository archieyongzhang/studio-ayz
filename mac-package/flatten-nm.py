#!/usr/bin/env python3
# 把 Next standalone 里的 pnpm 虚拟存储 (.pnpm) 摊平成普通 hoisted node_modules:
#   - 结果无符号链接、无 pnpm 结构, macOS 解压 100% 可靠
#   - 本应用依赖全是纯 JS 包 (next / react / react-dom / drizzle-orm …), 摊平无副作用
import os
import shutil
import sys

APP = sys.argv[1]
NM = os.path.join(APP, "node_modules")
STORE = os.path.join(NM, ".pnpm")


def merge_into(src_dir: str, dst_dir: str) -> None:
    for name in sorted(os.listdir(src_dir)):
        if name in (".DS_Store", ".bin"):
            continue
        src = os.path.join(src_dir, name)
        dst = os.path.join(dst_dir, name)
        if os.path.islink(src):
            real = os.path.realpath(src)
            if not os.path.exists(real):
                print(f"  drop dangling: {os.path.relpath(src, APP)}")
                continue
            src = real
        if os.path.isdir(src):
            if os.path.exists(dst):
                merge_into(src, dst)  # 同名包: 补齐缺的文件
            else:
                shutil.copytree(src, dst, symlinks=False)
        else:
            if not os.path.exists(dst):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)


if not os.path.isdir(STORE):
    print("no .pnpm store, skip flatten")
    sys.exit(0)

# 1) 先摊平 pnpm 的 hoisted 集合
hoisted = os.path.join(STORE, "node_modules")
if os.path.isdir(hoisted):
    merge_into(hoisted, NM)

# 2) 再摊平每个具体包 (已存在则跳过, 保证版本不互相覆盖)
for entry in sorted(os.listdir(STORE)):
    if entry == "node_modules":
        continue
    inner = os.path.join(STORE, entry, "node_modules")
    if os.path.isdir(inner):
        merge_into(inner, NM)

# 3) 清掉虚拟存储与残留符号链接
shutil.rmtree(STORE, ignore_errors=True)
for name in sorted(os.listdir(NM)):
    p = os.path.join(NM, name)
    if os.path.islink(p):
        print(f"  drop leftover link: {name}")
        os.remove(p)

print("flatten done:", NM)
