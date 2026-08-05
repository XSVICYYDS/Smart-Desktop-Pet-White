# -*- coding: utf-8 -*-
"""
新增 macOS 打包体系后：commit + pull(no-edit, 冲突 ours) + push。
"""
import os
import subprocess
import sys

REPO = r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\Smart-Desktop-Pet-White"

MSG = (
    "feat(macos): 新增macOS版PyInstaller spec + 一键dmg构建脚本 + "
    "GitHub Actions自动构建发布DMG + 官网下载页新增macOS卡片/系统要求/SHA256校验"
)


def run(cmd, check=True, tail=40):
    print("\n>>>", " ".join(cmd))
    r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, encoding="utf-8", errors="replace")
    out_lines = (r.stdout or "").splitlines()
    err_lines = (r.stderr or "").splitlines()
    if out_lines:
        print("\n".join(out_lines[-tail:]))
    if err_lines:
        sys.stderr.write("STDERR:\n" + "\n".join(err_lines[-tail:]) + "\n")
    if check and r.returncode != 0:
        raise SystemExit(f"failed code={r.returncode}: {' '.join(cmd)}")
    return r


def main():
    os.chdir(REPO)

    # 状态
    status = run(["git", "status", "--porcelain"], check=False)
    if not status.stdout.strip():
        print("(no changes)")
    else:
        print(status.stdout)

    run(["git", "add", "-A"])

    staged = run(["git", "diff", "--cached", "--quiet"], check=False)
    if staged.returncode == 0:
        print("nothing staged, skip commit")
    else:
        run(["git", "commit", "-m", MSG], check=False)

    # pull
    pull = run(["git", "pull", "--no-edit"], check=False)
    if pull.returncode != 0:
        combined = pull.stdout + pull.stderr
        if any(k in combined for k in ["Merge conflict", "CONFLICT", "Automatic merge failed"]):
            print("conflict! resolve ours ...")
            st = subprocess.run(["git", "status", "--porcelain"], cwd=REPO, capture_output=True, text=True)
            for line in st.stdout.splitlines():
                if line.startswith(("UU", "AA", "DD")):
                    p = line[3:]
                    print("ours:", p)
                    subprocess.run(["git", "checkout", "--ours", "--", p], cwd=REPO)
                    subprocess.run(["git", "add", "--", p], cwd=REPO)
            subprocess.run(
                ["git", "-c", "core.editor=true", "commit", "--no-edit"],
                cwd=REPO,
            )
        else:
            raise SystemExit("pull failed")

    run(["git", "push"])
    print("\n✅ pushed")


if __name__ == "__main__":
    main()
