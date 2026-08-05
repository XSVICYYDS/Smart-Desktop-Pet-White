"""
同步 Smart-Desktop-Pet-White/src 下的改动文件到仓库根目录 ./src
（因为 GitHub Actions deploy.yml 构建的是根目录的 package.json / src）
"""
from __future__ import annotations

import pathlib
import shutil
import sys

PROJ = pathlib.Path(r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白")
SRC_SUB = PROJ / "Smart-Desktop-Pet-White" / "src"
SRC_ROOT = PROJ / "src"

# 已知在 Smart-Desktop-Pet-White 目录改过的文件（路径相对于 src/）
FILES = [
    "App.tsx",
    "components/Navbar.tsx",
    "components/SliderCaptcha.tsx",
    "components/CaptchaCanvas.tsx",
    "lib/authClient.ts",
    "pages/AdminConsole.tsx",
    "pages/Auth.tsx",
]

ASSETS = [
    "assets/xiaobai-logo.gif",
]


def copy_one(rel: str, *, is_asset: bool = False) -> bool:
    s = SRC_SUB / rel
    if not s.exists():
        print(f"  [SKIP] 子目录里不存在: {rel}")
        return False
    d = SRC_ROOT / rel
    d.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(s, d)
    if not is_asset:
        print(f"  [OK  ] {rel}  ({s.stat().st_size} bytes)")
    else:
        print(f"  [OK  ] asset: {rel}  ({s.stat().st_size} bytes)")
    return True


def main() -> int:
    print("[SYNC] src 目录：子项目 Smart-Desktop-Pet-White/src → 仓库根目录 src")
    if not SRC_SUB.exists():
        print(f"[ERR ] 子目录不存在: {SRC_SUB}")
        return 1
    cnt = 0
    for f in FILES:
        if copy_one(f, is_asset=False):
            cnt += 1
    for a in ASSETS:
        if copy_one(a, is_asset=True):
            cnt += 1
    print(f"[SYNC] 共同步 {cnt} 个文件。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
