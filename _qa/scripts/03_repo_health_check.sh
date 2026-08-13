#!/usr/bin/env bash
# =======================================================
#  仓库健康巡检 (gh-cli)
#  列出最近 10 条 PR + Actions 最近 10 个 run + Release 最近 5 条
#  用法: bash Smart-Desktop-Pet-White/_qa/scripts/03_repo_health_check.sh
# =======================================================
set -u
cd "$(dirname "$0")/../../.."

echo "===== 1. 仓库信息 ====="
gh repo view --json nameWithOwner,url,description,defaultBranchRef,stargazerCount,issues,pullRequests || {
  echo "[FAIL] gh 未登录 / 非有效仓库"
  exit 1
}
echo ""

echo "===== 2. 最近 10 条 Pull Request ====="
gh pr list --limit 10 --state all --json number,title,author,state,updatedAt,mergeCommit --template \
  '{{range .}}#{{.number}} [{{.state}}] {{.title}}    @{{.author.login}}  updated={{.updatedAt}}{{"\n"}}{{end}}' || echo "(无 PR 或出错)"
echo ""

echo "===== 3. Actions 最近 10 次 Run ====="
gh run list --limit 10 || echo "(无 Actions 配置或出错)"
echo ""

echo "===== 4. Release 最近 5 条 ====="
gh release list --limit 5 || echo "(无 release)"
echo ""

echo "===== 5. 最近 10 条 Issue（按更新时间）====="
gh issue list --limit 10 --state all --json number,title,state,labels,updatedAt --template \
  '{{range .}}#{{.number}} [{{.state}}] {{range .labels}}{{.name}} {{end}} | {{.title}}   (updated={{.updatedAt}}){{"\n"}}{{end}}' || echo "(无 issue)"
echo ""
echo "[OK] 巡检完成"
