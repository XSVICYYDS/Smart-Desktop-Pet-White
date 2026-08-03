"""
诊断发布状态：查 Actions 最新工作流（按创建时间）、查 Release v0.7.0 是否存在、查 Pages 线上内容
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
EXPECTED_TAG = "v0.7.0"
EXPECTED_SHA_PREFIX = "fe60f64"  # 刚 commit & push 的 sha


PROJ_DIR = pathlib.Path(r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白")

def find_git_exe() -> str:
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


def get_token() -> str:
    git_exe = find_git_exe()
    inp = "protocol=https\nhost=github.com\n\n"
    r = subprocess.run(
        [git_exe, "credential", "fill"],
        input=inp, capture_output=True, text=True, timeout=30, cwd=str(PROJ_DIR),
    )
    token = ""
    for line in (r.stdout or "").splitlines():
        if line.startswith("password="):
            token = line.split("=", 1)[1].strip()
    if not token:
        token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
    return token


def api(token: str, method: str, path: str) -> tuple[int, dict]:
    url = "https://api.github.com" + path
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "XS-Diag/1.0",
    }
    req = urllib.request.Request(url, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, (json.loads(body) if body else {})
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, {"_http_json": json.loads(body), "_http_body": body}
        except Exception:
            return e.code, {"_http_body": body}
    except Exception as e:
        return 0, {"_net": str(e)}


def http_get(url: str, timeout: int = 20) -> tuple[int, str]:
    req = urllib.request.Request(
        url, method="GET", headers={
            "User-Agent": "XS-Diag/1.0",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read().decode("utf-8", errors="replace")
        except Exception:
            return e.code, ""
    except Exception as e:
        return 0, f"NET_ERR: {e}"


def main() -> int:
    token = get_token()
    if not token:
        print("[DIAG] ❌ 取不到 GitHub Token，请先在 GitHub Desktop 登录")
        return 1
    print(f"[DIAG] token prefix: {token[:8]}…")

    # 1) 查 Repo 基本信息
    st, repo = api(token, "GET", f"/repos/{OWNER}/{REPO}")
    print(f"[REPO] HTTP {st}  default_branch={repo.get('default_branch')}  pushed_at={repo.get('pushed_at')}")

    # 2) 查 Actions 最近 15 条工作流（重点看 Deploy to GitHub Pages）
    st, runs = api(token, "GET", f"/repos/{OWNER}/{REPO}/actions/runs?per_page=15")
    wfruns = (runs or {}).get("workflow_runs") or []
    print(f"\n[ACTIONS] 最近 {len(wfruns)} 条工作流：")
    print(f"{'id':>12} {'name':<32} {'status':<12} {'conclusion':<10} {'sha':<10} {'created_at':<20}")
    print("-" * 105)
    hit_target = None
    for r in wfruns:
        sha = (r.get("head_sha") or "")[:7]
        c_at = (r.get("created_at") or "")[:19].replace("T", " ")
        name = (r.get("name") or "")[:31]
        r_id = r.get("id")
        s = str(r.get("status") or "")
        c = str(r.get("conclusion") or "")
        print(f"{r_id:>12} {name:<32} {s:<12} {c:<10} {sha:<10} {c_at:<20}")
        if sha.startswith(EXPECTED_SHA_PREFIX) and r.get("name") == "Deploy to GitHub Pages":
            hit_target = r

    print()
    if hit_target:
        print(f"[✅ 命中] 发现 commit={EXPECTED_SHA_PREFIX} 对应的 Deploy 工作流:")
        print(f"       status={hit_target.get('status')}   conclusion={hit_target.get('conclusion')}")
        print(f"       url: {hit_target.get('html_url')}")
    else:
        print(f"[❌ 未命中] 最近 15 条工作流里没有 sha 前缀={EXPECTED_SHA_PREFIX} 且 name=Deploy to GitHub Pages")
        print("       可能：刚 push，Actions 队列还没 pick up；或者 deploy.yml workflow 没被触发")

    # 3) 查 Release v0.7.0
    st, rel = api(token, "GET", f"/repos/{OWNER}/{REPO}/releases/tags/{EXPECTED_TAG}")
    print(f"\n[RELEASE {EXPECTED_TAG}] HTTP {st}")
    if st == 200:
        print(f"       title = {rel.get('name')}")
        print(f"       tag   = {rel.get('tag_name')}")
        body = rel.get("body") or ""
        print(f"       body 长度 = {len(body)} 字符")
        # 看看 body 里有没有 v0.7.0 / admin / XSVICYYDS 关键词
        for k in ["v0.7.0", "XSVICYYDS", "管理员控制台", "RBAC"]:
            print(f"          body include '{k}' = {k in body}")
        print(f"       html_url = {rel.get('html_url')}")
    elif st == 404:
        print("       ❌ Release 不存在！需要重新创建")
    else:
        print(f"       ❌ 异常: {json.dumps(rel, ensure_ascii=False)[:500]}")

    # 4) 查 Pages 配置
    st, pages = api(token, "GET", f"/repos/{OWNER}/{REPO}/pages")
    print(f"\n[PAGES] HTTP {st}")
    if st == 200:
        print(f"       status={pages.get('status')}  html_url={pages.get('html_url')}")
        build = pages.get("latest_build") or {}
        print(f"       latest_commit={ (build.get('commit') or '')[:10] }  status={build.get('status')}  created_at={build.get('created_at')}")
        print(f"       duration={build.get('duration')}s  error={build.get('error')}")

    # 5) 直接 HTTP GET 线上 Pages 三个路由，看是否有 XSVICYYDS / 管理员控制台 / v0.7.0 字样
    base = f"https://{OWNER}.github.io/{REPO}"
    print("\n[HTTP PAGES 真实校验]")
    for path, keys in [
        ("/", ["小白", "智能桌面宠物", "管理员", "XSVICYYDS"]),
        ("/#/auth", ["小白", "登录", "注册"]),
        ("/#/admin", ["Admin"]),  # hash 路由都回 index.html
        ("/index.html", ["XSVICYYDS", "小白", "admin", "AdminConsole", "v0.7.0"]),
    ]:
        code, html = http_get(base + path)
        print(f"  GET {base+path}")
        print(f"    HTTP {code}  len={len(html)}")
        hits = []
        for k in keys:
            hits.append(f"{k}:{'Y' if k in html else 'N'}")
        print(f"    关键词: {' / '.join(hits)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
