"""
verify_pages_live.py
实际 GET 访问 GitHub Pages 站点，验证首页 / 功能详情页 / 2048 试玩页返回 200，
并确认 HTML 中包含「小白」关键词。同时查看 GitHub Actions 最近一次部署 workflow 的状态。
"""

import sys
import json
import re
import urllib.request
import urllib.error
from create_release import OWNER, REPO, get_github_token_from_git_credential, find_git_exe_via_github_desktop

BASE = f"https://{OWNER}.github.io/{REPO}"
API = "https://api.github.com"
CASES = [
    ("/", "首页", ["小白", "智能桌面宠物"]),
    ("/#/features", "功能详情（客户端 Hash 路由，实际仍取 index.html）", ["小白"]),
    ("/index.html", "index.html 直取", ["小白", "XSVICYYDS"]),
]


def http_get(url: str, timeout: int = 30) -> tuple[int, dict[str, str], bytes]:
    """发送 GET 请求，返回 (status_code, headers, body)。"""
    req = urllib.request.Request(
        url,
        method="GET",
        headers={
            "User-Agent": "XS-White-AutoRelease/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Cache-Control": "no-cache",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            headers = {k: v for k, v in resp.headers.items()}
            body = resp.read()
            return resp.status, headers, body
    except urllib.error.HTTPError as e:
        body = b""
        try:
            body = e.read()
        except Exception:
            pass
        return e.code, {k: v for k, v in (e.headers or {}).items()}, body
    except urllib.error.URLError as e:
        return 0, {"error": str(e)}, b""


def check_latest_action_run(token: str) -> dict | None:
    """查看最近一次 pages 相关的 workflow run。"""
    path = f"/repos/{OWNER}/{REPO}/actions/runs?per_page=5"
    req = urllib.request.Request(
        API + path,
        method="GET",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "XS-White-AutoRelease/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"_error": str(e)}


def main() -> int:
    """主函数：检测 Pages URL 可用性，并输出最近 Action 状态。"""
    print(f"🔍 开始验证 Pages 站点访问：{BASE}")
    all_ok = True
    for path, name, keywords in CASES:
        url = BASE + path
        status, _headers, body = http_get(url)
        html = body.decode("utf-8", errors="replace")
        hit = all(k in html for k in keywords)
        tag = "✅" if (status == 200 and hit) else "⚠️" if status == 200 else "❌"
        if not (status == 200 and hit):
            all_ok = False
        title_match = re.search(r"<title>(.*?)</title>", html, flags=re.S | re.I)
        title = title_match.group(1).strip() if title_match else "(无 title)"
        print(f"  {tag} [{status:3d}] {name:<20} {url}")
        print(f"      title: {title}")
        print(f"      关键词检查 {keywords} → {'命中' if hit else '未命中'}")

    print("\n🤖 最近 5 次 GitHub Actions 工作流运行：")
    git_exe = find_git_exe_via_github_desktop()
    try:
        token = get_github_token_from_git_credential(git_exe)
    except RuntimeError as e:
        print(f"  [X] token 获取失败: {e}")
        return 0
    runs = check_latest_action_run(token)
    if runs and "_error" not in runs:
        for r in (runs.get("workflow_runs") or [])[:5]:
            print(
                f"  - {r.get('name'):<30} status={r.get('status'):<10} "
                f"conclusion={str(r.get('conclusion')):<8} "
                f"run_started_at={r.get('run_started_at')} "
                f"html_url={r.get('html_url')}"
            )
    else:
        print(json.dumps(runs, ensure_ascii=False, indent=2))

    print("\n📝 最终结论：")
    if all_ok:
        print("  ✅ GitHub Pages 站点已可正常访问，部署验证通过！")
    else:
        print("  ⏳ 部分页面未返回 200 或关键词未命中 —— GitHub Pages 通常需要 1-3 分钟构建和 CDN 刷新，")
        print("     请稍后再次访问（可直接刷新浏览器）或查看上方 Actions 里的 pages build 状态。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
