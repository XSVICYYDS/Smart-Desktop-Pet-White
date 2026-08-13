#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""lint-report-to-issues.py
把 `npm run lint --format json` 的 JSON 输出转换为 QA 缺陷目录的 MD 条目，
供 gh-cli 脚本批量提 Issue。

用法:
  cd Smart-Desktop-Pet-White
  npm run lint -- --format json > _qa/scripts/lint.json
  python _qa/scripts/lint-report-to-issues.py _qa/scripts/lint.json _qa/issues/
"""
import json
import sys
import re
from pathlib import Path


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 1
    src, out_dir = Path(argv[1]), Path(argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    data = json.loads(src.read_text(encoding="utf-8"))
    count = 0
    for entry in data:
        fp = entry.get("filePath")
        for msg in entry.get("messages", []):
            sev = msg.get("severity")  # 1 warn 2 error
            rule = msg.get("ruleId", "no-rule")
            line = msg.get("line", 0)
            col = msg.get("column", 0)
            body = msg.get("message", "")
            if sev != 2:
                continue  # 只提 error 级别
            count += 1
            issue_id = f"ISSUE-LINT-{Path(fp).name}-L{line}-{rule}"
            safe = re.sub(r"[^\w\-.]+", "_", issue_id) + ".md"
            md = f"""# Auto Issue: {rule} @ {Path(fp).name} L{line}:{col}
严重性: {'Error' if sev == 2 else 'Warning'}
文件: `{fp}`
行号: {line}:{col}
规则: `{rule}`
信息: {body}

## 建议修复
参考 ESLint 规则文档: https://eslint.org/docs/rules/{rule}
或用 VS Code Quick Fix 一键修复。
"""
            (out_dir / safe).write_text(md, encoding="utf-8")
    print(f"[OK] 生成 {count} 条 lint error 的缺陷条目 -> {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
