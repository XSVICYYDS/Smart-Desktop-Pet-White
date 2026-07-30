"""
check_pages_deployment.py
调用 GitHub REST API 查询 Smart-Desktop-Pet-White 的 Pages 配置和最近部署状态，
并打印用户最终的访问链接。
"""

import sys
import json
import urllib.request
import urllib.error
from create_release import OWNER, REPO, get_github_token_from_git_credential, find_git_exe_via_github_desktop

API = "https://api.github.com"


def api_get(token: str, path: str) -> dict:
    """带鉴权的 GitHub REST GET 请求，返回解析后的 JSON dict。"""
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
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"_http_error": e.code, "_body": e.read().decode("utf-8", errors="replace")}
    except urllib.error.URLError as e:
        return {"_net_error": str(e)}


def main() -> int:
    """主函数：输出 Pages 配置、最近部署、及最终可访问链接。"""
    git_exe = find_git_exe_via_github_desktop()
    try:
        token = get_github_token_from_git_credential(git_exe)
    except RuntimeError as e:
        print(f"[X] 获取 token 失败: {e}", file=sys.stderr)
        return 2

    pages = api_get(token, f"/repos/{OWNER}/{REPO}/pages")
    if "_http_error" in pages or "_net_error" in pages:
        print("[!] 无法读取 Pages 配置（可能未启用 Pages，或权限不足）：")
        print(json.dumps(pages, ensure_ascii=False, indent=2))
    else:
        print("=== GitHub Pages 配置 ===")
        print(f"  build_type       : {pages.get('build_type')}")
        print(f"  source.branch    : {(pages.get('source') or {}).get('branch')}")
        print(f"  source.path      : {(pages.get('source') or {}).get('path')}")
        print(f"  html_url         : {pages.get('html_url')}")
        print(f"  custom_domain    : {pages.get('custom_domain')}")
        print(f"  https_enforced   : {pages.get('https_enforced')}")
        print(f"  status           : {pages.get('status')}")

    # 列出最近 3 次部署
    deps = api_get(token, f"/repos/{OWNER}/{REPO}/pages/deployments?per_page=3")
    if isinstance(deps, list):
        print("\n=== 最近 3 次 Pages 部署 ===")
        for i, d in enumerate(deps):
            ds = d.get("status") or {}
            print(
                f"  [{i}] id={d.get('id')} created={d.get('created_at')} "
                f"status={ds.get('status')} deployment_branch={d.get('deployment_branch')} "
                f"commit={ (d.get('commit') or '')[:8] }"
            )
    else:
        print("\n[!] 读取 Pages deployments 失败：")
        print(json.dumps(deps, ensure_ascii=False, indent=2))

    print("\n=== 预期访问链接 ===")
    print(f"  首页      : https://{OWNER}.github.io/{REPO}/")
    print(f"  功能详情  : https://{OWNER}.github.io/{REPO}/#/features")
    print(f"  2048 试玩 : https://{OWNER}.github.io/{REPO}/#/playground/game-2048")
    print(f"  Release   : https://github.com/{OWNER}/{REPO}/releases/tag/v0.5.0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
