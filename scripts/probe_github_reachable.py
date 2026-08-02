"""
probe_github_reachable.py
=========================
发布前快速探测：
  1) TCP socket 连通 github.com:443 和 api.github.com:443
  2) git ls-remote origin HEAD（验证 Git HTTPS + 凭据）
  3) 从 Git Credential 取 token，调用 GitHub REST API GET /repos/XSVICYYDS/Smart-Desktop-Pet-White 验证权限

全部 0 退出表示网络+凭据都 OK，任何一步失败都会以非零退出码返回，并给出可人工执行的替代步骤。
"""
from __future__ import annotations

import json
import os
import pathlib
import socket
import subprocess
import sys
import urllib.error
import urllib.request

OWNER = "XSVICYYDS"
REPO = "Smart-Desktop-Pet-White"
PROJ_DIR = pathlib.Path(__file__).resolve().parent.parent


def find_git_exe() -> str:
    """优先取 GitHub Desktop 内嵌 git.exe，其次 C:\\Program Files\\Git\\cmd\\git.exe，最后回退 'git'。"""
    base = pathlib.Path(os.environ.get("LOCALAPPDATA", "")) / "GitHubDesktop"
    if base.exists():
        for app_dir in sorted(base.glob("app-*"), reverse=True):
            g = app_dir / "resources" / "app" / "git" / "cmd" / "git.exe"
            if g.exists():
                return str(g)
    pf = pathlib.Path(r"C:\Program Files\Git\cmd\git.exe")
    if pf.exists():
        return str(pf)
    return "git"


def get_github_token(git_exe: str) -> str:
    """通过 git credential fill 从 Windows 凭据管理器拿 token。"""
    inp = "protocol=https\nhost=github.com\n\n"
    r = subprocess.run(
        [git_exe, "credential", "fill"],
        input=inp,
        capture_output=True,
        text=True,
        timeout=30,
    )
    token = ""
    for line in (r.stdout or "").splitlines():
        if line.startswith("password="):
            token = line.split("=", 1)[1].strip()
    if not token:
        token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
    return token


def tcp_probe(host: str, port: int = 443, timeout: float = 8.0) -> bool:
    """简单 TCP 端口探测。"""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception as exc:  # noqa: BLE001
        print(f"  [TCP] {host}:{port} FAIL: {exc}", file=sys.stderr)
        return False


def step1_tcp() -> int:
    """Step 1 TCP 连通性。"""
    print("[1/3] TCP 443 连通性")
    ok_all = True
    for host in ("github.com", "api.github.com"):
        ok = tcp_probe(host)
        print(f"  - {host}:443 {'OK' if ok else 'FAIL'}")
        ok_all = ok_all and ok
    return 0 if ok_all else 1


def step2_git_lsremote(git_exe: str) -> int:
    """Step 2 Git 远端 ls-remote（需要 HTTPS 凭据）。"""
    print(f"[2/3] Git ls-remote (git={git_exe})")
    try:
        r = subprocess.run(
            [git_exe, "-C", str(PROJ_DIR), "ls-remote", "--", "origin", "HEAD"],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except FileNotFoundError:
        print("  git.exe 找不到", file=sys.stderr)
        return 2
    out = (r.stdout or "").strip()
    err = (r.stderr or "").strip()
    if r.returncode == 0:
        print(f"  OK → {out.splitlines()[0] if out else '(empty)'}")
        return 0
    print(f"  FAIL exit={r.returncode}")
    if out:
        print(f"  stdout: {out[:600]}")
    if err:
        print(f"  stderr: {err[:600]}", file=sys.stderr)
    return 3


def step3_rest_api(token: str) -> int:
    """Step 3 REST API 仓库探测。"""
    print("[3/3] GitHub REST API GET /repos/…")
    if not token:
        print("  FAIL: 取不到 token（git credential fill 返回空，且 GH_TOKEN/GITHUB_TOKEN 环境变量未设置）", file=sys.stderr)
        return 4
    print(f"  token prefix = {token[:8]}…")
    url = f"https://api.github.com/repos/{OWNER}/{REPO}"
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "XS-probe/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        print(
            "  OK"
            f" full_name={data.get('full_name')}"
            f" default_branch={data.get('default_branch')}"
            f" visibility={data.get('visibility')}"
            f" pushed_at={data.get('pushed_at')}"
        )
        return 0
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  FAIL HTTP {e.code}: {body[:500]}", file=sys.stderr)
        return 5
    except Exception as e:  # noqa: BLE001
        print(f"  FAIL: {e}", file=sys.stderr)
        return 6


def main() -> int:
    """主流程：TCP → Git ls-remote → REST API，任一失败即返回对应非零码。"""
    rc_tcp = step1_tcp()
    if rc_tcp != 0:
        print("\n[!] 建议：检查加速器是否开启了「全局模式 / 系统代理」，或换节点；若仅浏览器有网，TUN 模式未启用就会 TCP 不通。")
        return rc_tcp
    git_exe = find_git_exe()
    rc_git = step2_git_lsremote(git_exe)
    token = get_github_token(git_exe)
    rc_api = step3_rest_api(token)
    if rc_git == 0 and rc_api == 0:
        print("\n✅ 网络与凭据都 OK，可以直接执行 do_auto_publish.py 完成自动发布。")
        return 0
    print(f"\n[!] 汇总：rc_git={rc_git} rc_api={rc_api}")
    if rc_git != 0:
        print("  - 手动替代：打开 GitHub Desktop → 仓库 Smart-Desktop-Pet-White → 点击右上角 Push origin")
    if rc_api != 0:
        print("  - 手动替代：在 https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/new 手动创建 v0.6.0 Release")
    return max(rc_git, rc_api) or 10


if __name__ == "__main__":
    sys.exit(main())
