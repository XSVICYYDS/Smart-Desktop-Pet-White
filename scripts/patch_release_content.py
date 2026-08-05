"""
patch_release_content.py
========================
对 release_content_v0_6_0.py 做一次性修复：
把它内部的 def main() 改为使用 string.Template + safe_substitute，
避免原实现用 .format() 时把 NOTES / f-strings 中的 {xxx} 也当成格式化占位（KeyError: 'output'）。
"""
from __future__ import annotations

import pathlib
import re
import string  # noqa: F401
import sys

PROJ = pathlib.Path(__file__).resolve().parent.parent
TARGET = PROJ / "scripts" / "release_content_v0_6_0.py"

NEW_MAIN = '''

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
'''


def patch_file() -> int:
    """执行具体的补丁操作。"""
    if not TARGET.exists():
        print(f"[X] 目标文件不存在: {TARGET}", file=sys.stderr)
        return 2
    text = TARGET.read_text(encoding="utf-8")

    # 1) 给文件顶部增加 string / pathlib import（安全，重复也无所谓）
    additions: list[tuple[str, str]] = [
        ("import string\n", "import string"),
        ("import pathlib\n", "import pathlib"),
    ]
    for line, _hint in additions:
        if line not in text:
            text = text.replace("from __future__ import annotations\n", "from __future__ import annotations\n" + line, 1)

    # 2) 把 def main(): ...（直到下一个顶层 if __name__）替换成 NEW_MAIN
    pattern = re.compile(r"def main\(\) -> int:.*?(?=\nif __name__ == \"__main__\":)", re.S)
    new_text, nsubs = pattern.subn(NEW_MAIN, text, count=1)
    if nsubs != 1:
        print(f"[X] 替换 main 失败，命中次数={nsubs}", file=sys.stderr)
        return 3

    TARGET.write_text(new_text, encoding="utf-8")
    print(f"OK: 已修复 {TARGET}（改用 string.Template 安全替换）")
    return 0


if __name__ == "__main__":
    sys.exit(patch_file())
