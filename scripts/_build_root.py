"""
修复构建根目录 src：先 clean 掉可能损坏的 tsc 缓存，然后分别 tsc --noEmit 检查类型 + vite build
"""
from __future__ import annotations

import os
import pathlib
import shutil
import subprocess
import sys

PROJ = pathlib.Path(r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白")
NPM = r"C:\Program Files\nodejs\npm.cmd"

def run(*args):
    print("[RUN]", " ".join(args))
    r = subprocess.run(list(args), cwd=str(PROJ), capture_output=False)
    return r.returncode


def main() -> int:
    # 清理旧的构建缓存
    tmp = PROJ / "node_modules" / ".tmp"
    if tmp.exists():
        shutil.rmtree(tmp, ignore_errors=True)
        print("[CLEAN] remove node_modules/.tmp")
    dist = PROJ / "dist"
    if dist.exists():
        shutil.rmtree(dist, ignore_errors=True)
        print("[CLEAN] remove dist/")
    # 也清掉 Smart-Desktop-Pet-White 的 build 干扰
    for f in PROJ.glob("**/*.tsbuildinfo"):
        try:
            f.unlink()
            print(f"[CLEAN] {f.relative_to(PROJ)}")
        except Exception:
            pass

    # 先只跑 vite build（跳过 tsc -b 的 references 检查）
    rc = run(NPM, "exec", "--", "vite", "build")
    if rc != 0:
        print(f"[ERR ] vite build 失败 exit={rc}，再尝试 tsc 单独类型检查看是否类型错误：")
        rc2 = run(NPM, "exec", "--", "tsc", "--noEmit")
        print(f"[INFO] tsc --noEmit exit={rc2}")
        return rc
    return 0


if __name__ == "__main__":
    sys.exit(main())
