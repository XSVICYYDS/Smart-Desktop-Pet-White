# -*- coding: utf-8 -*-
"""轮询 commit 4c53ad1 对应的 GitHub Actions 流水线直到 Pages 部署就绪
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

OWNER = "XSVICYYDS"
REPO = "Smart-Desktop-Pet-White"
COMMIT_PREFIX = "4c53ad1"
MAX_POLLS = 40
SLEEP_SEC = 15
PAGES_URL = f"https://{OWNER}.github.io/{REPO}/"
ACTIONS_URL = f"https://github.com/{OWNER}/{REPO}/actions/workflows/deploy.yml?query=sha%3A{COMMIT_PREFIX}"


def get_json(url, timeout=25):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "deploy-now-poll/1.0", "Accept": "application/vnd.github+json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8", "ignore"))
    except Exception as e:
        print(f"   [网络异常 {type(e).__name__}] {e}")
        return None


def find_run():
    data = get_json(f"https://api.github.com/repos/{OWNER}/{REPO}/actions/runs?per_page=30")
    if not data or "workflow_runs" not in data:
        return None
    for r in data["workflow_runs"]:
        if (r.get("head_sha") or "").lower().startswith(COMMIT_PREFIX.lower()):
            return r
    return None


def main() -> int:
    print("=" * 68)
    print(f"轮询 commit {COMMIT_PREFIX} 的 Deploy 流水线")
    print(f"Actions: {ACTIONS_URL}")
    print("=" * 68)
    last = (None, None, None)
    for i in range(1, MAX_POLLS + 1):
        print(f"\n[{i}/{MAX_POLLS}] @ {time.strftime('%H:%M:%S')} 休眠 {SLEEP_SEC}s …")
        time.sleep(SLEEP_SEC)
        run = find_run()
        if run:
            cur = (run.get("id"), run.get("status"), run.get("conclusion"))
            if cur != last:
                print(f"   🟡 匹配 run#{cur[0]}: status={cur[1]} conclusion={cur[2]}")
                print(f"      Run URL: {run.get('html_url') or ACTIONS_URL}")
                last = cur
            if cur[1] == "completed":
                if cur[2] == "success":
                    print("\n✅ Actions Build 完成（success），等待 Pages 异步部署…")
                    break
                elif cur[2] in ("failure", "cancelled", "timed_out", "startup_failure"):
                    print(f"\n❌ Actions 流水线结论 = {cur[2]}，请打开链接查看：")
                    print(f"   {ACTIONS_URL}")
                    return 2
    # 检查 Pages 可访问性
    print("\n🌐 验证站点可访问性:", PAGES_URL)
    try:
        req = urllib.request.Request(PAGES_URL, headers={"User-Agent": "deploy-poll/1.0", "Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = (resp.read(4096) or b"").decode("utf-8", "ignore")
            print(f"   HTTP {resp.status} {resp.reason}")
            if "小白" in body or "Smart" in body or "Desktop" in body:
                print("   ✅ 页面关键词匹配，部署已生效")
            else:
                print("   ⚠️  关键词未匹配，可能还在缓存，请稍后 Ctrl+F5 强刷")
    except Exception as e:
        print(f"   ⚠️  直接访问失败（部署进行中或网络问题）：{type(e).__name__} {e}")

    print("\n" + "=" * 68)
    print("📌 汇总")
    print("=" * 68)
    print(f"  Commit: {COMMIT_PREFIX}")
    print(f"  Actions: {ACTIONS_URL}")
    print(f"  Pages  : {PAGES_URL}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
