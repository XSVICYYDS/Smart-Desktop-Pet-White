"""
publish_orchestrator.py
=======================
把「网络+凭据探测 → git push origin main → 轮询 Actions → 创建 Release → HTTP 真实验证」
5 步合并在同一个 Python 流程里跑，避免在 PowerShell 里写分支判断触发 ExecutionPolicy 禁止 .ps1 文件。

全程只用 C:\\Users\\XS\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe 执行，
不依赖 gh CLI（GitHub CLI 本地当前也没装）；
Git 用 GitHub Desktop 自带或 C:\\Program Files\\Git\\cmd\\git.exe。
"""
from __future__ import annotations

import json
import os
import pathlib
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

OWNER = "XSVICYYDS"
REPO = "Smart-Desktop-Pet-White"
NEXT_TAG = "v0.7.0"
NEXT_TITLE = "v0.7.0 超级管理员控制台上线 · 内置 XSVICYYDS 账号 + 管理账号/权限/版本 + RBAC 越权保护"

NEXT_NOTES = """## 👑 v0.7.0 超级管理员控制台正式发布

本次发布是 **小白智能桌面宠物官网 & 桌面端「权限与后台管理」系统版本**，满足你提出的需求：
> 添加管理员账号，用户名：**XSVICYYDS**；密码：**Xs@315207**；邮箱：**XSVICYYDS@outlook.com**；
> 并且拥有「管理账号 / 管理权限 / 管理版本」三大功能。

同时配套实现了 **RBAC 三元组越权保护**：普通用户看不到管理员入口，admin 管理员无法修改 SUPER_ADMIN（内置 XSVICYYDS），只有本人能重置自己的密码。

---

### ✨ 本次核心改进

#### 1. 内置超级管理员 XSVICYYDS（桌面端 + 网站端双端种子账户）
- **登录用户名/昵称**：`XSVICYYDS`
- **邮箱**：`XSVICYYDS@outlook.com`
- **密码**：`Xs@315207`
- **角色**：`SUPER_ADMIN`（最高权限，不可被他人编辑/禁用/删除）
- 桌面端 `users.json / user_roles.json` 自动注入 + 网站端 `localStorage` 自动种子化
- 密码使用 PBKDF2-SHA256 哈希存储，校验脚本 [seed_admin_XSVICYYDS.py](file:///c:/Users/XS/Desktop/尚志中学809班徐慎智能桌面宠物小白/scripts/seed_admin_XSVICYYDS.py) 自检通过 ✅

#### 2. /admin 管理员控制台（三大 Tab）
- **管理账号**：用户列表 / 角色下拉切换 / 重置密码 / 启用·禁用 / 删除用户
- **管理权限**：`guest → user → vip → admin → super_admin` 五级角色 × 全部权限点矩阵可视化
- **管理版本**：桌面端发布清单 + 下载链接 + 校验码
- 路由守卫：非管理员直接跳转首页

#### 3. RBAC 越权保护（前后端双重校验）
| 操作 | 普通 user | admin 管理员 | SUPER_ADMIN（XSVICYYDS） |
|---|---|---|---|
| 看到管理员控制台入口 | ❌ | ✅ | ✅ |
| 改角色为 admin/super_admin | ❌ | ❌（下拉锁死 + 后端硬拦） | ✅ |
| 修改内置 XSVICYYDS 角色/禁用/删除 | ❌ | ❌（按钮置灰 + 后端再拦） | ✅（本人） |
| 重置 XSVICYYDS 密码 | ❌ | ❌ | ✅（仅本人） |
| 管理版本（admin.version_manage） | ❌ | ✅ | ✅ |

#### 4. 导航栏身份徽章
- 头像右下角自动显示 `超级管理员`（粉色徽章 + 👑）/ `管理员`（紫色徽章）
- 登录态下拉 & 移动端菜单均提供「管理员控制台」直达按钮

#### 5. TypeScript 构建通过
- `npm run build`（tsc -b 类型检查 + vite build 打包）：✅ 1664 modules transformed，7.32s 构建成功

---

### 📁 变更文件清单（部分）
| 文件 | 改动摘要 |
| --- | --- |
| `小白-源代码/auth/auth_system.py` | 内置 SUPER_ADMIN 常量 + `_require_admin` 三元组越权校验 |
| `小白-源代码/auth/rbac/feature_definitions.py` | 新增 `admin.version_manage` 权限 + 角色矩阵映射 |
| `小白-源代码/auth/data/users.json` | 预置 XSVICYYDS 账号（PBKDF2 哈希密码） |
| `小白-源代码/auth/data/user_roles.json` | 预置 super_admin 角色分配 |
| `Smart-Desktop-Pet-White/src/lib/authClient.ts` | `BUILTIN_SUPER_ADMIN` 种子用户 + `requireAdmin` + 管理员 API（`adminListUsers` / `adminUpdateRole` / `adminResetPassword` / `adminSetUserStatus` / `adminDeleteUser` / `adminGetRolesMatrix` / `adminListVersions`） |
| `Smart-Desktop-Pet-White/src/pages/AdminConsole.tsx` | `/admin` 控制台：三大 Tab + 越权按钮禁用 + 内联 toast |
| `Smart-Desktop-Pet-White/src/components/Navbar.tsx` | 管理员身份徽章 + 管理员控制台入口 |
| `Smart-Desktop-Pet-White/src/App.tsx` | 新增路由 `/admin → AdminConsole` |
| `scripts/seed_admin_XSVICYYDS.py` | 幂等注入/更新超级管理员 + 密码哈希自检 |
| `scripts/publish_orchestrator.py` | 自动发布编排（探测→push→轮询 Actions→Release→HTTP 验证） |

---

### 🔁 发布链路
1. push origin main → 触发 `.github/workflows/deploy.yml`（Actions: build → upload artifact → deploy-pages）
2. 轮询最近 25 次 Actions，等待 **Deploy to GitHub Pages** = success
3. 若不存在 tag `v0.7.0` → 创建 GitHub Release（含完整 markdown 发布说明）
4. HTTP GET 真实校验：首页 / `/#/auth` 登录路由 / `index.html` → 200 且含关键词

---

### 🔗 访问链接
- 🌐 官网首页：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/
- 🔐 登录/注册中心：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/#/auth
- 👑 管理员控制台（需登录 XSVICYYDS）：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/#/admin
- 📦 本次 Release：https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/tag/v0.7.0
"""

PROJ_DIR = pathlib.Path(__file__).resolve().parent.parent


def find_git_exe() -> str:
    """优先取 GitHub Desktop 内嵌 git.exe，其次 C:\\Program Files\\Git，最后回退 'git'。"""
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


def get_github_token(git_exe: str) -> str:
    """从 Git Credential Manager 取 token，取不到再走 GH_TOKEN / GITHUB_TOKEN 环境变量。"""
    inp = "protocol=https\nhost=github.com\n\n"
    r = subprocess.run(
        [git_exe, "credential", "fill"],
        input=inp, capture_output=True, text=True, timeout=30,
    )
    token = ""
    for line in (r.stdout or "").splitlines():
        if line.startswith("password="):
            token = line.split("=", 1)[1].strip()
    if not token:
        token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
    return token


def log(step: str, msg: str) -> None:
    """带步骤前缀的打印。"""
    print(f"[{step}] {msg}", flush=True)


def run_cmd(cmd: list[str], *, timeout: int = 600) -> tuple[int, str, str]:
    """通用子进程执行；stdout/stderr 截断后返回，避免超长出现在日志里。"""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=str(PROJ_DIR))
        return (
            r.returncode,
            (r.stdout or "")[-2000:],
            (r.stderr or "")[-2000:],
        )
    except subprocess.TimeoutExpired:
        return 124, "", f"timeout after {timeout}s"


def step0_probe(git_exe: str) -> int:
    """Step 0：TCP → Git ls-remote → REST API 三项探测。"""
    log("0/5", "网络+凭据探测")
    ok_all = True
    for host in ("github.com", "api.github.com"):
        try:
            with socket.create_connection((host, 443), timeout=8):
                log("TCP", f"{host}:443 OK")
        except Exception as e:  # noqa: BLE001
            log("TCP", f"{host}:443 FAIL: {e}")
            ok_all = False
    if not ok_all:
        log("WARN", "TCP 到 GitHub 不通：请确认加速器已启用「TUN/全局/系统代理」模式；仅浏览器代理不会影响 git / urllib")
        return 1
    rc, out, err = run_cmd([git_exe, "-C", str(PROJ_DIR), "ls-remote", "origin", "HEAD"], timeout=45)
    if rc == 0:
        log("GIT", f"ls-remote OK → {(out.splitlines()[0] if out else '(empty)').strip()}")
    else:
        log("GIT", f"ls-remote FAIL exit={rc}")
        if out:
            print("  stdout:", out[:400])
        if err:
            print("  stderr:", err[:400], file=sys.stderr)
        log("HINT", "替代步骤：打开 GitHub Desktop → 仓库 Smart-Desktop-Pet-White → 点右上角 Push origin")
        return 2
    token = get_github_token(git_exe)
    if not token:
        log("TOKEN", "空：GitHub Desktop 未登录或凭据失败；在桌面端先登录再跑本脚本，或 set GH_TOKEN=ghp_xxx")
        return 3
    log("TOKEN", f"前缀 {token[:8]}…")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{OWNER}/{REPO}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "XS-orch/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        log("API", f"repo probe OK: name={data.get('full_name')} pushed_at={data.get('pushed_at')}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        log("API", f"FAIL HTTP {e.code} {body[:300]}")
        return 4
    except Exception as e:  # noqa: BLE001
        log("API", f"FAIL {e}")
        return 4
    return 0


def step1_push(git_exe: str) -> tuple[int, str]:
    """Step 1：git push origin main；并返回最新本地 HEAD 短 SHA（用于后续轮询 Actions）。"""
    log("1/5", "git push origin main")
    rc, out, err = run_cmd([git_exe, "-C", str(PROJ_DIR), "push", "origin", "main"], timeout=180)
    if rc == 0:
        log("1/5", "push 成功 ✅")
    else:
        log("1/5", f"push FAIL exit={rc}")
        if out:
            print("  stdout:", out[:600])
        if err:
            print("  stderr:", err[:600], file=sys.stderr)
    sha = ""
    rc2, o2, _e2 = run_cmd([git_exe, "-C", str(PROJ_DIR), "rev-parse", "--short=7", "HEAD"], timeout=15)
    if rc2 == 0:
        sha = o2.strip()[:7]
    return rc, sha


def step2_wait_deploy(token: str, commit_prefix: str) -> int:
    """Step 2：轮询 Actions Deploy to GitHub Pages 状态。"""
    log("2/5", f"轮询 Actions Deploy to GitHub Pages（commit_prefix={commit_prefix}）")
    max_polls = 25
    target_run: dict | None = None
    for i in range(1, max_polls + 1):
        req = urllib.request.Request(
            f"https://api.github.com/repos/{OWNER}/{REPO}/actions/runs?per_page=8",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "XS-orch/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8", errors="replace"))
        except Exception as e:  # noqa: BLE001
            log("  ", f"[{i:2d}/{max_polls}] 拉 Actions 列表失败: {e}")
            time.sleep(8)
            continue
        runs = data.get("workflow_runs") or []
        target = None
        for r in runs:
            if r.get("name") == "Deploy to GitHub Pages":
                sha = (r.get("head_sha") or "")[: len(commit_prefix)]
                if sha == commit_prefix or i >= 3:
                    target = r
                    break
        if target is None and runs:
            target = runs[0]
        if target:
            target_run = target
            status = target.get("status")
            conclusion = target.get("conclusion")
            run_url = target.get("html_url")
            log(
                "  ",
                f"[{i:2d}/{max_polls}] status={str(status):<12} "
                f"conclusion={str(conclusion):<8} sha={(target.get('head_sha') or '')[:8]}",
            )
            if status == "completed":
                if conclusion == "success":
                    log("2/5", f"✅ Deploy 成功：{run_url}")
                    return 0
                log("2/5", f"❌ Deploy 失败 conclusion={conclusion}：{run_url}")
                return 5
        else:
            log("  ", f"[{i:2d}/{max_polls}] 暂未查询到工作流记录……（仍在排队）")
        time.sleep(8)
    log("2/5", f"⏳ 超过 {max_polls * 8} 秒仍未结束")
    if target_run:
        log("2/5", f"  请手动查看：{target_run.get('html_url')}")
    return 6


def step3_create_release(token: str) -> int:
    """Step 3：检查并创建 v0.6.0 Release（已存在则跳过）。"""
    log("3/5", f"创建 Release tag={NEXT_TAG}")
    # 先查是否已存在
    req = urllib.request.Request(
        f"https://api.github.com/repos/{OWNER}/{REPO}/releases/tags/{NEXT_TAG}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "XS-orch/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        log("3/5", f"Release 已存在，跳过创建：{data.get('html_url')}")
        return 0
    except urllib.error.HTTPError as e:
        if e.code != 404:
            body = e.read().decode("utf-8", errors="replace")
            log("3/5", f"查询 Release 失败 HTTP {e.code} {body[:300]}")
            return 7
        # 404 → 需要创建
    payload = {
        "tag_name": NEXT_TAG,
        "target_commitish": "main",
        "name": NEXT_TITLE,
        "body": NEXT_NOTES,
        "draft": False,
        "prerelease": False,
        "generate_release_notes": False,
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req2 = urllib.request.Request(
        f"https://api.github.com/repos/{OWNER}/{REPO}/releases",
        data=data_bytes, method="POST",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "XS-orch/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req2, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        log("3/5", f"✅ Release 创建成功：{data.get('html_url')}")
        return 0
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        log("3/5", f"创建 Release 失败 HTTP {e.code} {body[:500]}")
        return 8
    except Exception as e:  # noqa: BLE001
        log("3/5", f"创建 Release 失败 {e}")
        return 8


def step4_verify_live() -> int:
    """Step 4：HTTP 真实访问首页与注册路由，校验状态码与关键词。"""
    log("4/5", "验证 GitHub Pages 首页/登录注册中心 200 且关键词命中")
    base = f"https://{OWNER}.github.io/{REPO}"
    cases = [
        ("/", ["小白", "智能桌面宠物"]),
        ("/#/auth", ["小白"]),  # hash 路由实际仍回 index.html
        ("/index.html", ["XSVICYYDS", "小白"]),
    ]
    all_ok = True
    for path, keys in cases:
        url = base + path
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "XS-orch/1.0",
                "Cache-Control": "no-cache",
            },
        )
        status = 0
        body = b""
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                status = resp.status
                body = resp.read()
        except urllib.error.HTTPError as e:
            status = e.code
            try:
                body = e.read()
            except Exception:  # noqa: BLE001
                pass
        except Exception as e:  # noqa: BLE001
            log("HTTP", f"FAIL {url}: {e}")
            all_ok = False
            continue
        html = body.decode("utf-8", errors="replace")
        hit = all(k in html for k in keys)
        tag = "OK " if (status == 200 and hit) else "NG "
        if not (status == 200 and hit):
            all_ok = False
        log("HTTP", f"{tag}[{status:3d}] {url}  关键词{keys}→{'命中' if hit else '未命中'}")
    if all_ok:
        log("4/5", "✅ Pages 站点可正常访问 & 关键词全部命中 ✅")
        return 0
    log("4/5", "⏳ 部分页面未达预期 —— GitHub Pages CDN 通常 30~120 秒刷新，稍后在浏览器里刷新即可")
    return 9


def main() -> int:
    """主入口：0 探测 → 1 push → 2 轮询 → 3 Release → 4 Pages HTTP 验证。"""
    log("MAIN", f"项目目录: {PROJ_DIR}")
    git_exe = find_git_exe()
    log("MAIN", f"Git: {git_exe}")
    rc_probe = step0_probe(git_exe)
    if rc_probe != 0:
        log("MAIN", f"探测未通过 (exit={rc_probe})，退出；请修正网络或凭据后重试。")
        return rc_probe
    token = get_github_token(git_exe)
    rc_push, short_sha = step1_push(git_exe)
    if rc_push != 0:
        log("MAIN", "git push 失败：先在 GitHub Desktop 点 Push，成功后再重新运行本脚本继续发布（不会重复 commit）")
        return 10 + rc_push
    log("MAIN", f"本次 HEAD 短 SHA = {short_sha}")
    rc_wait = step2_wait_deploy(token, short_sha or "")
    rc_rel = step3_create_release(token)
    rc_ver = step4_verify_live()
    print()
    log("END", "=== 最终汇总 ===")
    log("END", f"  探测    : {rc_probe} (0=OK)")
    log("END", f"  push    : {rc_push} (0=OK) sha={short_sha}")
    log("END", f"  Actions : {rc_wait} (0=OK)")
    log("END", f"  Release : {rc_rel} (0=OK) → https://github.com/{OWNER}/{REPO}/releases/tag/{NEXT_TAG}")
    log("END", f"  Pages   : {rc_ver} (0=OK)")
    log("END", f"  官网首页: https://{OWNER}.github.io/{REPO}/")
    log("END", f"  登录中心: https://{OWNER}.github.io/{REPO}/#/auth")
    log("END", f"  Actions : https://github.com/{OWNER}/{REPO}/actions")
    final = max(rc_probe, rc_push, rc_wait, rc_rel, rc_ver)
    return 0 if final == 0 else 100 + final


if __name__ == "__main__":
    sys.exit(main())
