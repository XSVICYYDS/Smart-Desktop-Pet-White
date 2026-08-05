# -*- coding: utf-8 -*-
"""构建脚本：使用 python 调用 node_modules/.bin/*.cmd 绕过 PowerShell 执行策略，执行 tsc 校验 + vite build
"""
from __future__ import annotations

import os
import subprocess
import sys
from typing import List, Tuple

ROOT = r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白"
NODE = r"node.exe"


def sh(args: List[str], cwd: str = ROOT, timeout: int = 600) -> Tuple[int, str, str]:
    r = subprocess.run(
        args,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        timeout=timeout,
    )
    return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()


def main() -> int:
    tsc_cmd = os.path.join(ROOT, "node_modules", ".bin", "tsc.cmd")
    vite_cmd = os.path.join(ROOT, "node_modules", ".bin", "vite.cmd")

    if not os.path.isfile(tsc_cmd):
        print("❌ 未找到 node_modules/.bin/tsc.cmd，请先执行 npm install")
        return 2
    if not os.path.isfile(vite_cmd):
        print("❌ 未找到 node_modules/.bin/vite.cmd，请先执行 npm install")
        return 3

    section = lambda t: print("\n" + "=" * 70 + "\n▶ " + t + "\n" + "=" * 70)

    # Step 1: tsc --noEmit 类型检查
    section("TypeScript 类型检查 (tsc --noEmit)")
    code, out, err = sh([tsc_cmd, "--noEmit", "-p", "tsconfig.json"])
    combined = out + ("\n" if out and err else "") + err
    print(combined[-3000:] if len(combined) > 3000 else combined)
    if code != 0:
        print(f"\n❌ tsc 类型检查失败，exit code = {code}")
        return code
    print("✅ tsc 类型检查通过（0 errors）")

    # Step 2: vite build
    section("Vite 生产构建 (vite build)")
    code, out, err = sh([vite_cmd, "build"])
    combined = out + ("\n" if out and err else "") + err
    print(combined[-4000:] if len(combined) > 4000 else combined)
    if code != 0:
        print(f"\n❌ vite build 失败，exit code = {code}")
        return code
    print("✅ vite build 构建成功")
    return 0


if __name__ == "__main__":
    sys.exit(main())
