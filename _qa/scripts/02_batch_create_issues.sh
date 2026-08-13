#!/usr/bin/env bash
# =======================================================
#  把 _qa/issues/*.md 中的缺陷批量提交为 GitHub Issue（DRY-RUN 模式）
#  生成日期: 2026-08-11 18:20:45
#
#  用法：
#    1. gh auth login        # 登录一次即可
#    2. 把本文件中所有 echo "gh issue create ..."   去掉 echo 前缀 才会真正提交
#    3. bash 02_batch_create_issues.sh
# =======================================================

set -u
cd "$(dirname "$0")/../../.."  # 回到项目根 Smart-Desktop-Pet-White

echo "[INFO] 当前仓库:"
gh repo view --json nameWithOwner,url 2>/dev/null || (echo '[WARN] 未登录 gh 或不在 git repo 内，exit'; exit 1)


# --- defect-tracking-template.md ---
echo "gh issue create --title '缺陷跟踪管理模板' --body-file '_qa/issues/defect-tracking-template.md' --label bug --assignee @me"

# --- issue-sample-demo-admin.md ---
echo "gh issue create --title '示例缺陷: 管理员 demo 账号 admin@example.com / Admin123! 在生产构建仍可用' --body-file '_qa/issues/issue-sample-demo-admin.md' --label demo-only,documentation --assignee @me"

echo '[DONE] 全部 dry-run 完成。若要真提交，去掉上方每行的 echo 前缀。'
