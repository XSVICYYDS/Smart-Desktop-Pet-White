# -*- coding: utf-8 -*-
"""轮询指定 commit 的 GitHub Actions Deploy 流水线状态，直到给出 Pages URL
（不依赖 GITHUB_TOKEN，使用公开 API；失败时回退让用户手动打开 Actions 链接）
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

OWNER = "XSVICYYDS"
REPO = "Smart-Desktop-Pet-White"
COMMIT_PREFIX = "f214e1c"     # 刚刚 push 的 commit 前缀
WORKFLOW_FILE = "deploy.yml"
MAX_POLLS = 40                # 40 * 15s ≈ 10 分钟
SLEEP_SEC = 15

ACTIONS_URL = f"https://github.com/{OWNER}/{REPO}/actions/workflows/{WORKFLOW_FILE}?query=sha%3A{COMMIT_PREFIX}"
COMMIT_URL = f"https://github.com/{OWNER}/{REPO}/commit/{COMMIT_PREFIX}"
PAGES_URL = f"https://{OWNER}.github.io/{REPO}/"


def get_json(url: str, timeout=20) -> dict | None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "deploy-now-poll/1.0",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            return json.loads(data.decode("utf-8", "ignore"))
    except urllib.error.HTTPError as e:
        print(f"   [HTTP {e.code}] {url}")
        return None
    except Exception as e:
        print(f"   [网络异常: {type(e).__name__}] {e}")
        return None


def find_matching_run() -> dict | None:
    """按 commit SHA 前缀匹配 workflow run"""
    url = (
        f"https://api.github.com/repos/{OWNER}/{REPO}/actions/runs"
        f"?per_page=30"
    )
    data = get_json(url)
    if not data or "workflow_runs" not in data:
        return None
    for run in data["workflow_runs"]:
        head_sha = (run.get("head_sha") or "").lower()
        if head_sha.startswith(COMMIT_PREFIX.lower()):
            return run
    return None


def check_pages_deployment() -> dict | None:
    """查询 commit 对应的 Pages 部署（/deployments 接口，找 environment=github-pages 的状态）"""
    url = (
        f"https://api.github.com/repos/{OWNER}/{REPO}/deployments"
        f"?per_page=20"
    )
    data = get_json(url)
    if not isinstance(data, list):
        return None
    for dep in data:
        sha = ((dep.get("sha") or "").lower()
               or (dep.get("payload") or {}).get("short_sha") or "").lower()
        env = (dep.get("environment") or "").lower()
        if env != "github-pages":
            continue
        if not sha.startswith(COMMIT_PREFIX.lower()):
            # Pages deployment sha 可能没有带 commit 前缀，回退：看最新的一个
            pass
        status_url = dep.get("statuses_url")
        if not status_url:
            continue
        statuses = get_json(status_url + "?per_page=5")
        if isinstance(statuses, list) and statuses:
            return {
                "deployment": dep,
                "latest_status": statuses[0],
            }
    return None


def main() -> int:
    print("=" * 68)
    print(f"轮询流水线: commit {COMMIT_PREFIX} / workflow={WORKFLOW_FILE}")
    print(f"Actions 直达: {ACTIONS_URL}")
    print("=" * 68)
    last_run_id = None
    last_status = None
    last_conclusion = None

    for i in range(1, MAX_POLLS + 1):
        print(f"\n[{i}/{MAX_POLLS}] poll @ {time.strftime('%H:%M:%S')} sleeping {SLEEP_SEC}s …")
        time.sleep(SLEEP_SEC)

        run = find_matching_run()
        if run:
            rid = run.get("id")
            status = run.get("status")          # queued / in_progress / completed
            conclusion = run.get("conclusion")  # success / failure / cancelled / None
            html_url = run.get("html_url") or ACTIONS_URL
            if (rid, status, conclusion) != (last_run_id, last_status, last_conclusion):
                print(f"   🟡 找到匹配 run#{rid}: status={status} conclusion={conclusion}")
                print(f"      Run URL: {html_url}")
                last_run_id, last_status, last_conclusion = rid, status, conclusion
            if status == "completed":
                if conclusion == "success":
                    print("\n✅ Actions 构建 + 上传 artifact 已完成（success）。")
                    print("   接下来 GitHub 会异步部署到 Pages（Environment: github-pages），通常几十秒到 2 分钟内可访问。")
                    break
                elif conclusion in ("failure", "cancelled", "timed_out", "startup_failure"):
                    print(f"\n❌ Actions 流水线结论 = {conclusion}。请打开下面的 URL 查看具体哪一步报错：")
                    print(f"   {ACTIONS_URL}")
                    print(f"   commit: {COMMIT_URL}")
                    return 2
                else:
                    print(f"   ⏳ 流水线状态 completed 但 conclusion={conclusion}，继续等待 Pages …")
                    break
        else:
            print("   (还没查到匹配 commit 的 run，可能 Actions 刚触发正在入队，继续等)")

    # ------- 尝试再用 Pages deployment 接口 + 直接访问 PAGES_URL 兜底验证
    print("\n" + "=" * 68)
    print("补充验证：Pages Deployment 状态 & 站点可访问性")
    print("=" * 68)
    pages_depl = check_pages_deployment()
    if pages_depl:
        st = pages_depl["latest_status"]
        print(f"   Pages deployment state     = {st.get('state')}")
        if st.get("environment_url"):
            print(f"   Pages environment_url      = {st.get('environment_url')}")
        else:
            print(f"   Pages 默认 URL             = {PAGES_URL}")
        print(f"   Pages deployment log_url   = {st.get('log_url') or COMMIT_URL}")

    # 直接 GET 一次首页（可能缓存了旧版本，只检查 HTTP 状态码是否 200 即可）
    print(f"\n🌐 直接访问站点: {PAGES_URL}")
    try:
        req = urllib.request.Request(
            PAGES_URL,
            headers={"User-Agent": "deploy-now-poll/1.0", "Cache-Control": "no-cache"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = (resp.read(4096) or b"").decode("utf-8", "ignore")
            print(f"   HTTP {resp.status} {resp.reason}  Content-Type={resp.headers.get('Content-Type')}")
            if "<title>" in body.lower() and ("小白" in body or "Smart" in body or "Desktop" in body):
                print("   ✅ 页面内容中发现站点关键词（小白 / Smart Desktop），大概率部署已生效。")
            else:
                print("   ⚠️  首页关键词没匹配到，可能还在 Pages 回滚缓存中，稍后再刷新即可。")
    except Exception as e:
        print(f"   ⚠️  直接访问失败（可能是 Pages 尚未完成部署/中国大陆网络问题）：{type(e).__name__} {e}")

    print("\n" + "=" * 68)
    print("📌 最终信息汇总")
    print("=" * 68)
    print(f"  Commit (short)       : {COMMIT_PREFIX}")
    print(f"  Commit 详情           : {COMMIT_URL}")
    print(f"  Actions 本次流水线    : {ACTIONS_URL}")
    print(f"  🌐 Pages 站点         : {PAGES_URL}")
    print()
    print("如果站点还显示旧版本，通常等 1-2 分钟 + Ctrl+F5 强刷即可。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
