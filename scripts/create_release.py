"""
create_release.py
从 Git Credential Manager 获取 GitHub 访问令牌，调用 GitHub REST API
创建 Smart-Desktop-Pet-White 的 v0.5.0 Release，并附带发行说明。
"""

import os
import sys
import subprocess
import json
import urllib.request
import urllib.error
from pathlib import Path

OWNER = "XSVICYYDS"
REPO = "Smart-Desktop-Pet-White"
TAG = "v0.5.0"
TITLE = "v0.5.0 在线试玩中心上线 · 33 项功能进入说明 + 试玩/试用一键直达"

NOTES = """## 🎉 v0.5.0 在线试玩中心正式上线

本次发布为小白官方网站带来了 **33 项功能的「进入说明 + 试玩/试用」全链路体验**，无需下载安装小白客户端，直接在浏览器中即可完整体验小白的核心趣味玩法。

---

### 🚀 新增亮点

#### 1. 功能详情页（进入）
在「功能详情」页面，每一张游戏/工具/AI 卡片都新增了 **「进入」** 按钮：
- 点击后弹出精美的玻璃态说明弹窗
- 内含：功能简介、详细操作步骤（1/2/3…编号卡片）、高阶技巧亮点
- 弹窗底部一键直达「立即试玩 / 立即试用」

#### 2. 在线试玩中心（/playground/:id）
新增统一的在线试玩路由页面，顶部 sticky 导航栏支持：
- 🔙 返回功能列表
- 📖 查看功能说明（再次进入上面的说明弹窗）
- 🔁 重开当前游戏/工具
- ⬅️➡️ 「上一个 / 下一个」一键切换 33 个功能，无需跳回列表

#### 3. 13 个功能实现在线可玩/可用
| 分类 | 已实现轻量版 |
| --- | --- |
| 🎮 小游戏 · 试玩 | **2048**（支持键盘+触控/最佳分数本地保存）、**贪吃蛇**（20×15 网格/速度递增）、**俄罗斯方块**（7 种形状+踢墙/等级+下一个预览）、**扫雷**（10×10+15 雷/右键插旗）、**井字棋**（X/O 轮换/高亮三连线）、**打地鼠**（30 秒/🐹⭐🐥💣 四种） |
| 🛠️ 工具 · 试用 | **计算器**（键盘完全支持 0-9 +-*/ Enter Esc Backspace）、**记事本**（字数/行数/词数统计+浏览器本地保存+TXT 下载）、**画图工具/截图/屏幕笔**（5 种工具+颜色/粗细+30 步撤销+PNG 导出）、**闹钟/倒计时/番茄钟**（三 Tab 切换/Web Audio 到点提醒） |
| 🤖 AI · 试玩 + 试用 | **笑话**（段子+换一个+❤️ 收藏）、**名言**（今日一句/随机/渐变卡片 PNG 下载分享）、**文本分析**（Top10 高频柱状图+情感分布+自动摘要） |

#### 4. 其余 20 项功能精美降级页
所有尚未实现在线版的功能也没有缺席：统一设计了「敬请下载桌面版体验完整功能」的引导卡片，保留了功能说明和入口引导。

---

### 📝 变更文件
本次提交 1 个 commit，新增/修改 6 个文件：
- `src/data/playgroundData.ts` — 33 份功能说明文案
- `src/components/FeatureCard.tsx` — 统一功能卡片（进入/试玩/试用三按钮）
- `src/components/FeatureDetailModal.tsx` — 功能说明弹窗组件
- `src/pages/Playground.tsx` — 在线试玩/试用中心容器
- `src/pages/Features.tsx` — 功能列表接入新卡片
- `src/App.tsx` — 新增 `/playground/:id` 动态路由

---

### 🔗 访问链接
- 🌐 官网首页：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/
- 🎮 功能详情页：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/#/features
- 🧪 直接试玩 2048：https://XSVICYYDS.github.io/Smart-Desktop-Pet-White/#/playground/game-2048
"""


def get_github_token_from_git_credential(git_exe: str) -> str:
    """通过 git credential fill 从 Windows Credential Manager 获取 GitHub 令牌。

    参数:
        git_exe: git.exe 可执行文件的绝对路径

    返回:
        str: 提取到的 GitHub 访问令牌（通常是 gho_ 或 ghp_ 前缀）

    异常:
        RuntimeError: 当取不到 token 时抛出
    """
    input_text = "protocol=https\nhost=github.com\n\n"
    result = subprocess.run(
        [git_exe, "credential", "fill"],
        input=input_text,
        capture_output=True,
        text=True,
    )
    # credential 协议可能把用户名放 token 字段，密码也可能是 token
    output = result.stdout or ""
    token = None
    username = None
    for line in output.splitlines():
        line = line.strip()
        if line.startswith("password="):
            token = line.split("=", 1)[1].strip()
        elif line.startswith("username="):
            username = line.split("=", 1)[1].strip()
    if not token:
        # 某些情况下 GitHub App 凭据 username 就是 token (x-access-token)
        token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""
    if not token:
        raise RuntimeError(
            "无法从 git credential 中提取 GitHub 访问令牌。\n"
            f"git credential stdout: {output!r}\n"
            f"git credential stderr: {result.stderr!r}"
        )
    return token


def create_release(token: str) -> dict:
    """调用 GitHub REST API /repos/{owner}/{repo}/releases 创建 Release。

    参数:
        token: GitHub 访问令牌

    返回:
        dict: API 返回的 Release 对象

    异常:
        RuntimeError: 创建失败时抛出，附带错误详情
    """
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
        raise RuntimeError(
            f"创建 Release 失败（HTTP {e.code}）：\n{err_body}"
        ) from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"网络错误，无法访问 GitHub API：{e}") from None


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


def main() -> int:
    """主函数：获取 token、创建 release、打印结果链接。"""
    git_exe = find_git_exe_via_github_desktop()
    print(f"[1/3] 发现 git.exe：{git_exe}")
    try:
        token = get_github_token_from_git_credential(git_exe)
        print(f"[2/3] 获取到 GitHub 访问令牌，前缀：{token[:8]}…")
    except RuntimeError as e:
        print(f"[X] 获取令牌失败：{e}", file=sys.stderr)
        return 2
    try:
        rel = create_release(token)
    except RuntimeError as e:
        print(f"[X] 创建 Release 失败：{e}", file=sys.stderr)
        return 3
    print(f"[3/3] ✅ Release 创建成功！")
    print(f"  TAG      : {rel.get('tag_name')}")
    print(f"  ID       : {rel.get('id')}")
    print(f"  URL      : {rel.get('html_url')}")
    print(f"  UploadURL: {rel.get('upload_url')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
