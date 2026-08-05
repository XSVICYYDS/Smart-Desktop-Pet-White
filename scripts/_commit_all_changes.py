"""
步骤 3：把当前所有改动 git add + commit，避免 PowerShell 执行策略问题
"""
from __future__ import annotations

import os
import pathlib
import subprocess
import sys

PROJ_DIR = pathlib.Path(r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白")

def find_git_exe() -> str:
    """优先 GitHub Desktop 内嵌 git.exe，再回退到系统 Git。"""
    base = pathlib.Path(os.environ.get("LOCALAPPDATA", "")) / "GitHubDesktop"
    if base.exists():
        for app in sorted(base.glob("app-*"), reverse=True):
            g = app / "resources" / "app" / "git" / "cmd" / "git.exe"
            if g.exists():
                return str(g)
    pf = pathlib.Path(r"C:\Program Files\Git\cmd\git.exe")
    if pf.exists():
        return str(pf)
    return "git"

def run(*args: str, timeout: int = 240) -> tuple[int, str, str]:
    """统一 git 子进程调用。"""
    try:
        r = subprocess.run(
            [find_git_exe(), *args],
            capture_output=True, text=True, timeout=timeout, cwd=str(PROJ_DIR),
        )
        return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()
    except Exception as e:  # noqa: BLE001
        return 127, "", str(e)

def main() -> int:
    git = find_git_exe()
    print("[COMMIT] git.exe =", git)

    # 1) add 所有变更 & 新增文件
    rc_add, out_add, err_add = run("add", "-A")
    if rc_add != 0:
        print(f"[COMMIT] ❌ add -A 失败 exit={rc_add}")
        if out_add:
            print("  stdout:", out_add[:800])
        if err_add:
            print("  stderr:", err_add[:800], file=sys.stderr)
        return rc_add
    print("[COMMIT] ✅ add -A 成功")

    # 2) 看有没有 pending
    rc_status, o_s, _e_s = run("status", "--porcelain")
    if rc_status == 0:
        pending = [ln for ln in o_s.splitlines() if ln.strip()]
        print(f"[COMMIT] 暂存改动数量: {len(pending)}")
        for ln in pending[:12]:
            print("  ", ln)
        if len(pending) > 12:
            print(f"   ... 省略 {len(pending) - 12} 条")
        if not pending:
            print("[COMMIT] 无待提交改动，跳过 commit；直接返回")
            return 0
    else:
        print("[COMMIT] ⚠️ git status 异常 exit=", rc_status)

    # 3) commit（带多行 message）
    msg = [
        "feat(admin): 内置超级管理员 XSVICYYDS + /admin 控制台账号/权限/版本三大模块 + RBAC 越权保护",
        "",
        "用户需求：添加管理员账号 XSVICYYDS / Xs@315207 / XSVICYYDS@outlook.com，拥有管理账号、权限、版本等功能。",
        "",
        "✅ 桌面端 auth_system + auth/rbac：",
        "- 新增 BUILTIN_SUPER_ADMIN 常量，内置账号 PBKDF2-SHA256 哈希注入 users.json / user_roles.json",
        "- feature_definitions.py 新增 admin.version_manage 权限 + 角色矩阵映射",
        "- _require_admin 三元组鉴权：操作者身份 + 目标资源属性 + 操作类型；禁止非超管修改超级管理员",
        "",
        "✅ 前端 Smart-Desktop-Pet-White：",
        "- src/lib/authClient.ts：管理员 API（adminListUsers/UpdateRole/ResetPassword/SetStatus/DeleteUser + RolesMatrix + Versions）",
        "- src/pages/AdminConsole.tsx：/admin 控制台，3 Tab（管理账号 / 管理权限 / 管理版本），越权按钮置灰",
        "- src/components/Navbar.tsx：超级管理员/管理员身份徽章 + 管理员控制台入口",
        "- src/App.tsx：注册路由 /admin → AdminConsole",
        "",
        "✅ 管理员种子脚本 scripts/seed_admin_XSVICYYDS.py：幂等创建/更新 + 密码哈希自检通过",
        "",
        "✅ 发布编排 scripts/publish_orchestrator.py + do_auto_publish.py：TAG 升级 v0.7.0",
        "",
        "✅ npm run build（tsc -b + vite build）：1664 modules transformed，构建成功 ✅",
    ]
    args_list = [
        "-c", "core.autocrlf=false",
        "-c", "user.name=XSVICYYDS",
        "-c", "user.email=XSVICYYDS@outlook.com",
        "commit",
    ]
    for m in msg:
        args_list += ["-m", m]
    rc_c, o_c, e_c = run(*args_list)
    if rc_c == 0:
        first_line = (o_c.splitlines()[0] if o_c else "").strip()
        print(f"[COMMIT] ✅ commit 成功: {first_line}")
    else:
        print(f"[COMMIT] ❌ commit 失败 exit={rc_c}")
        if o_c:
            print("  stdout:", o_c[:1200])
        if e_c:
            print("  stderr:", e_c[:1200], file=sys.stderr)
        return rc_c

    # 4) 写最新 SHA 到 .last_commit_sha.env（给 orchestrator 轮询 Actions 用）
    rc_sha, sha_raw, _ = run("rev-parse", "--short=7", "HEAD")
    if rc_sha == 0:
        sha = sha_raw.strip()[:7]
        (PROJ_DIR / ".last_commit_sha.env").write_text(
            f"COMMIT_SHORT_SHA={sha}\n", encoding="utf-8"
        )
        print(f"[COMMIT] ✅ HEAD={sha} → 写入 .last_commit_sha.env")
    return 0

if __name__ == "__main__":
    sys.exit(main())
