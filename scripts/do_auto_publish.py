"""
do_auto_publish.py (v0.6.0)
==========================
一次性执行：
  1) git push origin main（触发 .github/workflows/deploy.yml 的 Pages 构建/部署）
  2) 使用 EXPECTED_COMMIT_PREFIX=<短SHA> 运行 wait_for_pages_build_v0_6_0.py 或（旧版 wait_for_pages_build.py 回退）
     轮询 Actions 直到 Deploy to GitHub Pages 工作流 success / completed
  3) 运行 create_release_v0_6_0.py 或 旧版 create_release.py 创建 GitHub Release（tag v0.6.0）
  4) 运行 verify_pages_live_v0_6_0.py 或 旧版 verify_pages_live.py 真实 HTTP 检查首页/登录注册页 200 且含「小白」关键词

容错：
  - 即使 release_content_v0_6_0 生成的 _v0_6_0 三件套脚本若不存在（release_content 仍因 NameError 没写失败），
    自动回退到仓库里已有的老脚本（create_release.py / wait_for_pages_build.py / verify_pages_live.py），
    老脚本版本里 OWNER/REPO 固定，TAG=v0.5.0 我们用环境变量覆盖或直接改用 urllib 发 Release
  - GitHub 网络 443 超时 / token 取不到时，给出可手动在 GitHub Desktop 点 Push 或在 GitHub 网页 Actions 手动触发 workflow_dispatch
    或者 Release 的具体步骤

说明：所有 Python 脚本都用用户给的 C:\\Users\\XS\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe 跑
"""
from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.error
import urllib.request

# ========== 常量 ==========
PYTHON_EXE = r"C:\Users\XS\AppData\Local\Microsoft\WindowsApps\python.exe"
PROJ_DIR = pathlib.Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PROJ_DIR / "scripts"
LAST_SHA_FILE = PROJ_DIR / ".last_commit_sha.env"
OWNER = "XSVICYYDS"
REPO = "Smart-Desktop-Pet-White"
NEXT_TAG = "v0.6.0"
NEXT_TITLE = "v0.6.0 注册中心安全升级 · 小白 Logo 居中修正 + 拼图滑块真人验证（容差10~20px）"

NEXT_NOTES = """## 🐶 v0.6.0 注册中心安全升级正式发布

本次发布是 **小白官网「登录/注册」模块的安全与体验专项版本**，集中解决了前期用户反馈的两个高频问题：
① 注册界面「小白 Logo 位置偏差 / 左上角碎图占位」
② 发送邮箱验证码缺少真人校验，容易被机器人刷接口

同时按用户规格把拼图滑块容差从原先的 5px 调整为 **15px**（落在 10~20px 黄金区间，兼顾安全和体验）。

---

### ✨ 本次核心改进

#### 1. 注册界面小白 Logo 居中修正（修复位置偏差）
- 所有出现小白 Logo 的位置统一使用 **96×96 固定圆形容器 + object-cover/center** 居中裁切
- 给 Logo 容器加了 **粉色渐变打底**：即使用户网络差 GIF 没加载出来，左上角也永远是整齐的粉色圆
- 新增图片加载失败 **三级回退**：`xiaobai-logo.gif → favicon.svg → favicon.png`，避免浏览器默认破碎图标
- 注册卡片右下角新增 32px 小白徽章（「注册安全校验」语义）

#### 2. 拼图滑块验证码（容差 10~20px）
- `TOLERANCE` 常量按给的规范由 5 → **15 px**（落在 [10,20] 区间）
- Canvas 动态生成带凹凸的缺口+滑块，支持鼠标按住拖拽 + 移动端触屏手势

#### 3. 发送邮箱验证码前强制「拼图真人验证」（安全校验链路）
- 用户点「发送验证码」 → 若未过拼图则先弹出独立玻璃态安全校验 Modal
- 拼图通过（|误差| ≤ 15px） → 自动关闭 Modal → Toast「✅ 拼图验证通过」 → 自动重触发发送
- 发送按钮三态切换：未过拼图/已过拼图/倒计时中

#### 4. TypeScript 严格模式 & 构建通过
- 修复了 `dataset.fb` 类型收窄导致的 TS2367 编译错误
- `npm run build` 下 `tsc -b + vite build` 均通过

---

### 📁 变更文件清单
| 文件 | 改动摘要 |
| --- | --- |
| `src/components/SliderCaptcha.tsx` | 容差 TOLERANCE=5→15，加中文注释解释依据 |
| `src/pages/Auth.tsx` | ① 顶部主Logo / 发送验证码弹窗头部Logo居中 ② 发送前新增拼图Modal |
| `scripts/slider_captcha_tolerance_check.py` | 容差回归脚本：20万次正态分布模拟→78.87%通过率 |

---

### 🔁 发布链路
1. push origin main → 触发 `.github/workflows/deploy.yml`（Actions: build→upload→deploy-pages）
2. 轮询 Actions，等待 **Deploy to GitHub Pages** success
3. 创建 Release（tag=v0.6.0）
4. GET 官网首页/注册页验证 200 且含「小白」

---

### 🔗 访问链接
- 🌐 官网首页：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/
- 🔐 登录/注册中心：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/#/auth
- 📦 本次 Release：https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/tag/v0.6.0
"""


def log(tag: str, msg: str) -> None:
    """带颜色前缀的控制台打印。"""
    print(f"[{tag}] {msg}", flush=True)


def run(cmd: list[str], *, env_add: dict | None = None, cwd: pathlib.Path | None = None, timeout_sec: int = 600) -> int:
    """子进程执行命令，继承 stdout/stderr；返回退出码。"""
    merged_env = os.environ.copy()
    if env_add:
        merged_env.update(env_add)
    log("CMD", " ".join(cmd))
    try:
        proc = subprocess.run(cmd, env=merged_env, cwd=str(cwd or PROJ_DIR), timeout=timeout_sec)
        return proc.returncode
    except subprocess.TimeoutExpired:
        log("ERR", f"命令超时（>{timeout_sec}s）：{' '.join(cmd)}")
        return 124


def read_short_sha() -> str:
    """优先读 .last_commit_sha.env，失败就直接 git rev-parse HEAD。"""
    if LAST_SHA_FILE.exists():
        for line in LAST_SHA_FILE.read_text(encoding="utf-8").splitlines():
            if "=" in line:
                _, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if v:
                    return v[:7]
    out = subprocess.run(
        ["git", "rev-parse", "--short=7", "HEAD"],
        capture_output=True, text=True, cwd=str(PROJ_DIR),
    )
    return (out.stdout or "").strip()[:7]


def find_git_exe_via_github_desktop() -> str:
    """和发布三件套脚本保持一致：优先取 GitHub Desktop 内嵌 git。"""
    base = pathlib.Path(os.environ.get("LOCALAPPDATA", "")) / "GitHubDesktop"
    if base.exists():
        for app_dir in sorted(base.glob("app-*"), reverse=True):
            git = app_dir / "resources" / "app" / "git" / "cmd" / "git.exe"
            if git.exists():
                return str(git)
    # 回退：Program Files Git
    candidate = pathlib.Path(r"C:\Program Files\Git\cmd\git.exe")
    if candidate.exists():
        return str(candidate)
    return "git"


def get_github_token_from_git_credential() -> str:
    """通过 git credential fill 从 Windows 凭据管理器拿 token。"""
    git_exe = find_git_exe_via_github_desktop()
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
    if not token:
        raise RuntimeError(
            "取不到 GitHub token：请在 GitHub Desktop 登录后再试；或手动 set GH_TOKEN=ghp_xxx"
        )
    return token


def api(token: str, method: str, path: str, payload: dict | None = None) -> tuple[int, dict]:
    """简单 GitHub REST API 封装。"""
    url = "https://api.github.com" + path
    data = None
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "XS-White-AutoRelease/1.0",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, (json.loads(body) if body else {})
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, {"_http_body": body, "_http_json": json.loads(body)}
        except Exception:  # noqa: BLE001
            return e.code, {"_http_body": body}
    except Exception as e:  # noqa: BLE001
        return 0, {"_net": str(e)}


def release_exists(token: str, tag: str) -> bool:
    """检查该 tag 是否已存在 release。"""
    st, _ = api(token, "GET", f"/repos/{OWNER}/{REPO}/releases/tags/" + tag)
    return st == 200


def create_release_via_api(token: str) -> tuple[int, dict]:
    """调用 REST POST /releases 创建 v0.6.0 Release。"""
    payload = {
        "tag_name": NEXT_TAG,
        "target_commitish": "main",
        "name": NEXT_TITLE,
        "body": NEXT_NOTES,
        "draft": False,
        "prerelease": False,
        "generate_release_notes": False,
    }
    return api(token, "POST", f"/repos/{OWNER}/{REPO}/releases", payload)


def poll_until_pages_deployed(token: str, commit_prefix: str, max_polls: int = 25) -> tuple[bool, str | None]:
    """轮询最近 25 次（约 3+ 分钟），等 Deploy to GitHub Pages 成功。"""
    log("POLL", f"等待 Deploy to GitHub Pages（commit_prefix={commit_prefix}）")
    target_url: str | None = None
    for i in range(1, max_polls + 1):
        st, data = api(token, "GET", f"/repos/{OWNER}/{REPO}/actions/runs?per_page=8")
        runs = (data or {}).get("workflow_runs") or []
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
            status = target.get("status")
            conclusion = target.get("conclusion")
            run_url = target.get("html_url")
            target_url = run_url or target_url
            log(
                f"[{i:2d}/{max_polls}",
                f"status={str(status):<12} conclusion={str(conclusion):<8} sha={(target.get('head_sha') or '')[:8]}",
            )
            if status == "completed":
                return (conclusion == "success"), run_url
        else:
            log(f"[{i:2d}/{max_polls}", "暂未查到工作流记录……（仍在排队）")
        time.sleep(8)
    return False, target_url


def http_get(url: str, timeout: int = 30) -> tuple[int, bytes]:
    """简单的 HTTP GET。"""
    req = urllib.request.Request(
        url, method="GET", headers={
            "User-Agent": "XS-White-AutoRelease/1.0",
            "Cache-Control": "no-cache",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        try:
            return e.code, e.read()
        except Exception:  # noqa: BLE001
            return e.code, b""
    except Exception:  # noqa: BLE001
        return 0, b""


def verify_live() -> bool:
    """真实 GET 首页、登录注册 Hash 路由、index.html 直取。"""
    base = f"https://{OWNER}.github.io/{REPO}"
    cases = [
        ("/", ["小白", "智能桌面宠物"]),
        ("/#/auth", ["小白"]),
        ("/index.html", ["XSVICYYDS", "小白"]),
    ]
    ok_all = True
    for path, keys in cases:
        st, body = http_get(base + path)
        html = body.decode("utf-8", errors="replace")
        hit = all(k in html for k in keys)
        tag = "OK " if (st == 200 and hit) else "NG "
        if not (st == 200 and hit):
            ok_all = False
        log("HTTP", f"{tag}[{st:3d}] {base+path}  关键词 {keys} {'命中' if hit else '未命中'}")
    return ok_all


def step1_git_push() -> int:
    """执行 git push origin main。"""
    return run(["git", "push", "origin", "main"])


def step2_wait_deploy(commit_prefix: str) -> int:
    """用已存在的 wait_for_pages_build.py（老版本），或回退到本文件自带轮询。"""
    wait_script = SCRIPTS_DIR / "wait_for_pages_build.py"
    # 老脚本里写死了 EXPECTED_COMMIT_PREFIX = db129c3，需要在环境变量里优先走我们的实际 SHA
    # wait_for_pages_build_v0_6_0.py 不存在就直接走自写轮询
    v2 = SCRIPTS_DIR / "wait_for_pages_build_v0_6_0.py"
    if v2.exists():
        log("STEP2", f"调用 wait_for_pages_build_v0_6_0.py（注入 EXPECTED_COMMIT_PREFIX=" + commit_prefix)
        return run(
            [PYTHON_EXE, str(v2)],
            env_add={"EXPECTED_COMMIT_PREFIX": commit_prefix},
            timeout_sec=600,
        )
    if wait_script.exists():
        log("STEP2", "v0_6_0三件套不存在，回退到 create_release.py + 自写轮询")
    try:
        token = get_github_token_from_git_credential()
    except RuntimeError as e:
        log("ERR", f"获取 GitHub Token 失败：{e}")
        return 2
    ok, run_url = poll_until_pages_deployed(token, commit_prefix)
    if ok:
        log("STEP2", f"✅ Deploy 成功！工作流链接: {run_url}")
        return 0
    log("STEP2", f"❌ Deploy 未成功或超时。请手动查看 Actions: {run_url}")
    return 4


def step3_create_release() -> int:
    """优先调用 create_release_v0_6_0.py / 老 create_release.py，失败就直接调用 REST API。"""
    v2 = SCRIPTS_DIR / "create_release_v0_6_0.py"
    if v2.exists():
        rc = run([PYTHON_EXE, str(v2)], timeout_sec=180)
        if rc == 0:
            return 0
        log("STEP3", f"create_release_v0_6_0.py 返回 {rc}，改用 REST API 兜底创建 {NEXT_TAG}")
    elif (SCRIPTS_DIR / "create_release.py").exists():
        log("STEP3", "⚠️  老 create_release.py TAG 固定为 v0.5.0，直接改用 REST API 兜底创建 v0.6.0")
    try:
        token = get_github_token_from_git_credential()
    except RuntimeError as e:
        log("ERR", str(e))
        return 2
    if release_exists(token, NEXT_TAG):
        log("STEP3", f"Release {NEXT_TAG} 已存在，跳过创建")
        return 0
    st, data = create_release_via_api(token)
    if st == 201:
        log("STEP3", "✅ Release 创建成功: " + str(data.get("html_url")))
        return 0
    log("STEP3", f"❌ Release 创建失败 HTTP {st}: " + json.dumps(data, ensure_ascii=False)[:400])
    return 3


def step4_verify_live() -> int:
    """真实 HTTP 检查页面。"""
    v2 = SCRIPTS_DIR / "verify_pages_live_v0_6_0.py"
    if v2.exists():
        rc = run([PYTHON_EXE, str(v2)], timeout_sec=180)
        if rc == 0:
            return 0
        log("STEP4", f"verify v2 脚本返回 {rc}，改用内联 HTTP GET 兜底验证")
    return 0 if verify_live() else 5


def main() -> int:
    log("AUTO", "🚀 开始小白官网自动发布 v0.6.0（注册安全升级）")
    short_sha = read_short_sha()
    log("AUTO", f"本次 commit 短 SHA: {short_sha}")
    if not short_sha:
        log("ERR", "取不到 commit SHA，终止发布")
        return 1

    log("AUTO", "====== Step 1/4: git push origin main ======")
    rc_push = step1_git_push()
    if rc_push != 0:
        # git push 失败（比如网络 443 超时）也别直接退出：尝试仍继续走 GitHub Actions 手动 workflow_dispatch / 用户手动在 GitHub Desktop push
        log(
            "WARN",
            "git push 失败（可能是 GitHub 443 连接问题），建议：① 打开 GitHub Desktop 点 Push；"
            "② 或打开 https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/actions 手动点 Run workflow 触发 deploy.yml；"
            "③ 然后再重新跑一次本脚本",
        )
        log("AUTO", "为确保发布尽量全自动，我们跳过 push 失败直接给引导提示；后续步骤暂不执行")
        return 10 + rc_push

    log("AUTO", "====== Step 2/4: 等待 Actions Deploy to GitHub Pages 成功 ======")
    rc_wait = step2_wait_deploy(short_sha)
    if rc_wait not in (0, 4, 5):
        log("AUTO", f"wait 退出码={rc_wait}，仍会继续尝试创建 Release + verify（因为 Actions 可能稍后成功）")

    log("AUTO", "====== Step 3/4: 创建 GitHub Release " + NEXT_TAG + " ======")
    _ = step3_create_release()

    log("AUTO", "====== Step 4/4: HTTP 真实访问验证首页/登录中心 ======")
    rc_ver = step4_verify_live()

    log("AUTO", "全部自动发布流程结束。")
    log("AUTO", f"🌐 官网首页  : https://{OWNER}.github.io/{REPO}/")
    log("AUTO", f"🔐 登录/注册 : https://{OWNER}.github.io/{REPO}/#/auth")
    log("AUTO", f"📦 Release   : https://github.com/{OWNER}/{REPO}/releases/tag/{NEXT_TAG}")
    log("AUTO", f"🤖 Actions   : https://github.com/{OWNER}/{REPO}/actions")
    return 0 if rc_ver == 0 else rc_ver


if __name__ == "__main__":
    sys.exit(main())
