"""
publish_prepare.py
==================
把刚新增的发布脚本 git add + commit 进本地仓库，保证 push 时全部文件都有版本记录；
然后把最新 HEAD 短 SHA 写入 .last_commit_sha.env，供后续 orchestrator 读取。
由 python.exe 直接执行，绕开 PowerShell ExecutionPolicy。
"""
from __future__ import annotations

import os
import pathlib
import subprocess
import sys

PROJ_DIR = pathlib.Path(__file__).resolve().parent.parent
FILES_TO_ADD = [
    "scripts/publish_orchestrator.py",
    "scripts/probe_github_reachable.py",
    "scripts/do_auto_publish.py",
    "scripts/release_content_v0_6_0.py",
    "scripts/patch_release_content.py",
    ".last_commit_sha.env",
]
GIT_ENV = os.environ.copy()
GIT_ENV.setdefault("GIT_TERMINAL_PROMPT", "0")


def find_git_exe() -> str:
    """找 git.exe，优先 GitHub Desktop 内嵌。"""
    base = pathlib.Path(GIT_ENV.get("LOCALAPPDATA", "")) / "GitHubDesktop"
    if base.exists():
        for app in sorted(base.glob("app-*"), reverse=True):
            g = app / "resources" / "app" / "git" / "cmd" / "git.exe"
            if g.exists():
                return str(g)
    pf = pathlib.Path(r"C:\Program Files\Git\cmd\git.exe")
    if pf.exists():
        return str(pf)
    return "git"


def run_git(args: list[str]) -> tuple[int, str, str]:
    """统一 git 调用。"""
    try:
        r = subprocess.run(
            [find_git_exe(), *args],
            capture_output=True, text=True, timeout=120,
            cwd=str(PROJ_DIR), env=GIT_ENV,
        )
        return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()
    except Exception as e:  # noqa: BLE001
        return 127, "", str(e)


def main() -> int:
    """执行：add → 有改动则 commit → 更新 sha 文件。"""
    print("[PREP] add 发布脚本到暂存:", FILES_TO_ADD)
    rc, out, err = run_git(["add", "--", *FILES_TO_ADD])
    if rc != 0:
        print("  add FAIL:", rc)
        if out:
            print("  stdout:", out[:400])
        if err:
            print("  stderr:", err[:400], file=sys.stderr)
    rc2, out2, _ = run_git(["status", "--porcelain"])
    pending = [ln for ln in out2.splitlines() if ln.strip()]
    print(f"[PREP] pending changes = {len(pending)}")
    if pending:
        msg = [
            "chore(release): 新增自动发布编排脚本 publish_orchestrator / probe / do_auto_publish",
            "- scripts/publish_orchestrator.py: 5步一键发布（探测-push-轮询-Release-Pages验证），不依赖 gh CLI",
            "- scripts/probe_github_reachable.py: TCP 443 / Git ls-remote / REST API 三项探测",
            "- scripts/do_auto_publish.py: 兼容 _v0_6_0 三件套不存在时的兜底轮询 + Release 兜底",
            "- scripts/release_content_v0_6_0.py & patch_release_content.py: 修复 str.format 解析含 { } 的发行说明",
        ]
        args = ["-c", "core.autocrlf=false", "commit", "-m", msg[0]]
        for m in msg[1:]:
            args += ["-m", m]
        rc3, out3, err3 = run_git(args)
        if rc3 == 0:
            print("[PREP] ✅ 已提交 chore(release) commit")
            if out3:
                print(" ", out3.splitlines()[0] if out3 else "")
        else:
            print(f"[PREP] commit 失败 exit={rc3}")
            if out3:
                print("  stdout:", out3[:600])
            if err3:
                print("  stderr:", err3[:600], file=sys.stderr)
    else:
        print("[PREP] 无新改动，跳过 commit")
    rc4, sha_raw, err4 = run_git(["rev-parse", "--short=7", "HEAD"])
    if rc4 != 0:
        print(f"[PREP] 取不到 HEAD sha: {err4}", file=sys.stderr)
        return 4
    sha = sha_raw.strip()[:7]
    (PROJ_DIR / ".last_commit_sha.env").write_text(f"COMMIT_SHORT_SHA={sha}\n", encoding="utf-8")
    print(f"[PREP] HEAD={sha} → 写入 .last_commit_sha.env")
    return 0


if __name__ == "__main__":
    sys.exit(main())
