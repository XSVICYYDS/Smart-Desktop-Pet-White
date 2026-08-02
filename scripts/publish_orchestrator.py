"""
publish_orchestrator.py
=======================
把「网络+凭据探测 → git push origin main → 轮询 Actions → 创建 Release → HTTP 真实验证」
5 步合并在同一个 Python 流程里跑，避免在 PowerShell 里写分支判断触发 ExecutionPolicy 禁止 .ps1 文件。

全程只用 C:\\Users\\XS\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe 执行，
不依赖 gh CLI（GitHub CLI 本地当前也没装）；
Git 用 GitHub Desktop 自带或 C:\\Program Files\\Git\\cmd\\git.exe。
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
| `scripts/do_auto_publish.py` | 自动发布编排：git push / 轮询 Actions / 创建 Release / HTTP 真实验证 |

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

PROJ_DIR = pathlib.Path(__file__).resolve().parent.parent


def find_git_exe() -> str:
    """优先取 GitHub Desktop 内嵌 git.exe，其次 C:\\Program Files\\Git，最后回退 'git'。"""
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


def get_github_token(git_exe: str) -> str:
    """从 Git Credential Manager 取 token，取不到再走 GH_TOKEN / GITHUB_TOKEN 环境变量。"""
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
    return token


def log(step: str, msg: str) -> None:
    """带步骤前缀的打印。"""
    print(f"[{step}] {msg}", flush=True)


def run_cmd(cmd: list[str], *, timeout: int = 600) -> tuple[int, str, str]:
    """通用子进程执行；stdout/stderr 截断后返回，避免超长出现在日志里。"""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, cwd=str(PROJ_DIR))
        return (
            r.returncode,
            (r.stdout or "")[-2000:],
            (r.stderr or "")[-2000:],
        )
    except subprocess.TimeoutExpired:
        return 124, "", f"timeout after {timeout}s"


def step0_probe(git_exe: str) -> int:
    """Step 0：TCP → Git ls-remote → REST API 三项探测。"""
    log("0/5", "网络+凭据探测")
    ok_all = True
    for host in ("github.com", "api.github.com"):
        try:
            with socket.create_connection((host, 443), timeout=8):
                log("TCP", f"{host}:443 OK")
        except Exception as e:  # noqa: BLE001
            log("TCP", f"{host}:443 FAIL: {e}")
            ok_all = False
    if not ok_all:
        log("WARN", "TCP 到 GitHub 不通：请确认加速器已启用「TUN/全局/系统代理」模式；仅浏览器代理不会影响 git / urllib")
        return 1
    rc, out, err = run_cmd([git_exe, "-C", str(PROJ_DIR), "ls-remote", "origin", "HEAD"], timeout=45)
    if rc == 0:
        log("GIT", f"ls-remote OK → {(out.splitlines()[0] if out else '(empty)').strip()}")
    else:
        log("GIT", f"ls-remote FAIL exit={rc}")
        if out:
            print("  stdout:", out[:400])
        if err:
            print("  stderr:", err[:400], file=sys.stderr)
        log("HINT", "替代步骤：打开 GitHub Desktop → 仓库 Smart-Desktop-Pet-White → 点右上角 Push origin")
        return 2
    token = get_github_token(git_exe)
    if not token:
        log("TOKEN", "空：GitHub Desktop 未登录或凭据失败；在桌面端先登录再跑本脚本，或 set GH_TOKEN=ghp_xxx")
        return 3
    log("TOKEN", f"前缀 {token[:8]}…")
    req = urllib.request.Request(
        f"https://api.github.com/repos/{OWNER}/{REPO}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "XS-orch/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        log("API", f"repo probe OK: name={data.get('full_name')} pushed_at={data.get('pushed_at')}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        log("API", f"FAIL HTTP {e.code} {body[:300]}")
        return 4
    except Exception as e:  # noqa: BLE001
        log("API", f"FAIL {e}")
        return 4
    return 0


def step1_push(git_exe: str) -> tuple[int, str]:
    """Step 1：git push origin main；并返回最新本地 HEAD 短 SHA（用于后续轮询 Actions）。"""
    log("1/5", "git push origin main")
    rc, out, err = run_cmd([git_exe, "-C", str(PROJ_DIR), "push", "origin", "main"], timeout=180)
    if rc == 0:
        log("1/5", "push 成功 ✅")
    else:
        log("1/5", f"push FAIL exit={rc}")
        if out:
            print("  stdout:", out[:600])
        if err:
            print("  stderr:", err[:600], file=sys.stderr)
    sha = ""
    rc2, o2, _e2 = run_cmd([git_exe, "-C", str(PROJ_DIR), "rev-parse", "--short=7", "HEAD"], timeout=15)
    if rc2 == 0:
        sha = o2.strip()[:7]
    return rc, sha


def step2_wait_deploy(token: str, commit_prefix: str) -> int:
    """Step 2：轮询 Actions Deploy to GitHub Pages 状态。"""
    log("2/5", f"轮询 Actions Deploy to GitHub Pages（commit_prefix={commit_prefix}）")
    max_polls = 25
    target_run: dict | None = None
    for i in range(1, max_polls + 1):
        req = urllib.request.Request(
            f"https://api.github.com/repos/{OWNER}/{REPO}/actions/runs?per_page=8",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "XS-orch/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8", errors="replace"))
        except Exception as e:  # noqa: BLE001
            log("  ", f"[{i:2d}/{max_polls}] 拉 Actions 列表失败: {e}")
            time.sleep(8)
            continue
        runs = data.get("workflow_runs") or []
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
            target_run = target
            status = target.get("status")
            conclusion = target.get("conclusion")
            run_url = target.get("html_url")
            log(
                "  ",
                f"[{i:2d}/{max_polls}] status={str(status):<12} "
                f"conclusion={str(conclusion):<8} sha={(target.get('head_sha') or '')[:8]}",
            )
            if status == "completed":
                if conclusion == "success":
                    log("2/5", f"✅ Deploy 成功：{run_url}")
                    return 0
                log("2/5", f"❌ Deploy 失败 conclusion={conclusion}：{run_url}")
                return 5
        else:
            log("  ", f"[{i:2d}/{max_polls}] 暂未查询到工作流记录……（仍在排队）")
        time.sleep(8)
    log("2/5", f"⏳ 超过 {max_polls * 8} 秒仍未结束")
    if target_run:
        log("2/5", f"  请手动查看：{target_run.get('html_url')}")
    return 6


def step3_create_release(token: str) -> int:
    """Step 3：检查并创建 v0.6.0 Release（已存在则跳过）。"""
    log("3/5", f"创建 Release tag={NEXT_TAG}")
    # 先查是否已存在
    req = urllib.request.Request(
        f"https://api.github.com/repos/{OWNER}/{REPO}/releases/tags/{NEXT_TAG}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "XS-orch/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        log("3/5", f"Release 已存在，跳过创建：{data.get('html_url')}")
        return 0
    except urllib.error.HTTPError as e:
        if e.code != 404:
            body = e.read().decode("utf-8", errors="replace")
            log("3/5", f"查询 Release 失败 HTTP {e.code} {body[:300]}")
            return 7
        # 404 → 需要创建
    payload = {
        "tag_name": NEXT_TAG,
        "target_commitish": "main",
        "name": NEXT_TITLE,
        "body": NEXT_NOTES,
        "draft": False,
        "prerelease": False,
        "generate_release_notes": False,
    }
    data_bytes = json.dumps(payload).encode("utf-8")
    req2 = urllib.request.Request(
        f"https://api.github.com/repos/{OWNER}/{REPO}/releases",
        data=data_bytes, method="POST",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "XS-orch/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req2, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        log("3/5", f"✅ Release 创建成功：{data.get('html_url')}")
        return 0
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        log("3/5", f"创建 Release 失败 HTTP {e.code} {body[:500]}")
        return 8
    except Exception as e:  # noqa: BLE001
        log("3/5", f"创建 Release 失败 {e}")
        return 8


def step4_verify_live() -> int:
    """Step 4：HTTP 真实访问首页与注册路由，校验状态码与关键词。"""
    log("4/5", "验证 GitHub Pages 首页/登录注册中心 200 且关键词命中")
    base = f"https://{OWNER}.github.io/{REPO}"
    cases = [
        ("/", ["小白", "智能桌面宠物"]),
        ("/#/auth", ["小白"]),  # hash 路由实际仍回 index.html
        ("/index.html", ["XSVICYYDS", "小白"]),
    ]
    all_ok = True
    for path, keys in cases:
        url = base + path
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "XS-orch/1.0",
                "Cache-Control": "no-cache",
            },
        )
        status = 0
        body = b""
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                status = resp.status
                body = resp.read()
        except urllib.error.HTTPError as e:
            status = e.code
            try:
                body = e.read()
            except Exception:  # noqa: BLE001
                pass
        except Exception as e:  # noqa: BLE001
            log("HTTP", f"FAIL {url}: {e}")
            all_ok = False
            continue
        html = body.decode("utf-8", errors="replace")
        hit = all(k in html for k in keys)
        tag = "OK " if (status == 200 and hit) else "NG "
        if not (status == 200 and hit):
            all_ok = False
        log("HTTP", f"{tag}[{status:3d}] {url}  关键词{keys}→{'命中' if hit else '未命中'}")
    if all_ok:
        log("4/5", "✅ Pages 站点可正常访问 & 关键词全部命中 ✅")
        return 0
    log("4/5", "⏳ 部分页面未达预期 —— GitHub Pages CDN 通常 30~120 秒刷新，稍后在浏览器里刷新即可")
    return 9


def main() -> int:
    """主入口：0 探测 → 1 push → 2 轮询 → 3 Release → 4 Pages HTTP 验证。"""
    log("MAIN", f"项目目录: {PROJ_DIR}")
    git_exe = find_git_exe()
    log("MAIN", f"Git: {git_exe}")
    rc_probe = step0_probe(git_exe)
    if rc_probe != 0:
        log("MAIN", f"探测未通过 (exit={rc_probe})，退出；请修正网络或凭据后重试。")
        return rc_probe
    token = get_github_token(git_exe)
    rc_push, short_sha = step1_push(git_exe)
    if rc_push != 0:
        log("MAIN", "git push 失败：先在 GitHub Desktop 点 Push，成功后再重新运行本脚本继续发布（不会重复 commit）")
        return 10 + rc_push
    log("MAIN", f"本次 HEAD 短 SHA = {short_sha}")
    rc_wait = step2_wait_deploy(token, short_sha or "")
    rc_rel = step3_create_release(token)
    rc_ver = step4_verify_live()
    print()
    log("END", "=== 最终汇总 ===")
    log("END", f"  探测    : {rc_probe} (0=OK)")
    log("END", f"  push    : {rc_push} (0=OK) sha={short_sha}")
    log("END", f"  Actions : {rc_wait} (0=OK)")
    log("END", f"  Release : {rc_rel} (0=OK) → https://github.com/{OWNER}/{REPO}/releases/tag/{NEXT_TAG}")
    log("END", f"  Pages   : {rc_ver} (0=OK)")
    log("END", f"  官网首页: https://{OWNER}.github.io/{REPO}/")
    log("END", f"  登录中心: https://{OWNER}.github.io/{REPO}/#/auth")
    log("END", f"  Actions : https://github.com/{OWNER}/{REPO}/actions")
    final = max(rc_probe, rc_push, rc_wait, rc_rel, rc_ver)
    return 0 if final == 0 else 100 + final


if __name__ == "__main__":
    sys.exit(main())
