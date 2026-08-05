"""
dump_actions.py
快速 dump 最近 10 条 Actions runs，打印 name/sha/status/conclusion/started_at，
用于人工核实本次 db129c3 是否触发了新的 pages build。
"""

import sys
import json
import urllib.request
import urllib.error
from create_release import OWNER, REPO, get_github_token_from_git_credential, find_git_exe_via_github_desktop

API = "https://api.github.com"


def main() -> int:
    git_exe = find_git_exe_via_github_desktop()
    try:
        token = get_github_token_from_git_credential(git_exe)
    except RuntimeError as e:
        print(f"[X] 获取 token 失败: {e}", file=sys.stderr)
        return 2
    req = urllib.request.Request(
        f"{API}/repos/{OWNER}/{REPO}/actions/runs?per_page=10",
        method="GET",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "XS-White-AutoRelease/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    print(f"{'#':>2}  {'name':<32}  {'sha':<10}  {'status':<12}  {'conclusion':<8}  started_at")
    print("-" * 110)
    for i, r in enumerate(data.get("workflow_runs") or []):
        print(
            f"{i+1:>2}  {r.get('name'):<32}  {(r.get('head_sha') or '')[:8]:<10}  "
            f"{r.get('status'):<12}  {str(r.get('conclusion')):<8}  {r.get('run_started_at')}"
        )
    print(f"\n当前 origin/main 的 commit（本地）应为 db129c3…")
    print(f"✅ 若列表中出现 status=queued/in_progress、sha=db129c3xx 的『Deploy to GitHub Pages』，")
    print("   表示新推送已触发 Pages 构建，需等待约 1~3 分钟。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
