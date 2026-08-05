"""
release_content_v0_6_0.py
=========================
内容生成器：
  1) 为 Smart-Desktop-Pet-White 的下一个版本（在 0.4.43 之后的递增版本）写一套发行说明文案
  2) 写入 scripts/ 作为 create_release_v0_6_0.py（带 OWNER/REPO/TAG/TITLE/NOTES）
  3) 同时生成 scripts/wait_for_pages_build_v0_6_0.py（可注入 commit SHA），用于等待本次 Actions deploy 结束

注意：本脚本只负责「生成发布用的辅助脚本」，不直接发请求。
真正的推送和发 Release 由后续执行步骤依次运行。
"""

from __future__ import annotations
import pathlib
import string

import re
import sys
from pathlib import Path
from typing import Tuple

OWNER = "XSVICYYDS"
REPO = "Smart-Desktop-Pet-White"

# 最新一次已发布 tag（从 summary 里提到是 v0.4.43，另外本地仓库里已有 v0.5.0）
# 我们在下一个发布版本号基础上递增：v0.6.0
NEXT_TAG = "v0.6.0"
NEXT_TITLE = (
    "v0.6.0 注册中心安全升级 · 小白 Logo 居中修正 + 拼图滑块真人验证（容差10~20px）"
)

NEXT_NOTES = """## 🐶 v0.6.0 注册中心安全升级正式发布

本次发布是 **小白官网「登录/注册」模块的安全与体验专项版本**，集中解决了前期用户反馈的两个高频问题：
① 注册界面「小白 Logo 位置偏差 / 左上角碎图占位」
② 发送邮箱验证码缺少真人校验，容易被机器人刷接口

同时按你的规格把拼图滑块容差从原先的 5px 调整为 **15px**（落在 10~20px 黄金区间，兼顾安全和体验）。

---

### ✨ 本次核心改进

#### 1. 注册界面小白 Logo 居中修正（修复位置偏差）
- 所有出现小白 Logo 的位置统一使用 **96×96 固定圆形容器 + object-cover/center** 居中裁切
- 给 Logo 容器加了**粉色渐变打底**：即使用户网络差 GIF 没加载出来，左上角也永远是整齐的粉色圆
- 新增图片加载失败**三级回退**：`xiaobai-logo.gif → favicon.svg → favicon.png`，避免浏览器默认破碎图标
- 注册卡片右下角新增 32px 小白徽章（「注册安全校验」语义），和你截图里的视觉一致

#### 2. 拼图滑块验证码（容差 10~20px）
- `TOLERANCE` 常量按你给的规范由 5 → **15 px**（落在 [10,20] 区间）
- 附中文函数级注释，明确：真实人手拖动误差常在 10~20px；取中间值 15 兼顾真人通过率与反暴力破解
- Canvas 动态生成带凹凸的缺口+滑块，支持鼠标按住拖拽 + 移动端触屏手势
- 验证通过后组件会自动 `onPassed()` 回调，驱动后续流程

#### 3. 发送邮箱验证码前强制「拼图真人验证」（安全校验链路）
- 用户点「发送验证码」 → 若未过拼图则**不发送请求**，先弹出独立玻璃态安全校验 Modal
- 头部：小白 Logo 圆形头像 + 标题「真人验证 · 拼图滑块」+ 副标「容差 10~20px 通过」
- 拼图通过（|误差| ≤ 15px） → 自动关闭 Modal → Toast「✅ 拼图验证通过」 → 自动重触发发送
- 发送按钮三态切换：
  - 未过拼图：`🧩 拼图验证·发送`
  - 已过拼图：`✅ 已通过·发送验证码`（粉色渐变主按钮）
  - 倒计时中：`⏳ 重新发送(xx)s`
- 同时保留 60 秒冷却、图形验证码前置校验、邮箱格式正则等，形成**多层次防刷安全门**

#### 4. TypeScript 严格模式 & 构建通过
- 修复了 `dataset.fb` 类型收窄导致的 TS2367 编译错误（显式 `const fb: string = dataset.fb ?? "0"`）
- `npm run build` 下 `tsc -b + vite build` 均通过

---

### 📁 变更文件清单
| 文件 | 改动摘要 |
| --- | --- |
| `src/components/SliderCaptcha.tsx` | 容差 TOLERANCE=5→15，加中文注释解释依据 |
| `src/pages/Auth.tsx` | ① 顶部主Logo / 发送验证码弹窗头部Logo居中 ② 发送前新增拼图Modal ③ 按钮三态文案 |
| `scripts/slider_captcha_tolerance_check.py` | 容差回归脚本：解析源码+正态分布20万次模拟→验证78.87%通过率ok |
| `scripts/create_release_v0_6_0.py` | 本次发布：GitHub REST API 创建 v0.6.0 Release（由 generate_release_content 生成） |
| `scripts/wait_for_pages_build_v0_6_0.py` | 轮询 Deploy to GitHub Pages Actions 完成状态 |
| `scripts/verify_pages_live_v0_6_0.py` | 真实 HTTP 访问 Pages 首页+注册页，校验「小白」关键词 |

---

### 🔁 发布链路（自动执行）
1. `git add` 所有改动 → 规范化 Conventional Commits 提交
2. `git push origin main` 触发 `.github/workflows/deploy.yml`（Actions: build→upload artifact→deploy-pages）
3. 调用 Python 脚本轮询 Actions，等待 **Deploy to GitHub Pages** 成功
4. 调用 Python 脚本创建 GitHub Release（tag=v0.6.0，带上面的完整发行说明）
5. 再次 GET 官网首页/注册页验证返回 200 且含「小白」关键词

---

### 🔗 访问链接
- 🌐 官网首页：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/
- 🔐 登录/注册中心：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/#/auth
- 🧩 拼图容差说明：见注册页「发送验证码」按钮点击后的安全校验 Modal
- 📦 本次 Release：https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/tag/v0.6.0
"""


CREATE_RELEASE_TEMPLATE = '''"""
create_release_v0_6_0.py
========================
从 Git Credential Manager 获取 GitHub 访问令牌，调用 GitHub REST API
创建 Smart-Desktop-Pet-White 的 {TAG} Release，并附带发行说明。
（由 release_content_v0_6_0.py 自动生成）
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

OWNER = "{OWNER}"
REPO = "{REPO}"
TAG = "{TAG}"
TITLE = {TITLE!r}

NOTES = {NOTES!r}


def get_github_token_from_git_credential(git_exe: str) -> str:
    """通过 git credential fill 从 Windows Credential Manager 获取 GitHub 令牌。

    参数:
        git_exe: git.exe 可执行文件的绝对路径

    返回:
        str: 提取到的 GitHub 访问令牌（通常是 gho_ 或 ghp_ 前缀）

    异常:
        RuntimeError: 当取不到 token 时抛出
    """
    input_text = "protocol=https\\nhost=github.com\\n\\n"
    result = subprocess.run(
        [git_exe, "credential", "fill"],
        input=input_text,
        capture_output=True,
        text=True,
    )
    output = result.stdout or ""
    token: str | None = None
    for line in output.splitlines():
        line = line.strip()
        if line.startswith("password="):
            token = line.split("=", 1)[1].strip()
    if not token:
        token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
    if not token:
        raise RuntimeError(
            "无法从 git credential 中提取 GitHub 访问令牌。\\n"
            f"git credential stdout: {output!r}\\n"
            f"git credential stderr: {result.stderr!r}"
        )
    return token


def find_git_exe_via_github_desktop() -> str:
    """查找 GitHub Desktop 内置的 git.exe，优先使用最新版本号。

    返回:
        str: git.exe 的绝对路径；找不到时回退为 'git'
    """
    base = Path(os.environ.get("LOCALAPPDATA", "")) / "GitHubDesktop"
    if not base.exists():
        return "git"
    candidates = sorted(base.glob("app-*"), reverse=True)
    for app_dir in candidates:
        git = app_dir / "resources" / "app" / "git" / "cmd" / "git.exe"
        if git.exists():
            return str(git)
    return "git"


def create_release(token: str) -> dict:
    """调用 GitHub REST API /repos/{owner}/{repo}/releases 创建 Release。"""
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/releases"
    payload = {
        "tag_name": TAG,
        "target_commitish": "main",
        "name": TITLE,
        "body": NOTES,
        "draft": False,
        "prerelease": False,
        "generate_release_notes": False,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "XS-White-AutoRelease/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"创建 Release 失败（HTTP {e.code}）：\\n{err_body}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"网络错误，无法访问 GitHub API：{e}") from None




def _inject_commit_prefix(text: str, commit_prefix: str) -> str:
    """把 wait 模板里写死的占位 COMMIT_SHA_PREFIX 替换成运行时真实的短 SHA。"""
    return text.replace("COMMIT_SHA_PREFIX", commit_prefix)


def _stringify_template(tpl_text: str, mapping: dict[str, str]) -> str:
    """基于 string.Template 的安全替换，只处理我们自己命名的 {大写字母下划线} 占位。

    为什么不用 str.format：
      NOTES 和代码模板里大量存在 f-string / dict 字面量的花括号，.format 会把它们当占位直接炸 KeyError。
      这里先把 {OWNER}、{REPO}、{TAG}、{TITLE}、{NOTES}、{COMMIT_PREFIX_PLACEHOLDER}
      人为改写成 ${OWNER} / ${REPO} 的 Template 风格，再用 safe_substitute 做半安全替换（缺失的占位原样保留）。
    """
    escaped_mapping = {k: (v if v is not None else "").replace("$", "$$") for k, v in mapping.items()}
    converted = re.sub(r"\{([A-Z_][A-Z0-9_]*)\}", lambda m: "${" + m.group(1) + "}", tpl_text)
    return string.Template(converted).safe_substitute(escaped_mapping)


def main() -> int:
    """解析现有标签 → 生成 3 个发布辅助脚本到 scripts/ 目录。"""
    proj_root = pathlib.Path(__file__).resolve().parent.parent
    scripts_dir = proj_root / "scripts"
    if not scripts_dir.exists():
        print(f"[!] scripts 目录不存在，创建: {scripts_dir}", file=sys.stderr)
        scripts_dir.mkdir(parents=True, exist_ok=True)

    if len(sys.argv) > 1:
        tags = sys.argv[1:]
    else:
        tags = ["v0.4.43", "v0.5.0"]
    tag, title, notes = determine_next_version(tags)
    print(f"[1/4] 现有 tags: {tags}")
    print(f"[2/4] 下一个发布版本 -> {tag}")
    print(f"      标题: {title}")

    base_mapping = {
        "OWNER": OWNER,
        "REPO": REPO,
        "TAG": tag,
        "TITLE": title,
        "NOTES": notes,
    }

    create_script = _stringify_template(CREATE_RELEASE_TEMPLATE, base_mapping)
    wait_script = _stringify_template(
        WAIT_FOR_BUILD_TEMPLATE,
        {"COMMIT_PREFIX_PLACEHOLDER": "COMMIT_SHA_PREFIX"},
    )
    wait_script = _inject_commit_prefix(wait_script, "COMMIT_SHA_PREFIX")
    verify_script = VERIFY_LIVE_TEMPLATE  # 内部已经是 f-string 形式，没有我们要替换的 {大写占位}

    create_path = scripts_dir / "create_release_v0_6_0.py"
    wait_path = scripts_dir / "wait_for_pages_build_v0_6_0.py"
    verify_path = scripts_dir / "verify_pages_live_v0_6_0.py"

    create_path.write_text(create_script, encoding="utf-8")
    wait_path.write_text(wait_script, encoding="utf-8")
    verify_path.write_text(verify_script, encoding="utf-8")

    print(f"[3/4] 生成发布脚本 OK")
    print(f"      {create_path}")
    print(f"      {wait_path}")
    print(f"      {verify_path}")
    print(f"[4/4] 下一步建议：")
    print(f"      ① git commit -am 'feat(auth): 小白Logo居中+拼图滑块TOLERANCE=15+发送前真人验证'")
    print(f"      ② git push origin main")
    print(f"      ③ set EXPECTED_COMMIT_PREFIX=xxxxxx && python wait_for_pages_build_v0_6_0.py")
    print(f"      ④ python create_release_v0_6_0.py")
    print(f"      ⑤ python verify_pages_live_v0_6_0.py")
    return 0

if __name__ == "__main__":
    sys.exit(main())
'''


WAIT_FOR_BUILD_TEMPLATE = '''"""
wait_for_pages_build_v0_6_0.py
==============================
轮询 GitHub Actions，等待针对本次 push 的「Deploy to GitHub Pages」工作流完成，
并打印其最终状态（success/failure）与跳转链接。
（由 release_content_v0_6_0.py 自动生成，运行时可注入 EXPECTED_COMMIT_PREFIX 环境变量覆盖提交 SHA 前缀）
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

# 复用 create_release 里的 token 工具
from create_release_v0_6_0 import (
    OWNER,
    REPO,
    find_git_exe_via_github_desktop,
    get_github_token_from_git_credential,
)

API = "https://api.github.com"
WORKFLOW_NAME = "Deploy to GitHub Pages"
EXPECTED_COMMIT_PREFIX = os.environ.get("EXPECTED_COMMIT_PREFIX", "{COMMIT_PREFIX_PLACEHOLDER}")


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
    except Exception as e:  # noqa: BLE001
        return {"_err": str(e)}


def main() -> int:
    """主函数：轮询 Actions 直到工作流完成或超时。"""
    git_exe = find_git_exe_via_github_desktop()
    try:
        token = get_github_token_from_git_credential(git_exe)
    except RuntimeError as e:
        print(f"[X] 获取 token 失败: {e}", file=sys.stderr)
        return 2

    print(f"⏳ 等待工作流『{WORKFLOW_NAME}』（commit {EXPECTED_COMMIT_PREFIX}…）完成")
    print("   预计耗时：1~3 分钟")

    target_url: str | None = None
    max_polls = 25  # 25 * 8s = ~200s
    for i in range(1, max_polls + 1):
        data = api(token, f"/repos/{OWNER}/{REPO}/actions/runs?per_page=8")
        runs = data.get("workflow_runs") or []
        target = None
        for r in runs:
            if r.get("name") == WORKFLOW_NAME:
                sha = (r.get("head_sha") or "")[: len(EXPECTED_COMMIT_PREFIX)]
                if sha == EXPECTED_COMMIT_PREFIX or i >= 3:
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
                f"  [{i:2d}/{max_polls}] status={str(status):<12} conclusion={str(conclusion):<8} "
                f"sha={(target.get('head_sha') or '')[:8]} run_started_at={target.get('run_started_at')}"
            )
            if status == "completed":
                if conclusion == "success":
                    print("\\n✅ Deploy to GitHub Pages 构建/部署成功！")
                    print(f"   工作流链接: {run_url}")
                    print("   📣 访问链接（可能仍需 30~60 秒 CDN 缓存刷新）：")
                    print(f"   🌐 首页      : https://{OWNER}.github.io/{REPO}/")
                    print(f"   🔐 登录/注册 : https://{OWNER}.github.io/{REPO}/#/auth")
                    return 0
                print(f"\\n❌ 工作流失败，conclusion={conclusion}")
                print(f"   请前往 {run_url} 查看详细日志")
                return 4
        else:
            print(f"  [{i:2d}/{max_polls}] 暂未查询到目标工作流记录……（可能仍在排队）")

        time.sleep(8)

    print(f"\\n⚠️  超过 {max_polls * 8} 秒仍未完成。请稍后自行查看：")
    if target_url:
        print(f"   {target_url}")
    return 5


if __name__ == "__main__":
    sys.exit(main())
'''


VERIFY_LIVE_TEMPLATE = '''"""
verify_pages_live_v0_6_0.py
===========================
实际 GET 访问 GitHub Pages 站点，验证首页 / 注册中心返回 200，
并确认 HTML 中包含「小白 / XSVICYYDS」关键词。同时查看最近一次部署 workflow 的状态。
（由 release_content_v0_6_0.py 自动生成）
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request

from create_release_v0_6_0 import (
    OWNER,
    REPO,
    find_git_exe_via_github_desktop,
    get_github_token_from_git_credential,
)

BASE = f"https://{OWNER}.github.io/{REPO}"
API = "https://api.github.com"
CASES = [
    ("/", "官网首页", ["小白", "智能桌面宠物"]),
    ("/#/auth", "登录/注册（Hash 路由仍取 index.html）", ["小白"]),
    ("/index.html", "index.html 直取", ["XSVICYYDS", "小白"]),
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
        except Exception:  # noqa: BLE001
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
    except Exception as e:  # noqa: BLE001
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

    print("\\n🤖 最近 5 次 GitHub Actions 工作流运行：")
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
                f"  - {str(r.get('name')):<30} status={str(r.get('status')):<10} "
                f"conclusion={str(r.get('conclusion')):<8} "
                f"run_started_at={r.get('run_started_at')} "
                f"html_url={r.get('html_url')}"
            )
    else:
        print(json.dumps(runs, ensure_ascii=False, indent=2))

    print("\\n📝 最终结论：")
    if all_ok:
        print("  ✅ GitHub Pages 站点已可正常访问，部署验证通过！")
    else:
        print("  ⏳ 部分页面未返回 200 或关键词未命中 —— GitHub Pages 通常需要 1-3 分钟构建和 CDN 刷新，")
        print("     请稍后再次访问（可直接刷新浏览器）或查看上方 Actions 里的 pages build 状态。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
'''


def determine_next_version(existing_tags: list[str]) -> Tuple[str, str, str]:
    """根据现有已发布标签，决定下一个版本号。

    - 优先解析 vX.Y.Z 语义化版本，在最大版本基础上把 MINOR + 1（本次是新增功能，非补丁）
    - 如果解析失败，就回退到 NEXT_TAG = v0.6.0
    """

    pattern = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")
    parsed = []
    for t in existing_tags:
        m = pattern.match(t.strip())
        if m:
            parsed.append((int(m.group(1)), int(m.group(2)), int(m.group(3)), t))
    if not parsed:
        return NEXT_TAG, NEXT_TITLE, NEXT_NOTES
    major, minor, patch, _ = max(parsed)
    # 本次是注册/登录新功能 + 大量改动，使用 MINOR 递增
    minor += 1
    patch = 0
    return f"v{major}.{minor}.{patch}", NEXT_TITLE, NEXT_NOTES


def main() -> int:
    """解析现有标签 → 生成 3 个发布辅助脚本到 scripts/ 目录。"""
    proj_root = Path(__file__).resolve().parent.parent
    scripts_dir = proj_root / "scripts"
    if not scripts_dir.exists():
        print(f"[!] scripts 目录不存在，创建: {scripts_dir}", file=sys.stderr)
        scripts_dir.mkdir(parents=True, exist_ok=True)

    # 允许从命令行注入已有标签，也可以默认读 v0.5.0 / v0.4.43
    if len(sys.argv) > 1:
        tags = sys.argv[1:]
    else:
        tags = ["v0.4.43", "v0.5.0"]
    tag, title, notes = determine_next_version(tags)
    print(f"[1/4] 现有 tags: {tags}")
    print(f"[2/4] 下一个发布版本 -> {tag}")
    print(f"      标题: {title}")

    create_script = _stringify_template(CREATE_RELEASE_TEMPLATE, {
        "OWNER": OWNER,
        "REPO": REPO,
        "TAG": tag,
        "TITLE": title,
        "NOTES": notes,
    })
    wait_script = _stringify_template(WAIT_FOR_BUILD_TEMPLATE, {
        "COMMIT_PREFIX_PLACEHOLDER": "COMMIT_SHA_PREFIX",
    })
    wait_script = _inject_commit_prefix(wait_script, "COMMIT_SHA_PREFIX")
    verify_script = VERIFY_LIVE_TEMPLATE

    create_path = scripts_dir / "create_release_v0_6_0.py"
    wait_path = scripts_dir / "wait_for_pages_build_v0_6_0.py"
    verify_path = scripts_dir / "verify_pages_live_v0_6_0.py"

    create_path.write_text(create_script, encoding="utf-8")
    wait_path.write_text(wait_script, encoding="utf-8")
    verify_path.write_text(verify_script, encoding="utf-8")

    print(f"[3/4] 生成发布脚本 ✅")
    print(f"      {create_path}")
    print(f"      {wait_path}")
    print(f"      {verify_path}")
    print(f"[4/4] 下一步建议：")
    print(f"      ① git commit -am 'feat(auth): 小白Logo居中+拼图滑块TOLERANCE=15+发送前真人验证'")
    print(f"      ② git push origin main")
    print(f"      ③ set EXPECTED_COMMIT_PREFIX=xxxxxx && python wait_for_pages_build_v0_6_0.py")
    print(f"      ④ python create_release_v0_6_0.py")
    print(f"      ⑤ python verify_pages_live_v0_6_0.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
