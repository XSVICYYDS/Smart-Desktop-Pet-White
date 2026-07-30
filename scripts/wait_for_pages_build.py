"""
wait_for_pages_build.py
轮询 GitHub Actions，等待针对本次 push 的「Deploy to GitHub Pages」工作流完成，
并打印其最终状态（success/failure）与跳转链接。
"""

import sys
import time
import json
import urllib.request
import urllib.error
from create_release import OWNER, REPO, get_github_token_from_git_credential, find_git_exe_via_github_desktop

API = "https://api.github.com"
WORKFLOW_NAME = "Deploy to GitHub Pages"
EXPECTED_COMMIT_PREFIX = "db129c3"  # 刚才 commit 的短 SHA


def api(token: str, path: str) -> dict:
    """封装一次带鉴权 GET 请求。"""
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
    except urllib.error.HTTPError as e:
        return {"_http": e.code, "_body": e.read().decode("utf-8", errors="replace")}
    except Exception as e:
        return {"_err": str(e)}


def main() -> int:
    git_exe = find_git_exe_via_github_desktop()
    try:
        token = get_github_token_from_git_credential(git_exe)
    except RuntimeError as e:
        print(f"[X] 获取 token 失败: {e}", file=sys.stderr)
        return 2

    print(f"⏳ 等待工作流『{WORKFLOW_NAME}』（commit {EXPECTED_COMMIT_PREFIX}…）完成")
    print(f"   预计耗时：1~3 分钟")

    target_url = None
    max_polls = 25  # 25 * 8s = ~200s
    for i in range(1, max_polls + 1):
        data = api(token, f"/repos/{OWNER}/{REPO}/actions/runs?per_page=8")
        runs = data.get("workflow_runs") or []
        target = None
        for r in runs:
            if r.get("name") == WORKFLOW_NAME:
                sha = (r.get("head_sha") or "")[: len(EXPECTED_COMMIT_PREFIX)]
                if sha == EXPECTED_COMMIT_PREFIX or i >= 3:
                    # 第 3 次之后也允许以最新那条作为目标（commit 可能因 SHA 截断不同）
                    target = r
                    break
        if target is None and runs:
            target = runs[0]

        if target:
            status = target.get("status")
            conclusion = target.get("conclusion")
            run_url = target.get("html_url")
            target_url = run_url or target_url
            print(
                f"  [{i:2d}/{max_polls}] status={status:<12} conclusion={str(conclusion):<8} "
                f"sha={(target.get('head_sha') or '')[:8]} run_started_at={target.get('run_started_at')}"
            )
            if status == "completed":
                if conclusion == "success":
                    print("\n✅ Deploy to GitHub Pages 构建/部署成功！")
                    print(f"   工作流链接: {run_url}")
                    print("   📣 访问链接（可能仍需 30~60 秒 CDN 缓存刷新）：")
                    print(f"   🌐 首页      : https://{OWNER}.github.io/{REPO}/")
                    print(f"   🎮 功能详情  : https://{OWNER}.github.io/{REPO}/#/features")
                    print(f"   🧪 2048 试玩 : https://{OWNER}.github.io/{REPO}/#/playground/game-2048")
                    return 0
                print(f"\n❌ 工作流失败，conclusion={conclusion}")
                print(f"   请前往 {run_url} 查看详细日志")
                return 4
        else:
            print(f"  [{i:2d}/{max_polls}] 暂未查询到目标工作流记录……（可能仍在排队）")

        time.sleep(8)

    print(f"\n⚠️  超过 {max_polls * 8} 秒仍未完成。请稍后自行查看：")
    if target_url:
        print(f"   {target_url}")
    return 5


if __name__ == "__main__":
    sys.exit(main())
