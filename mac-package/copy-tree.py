#!/usr/bin/env python3
# 递归拷贝目录并「解引用」符号链接 (包内不留符号链接, macOS 解压更稳妥);
# 遇到悬空链接直接跳过 (Next standalone 的 node_modules 里存在这种链接)。
import os
import shutil
import stat
import sys

SRC = sys.argv[1]
DST = sys.argv[2]


def copy_plain(src: str, dst: str) -> None:
    if os.path.islink(src):
        try:
            real = os.path.realpath(src)
            if not os.path.exists(real):
                print(f"  skip dangling link: {src}")
                return
        except OSError:
            return
        src = os.path.realpath(src)
    if os.path.isdir(src):
        os.makedirs(dst, exist_ok=True)
        for name in sorted(os.listdir(src)):
            if name == ".DS_Store":
                continue
            copy_plain(os.path.join(src, name), os.path.join(dst, name))
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    mode = os.stat(src).st_mode
    os.chmod(dst, stat.S_IMODE(mode) | (0o111 if mode & stat.S_IXUSR else 0))


copy_plain(SRC, DST)
print(f"copied: {SRC} -> {DST}")
