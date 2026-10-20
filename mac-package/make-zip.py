#!/usr/bin/env python3
# 打包 Mac 安装包 zip: 保留可执行权限与符号链接 (macOS 解压后双击 .command 可直接运行)
import os
import stat
import sys
import zipfile

SRC_DIR = sys.argv[1]          # 待打包目录
OUT_ZIP = sys.argv[2]          # 输出 zip 路径
EXEC_SUFFIXES = (".command", ".sh")
EXEC_NAMES = {"launch", "node"}


def is_exec(path: str, name: str) -> bool:
    if name.endswith(EXEC_SUFFIXES) or name in EXEC_NAMES:
        return True
    return bool(os.stat(path).st_mode & stat.S_IXUSR) and os.path.isfile(path)


def main() -> None:
    base = os.path.basename(os.path.abspath(SRC_DIR))
    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(SRC_DIR):
            dirs.sort()
            for d in dirs:
                full = os.path.join(root, d)
                if os.path.islink(full):
                    continue
                arc = os.path.join(base, os.path.relpath(full, SRC_DIR)) + "/"
                info = zipfile.ZipInfo(arc)
                info.external_attr = (stat.S_IFDIR | 0o755) << 16
                zf.writestr(info, "")
            for f in sorted(files):
                full = os.path.join(root, f)
                arc = os.path.join(base, os.path.relpath(full, SRC_DIR))
                if os.path.islink(full):
                    info = zipfile.ZipInfo(arc)
                    info.external_attr = (stat.S_IFLNK | 0o777) << 16
                    zf.writestr(info, os.readlink(full))
                    continue
                mode = 0o755 if is_exec(full, f) else 0o644
                with open(full, "rb") as fh:
                    data = fh.read()
                info = zipfile.ZipInfo(arc, date_time=(2025, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = (stat.S_IFREG | mode) << 16
                zf.writestr(info, data)


if __name__ == "__main__":
    main()
    size = os.path.getsize(OUT_ZIP)
    print(f"zip ok: {OUT_ZIP} ({size / 1024 / 1024:.1f} MB)")
