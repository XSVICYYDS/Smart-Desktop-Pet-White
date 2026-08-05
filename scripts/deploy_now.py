# -*- coding: utf-8 -*-
"""自动化部署脚本：根仓库 commit & push 触发 GitHub Pages Deploy
"""
from __future__ import annotations

import os
import subprocess
import sys
from typing import Tuple

ROOT = r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白"


def sh(args, cwd=ROOT, timeout_sec=600, env=None) -> Tuple[int, str, str]:
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    merged_env["GIT_TERMINAL_PROMPT"] = "0"  # 防止交互式输入卡住
    r = subprocess.run(
        args,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        timeout=timeout_sec,
        env=merged_env,
        stdin=subprocess.DEVNULL,
    )
    return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()


def section(title: str):
    print()
    print("=" * 70)
    print(f"▶ {title}")
    print("=" * 70)


def main() -> int:
    section("0. 检查 Git 可用性 & 仓库状态")
    code, out, err = sh(["git.exe", "--version"])
    if code != 0:
        print("❌ 未找到 git.exe。请先安装 Git for Windows。")
        return 2
    print(f"Git 版本: {out}")

    if not os.path.isdir(os.path.join(ROOT, ".git")):
        print("❌ 根目录不是 Git 仓库（缺少 .git）")
        return 3

    code, out, err = sh(["git.exe", "status", "--short"])
    changes = [ln for ln in (out + err).splitlines() if ln.strip()]
    print(f"当前待处理变更数: {len(changes)}")
    for ln in changes[:40]:
        print("  " + ln)
    if len(changes) == 0:
        print("⚠️  没有待提交的变更，跳过。请确认你是不是已经提交过了？")
        return 4

    section("1. 检查 Git 身份（user.name / user.email）")
    code, name, _ = sh(["git.exe", "config", "--get", "user.name"])
    code2, email, _ = sh(["git.exe", "config", "--get", "user.email"])
    if not name or not email:
        print("⚠️  未设置本地 Git 身份，使用默认临时身份写入本地 config")
        if not name:
            sh(["git.exe", "config", "user.name", "XS via Trae"])
        if not email:
            sh(["git.exe", "config", "user.email", "trae@local.xs"])
        code, name, _ = sh(["git.exe", "config", "--get", "user.name"])
        code2, email, _ = sh(["git.exe", "config", "--get", "user.email"])
    print(f"user.name  = {name}")
    print(f"user.email = {email}")

    section("2. 执行 git add -A （除 node_modules / dist 等已忽略项）")
    # 另外排除 scripts 目录下可能残留的临时 py 脚本（若存在）
    code, out, err = sh(["git.exe", "add", "-A", "--", "."])
    if code != 0:
        print(f"❌ git add 失败。\nSTDOUT: {out}\nSTDERR: {err}")
        return 5
    # 再次看一下 staged 情况
    code, staged, _ = sh(["git.exe", "diff", "--cached", "--name-status"])
    lines = [ln for ln in staged.splitlines() if ln.strip()]
    print(f"✅ 已暂存 {len(lines)} 个条目：")
    for ln in lines[:60]:
        print("   " + ln)
    if len(lines) > 60:
        print(f"   ... {len(lines) - 60} more")

    section("3. 执行 git commit")
    commit_msg = (
        "feat(social+likes): 社交好友群聊会话 & 管理员后台消息群管点赞统计 & 热度推荐榜单\n\n"
        "- 社交存储层 socialStore: 好友/申请/群聊(6位邀请码)/会话消息(文字/图片/视频/文件<8MB)/点赞&喜欢\n"
        "- 社交中心 Social.tsx 与会话页 Chat.tsx: 加好友/处理申请/建群/邀请码入群/群成员管理/私聊群聊收发消息\n"
        "- 管理员控制台扩展 3 个 Tab: 消息搜索+编辑+删除; 群聊强解散+转让+禁言踢人; 点赞总榜 Top/清零\n"
        "- FeatureCard: 每款游戏/工具/AI 底部新增👍赞和❤️喜欢按钮并显示实时数量\n"
        "- Features.tsx & Home.tsx: computeHotScore=赞*2+喜欢*3 自动热度排序 + 全局Top主推位/分类Top3条\n"
        "- Navbar/App: 新增 /social 和 /chat/:id 路由, Navbar 加入社交中心入口\n"
    )
    code, out, err = sh(["git.exe", "commit", "-m", commit_msg])
    if code != 0:
        # 可能是 nothing to commit（因为之前有问题）
        combined = out + "\n" + err
        print(f"⚠️  git commit 返回 code={code}")
        print(combined[-3000:] if len(combined) > 3000 else combined)
        if "nothing to commit" in combined.lower():
            print("✅ 没什么可提交的，继续尝试 push 最新 commit")
        else:
            return 6
    else:
        print("✅ commit 成功")
        print((out + "\n" + err)[-1200:])

    section("4. 获取当前 commit hash & 远端 URL")
    code, sha, _ = sh(["git.exe", "rev-parse", "HEAD"])
    code2, remote, _ = sh(["git.exe", "remote", "get-url", "origin"])
    short_sha = sha[:7] if sha else "UNKNOWN"
    print(f"HEAD commit SHA: {sha}")
    print(f"origin       URL: {remote}")
    if not remote:
        print("❌ 未关联 origin remote")
        return 7

    section("5. 执行 git push origin main (GIT_TERMINAL_PROMPT=0 避免卡住等待输入)")
    push_timeout = 300  # 最多等 5 分钟
    code, out, err = sh(
        ["git.exe", "push", "origin", "main"],
        timeout_sec=push_timeout,
    )
    combined_push = (out + "\n" + err).strip()
    print(combined_push[-4000:] if len(combined_push) > 4000 else combined_push)
    if code != 0:
        msg = combined_push.lower()
        if "authorization failed" in msg or "authentication failed" in msg or "logon failed" in msg:
            print("\n❌ push 失败：认证失败。")
            print("   解决方法：使用 GitHub Personal Access Token (classic) 作为密码，")
            print("   勾选 repo/workflow/read:packages 权限，然后在 Git 认证弹窗/Git Credential Manager 里填入。")
            print("   或者先在你本机打开终端手动执行一次 `git push origin main`，输完账号+PAT 后 Windows Credential Manager 会缓存，下次本脚本即可推送成功。")
        elif "timeout" in msg or "timed out" in msg:
            print("\n❌ push 超时（网络/代理/大陆访问 GitHub 不稳定）。请稍后重试，或使用代理后再 push。")
        else:
            print(f"\n❌ push 失败 code={code}。请根据上面的错误信息处理。")
        return 8

    print("✅ push 成功！流水线应已自动触发。")

    section("6. 部署结果链接（打开即可查看）")
    owner_repo = None
    # 从 https://github.com/XSVICYYDS/Smart-Desktop-Pet-White.git 提取 owner/repo
    for cand in [remote.replace(".git", "")]:
        if cand.startswith("https://github.com/"):
            owner_repo = cand.split("github.com/", 1)[1]
            break
        if cand.startswith("git@github.com:"):
            owner_repo = cand.split("github.com:", 1)[1]
            break
    if owner_repo and owner_repo.endswith("/"):
        owner_repo = owner_repo[:-1]
    if owner_repo:
        owner, repo = owner_repo.split("/", 1)
        print(f"  🚀 Actions 实时运行页:  https://github.com/{owner}/{repo}/actions/workflows/deploy.yml")
        print(f"  📦 本 commit 的流水线:  https://github.com/{owner}/{repo}/actions?query=sha%3A{short_sha}")
        print(f"  🌐 最终 Pages 站点 URL: https://{owner}.github.io/{repo}/")
        print(f"  📝 提交详情:           https://github.com/{owner}/{repo}/commit/{sha}")
    print()
    print("部署完成！流水线通常需要 2-5 分钟，成功后 Environment: github-pages 会显示绿色。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
