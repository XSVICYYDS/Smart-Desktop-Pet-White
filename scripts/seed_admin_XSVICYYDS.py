"""
scripts/seed_admin_XSVICYYDS.py
==============================
桌面端小白数据目录的「管理员种子脚本」：

执行效果：
  - 如果超级管理员 XSVICYYDS（邮箱 XSVICYYDS@outlook.com）在 users.json 中不存在，
    就创建它，并写入密码哈希（Xs@315207，严格强度校验通过）
  - 在 user_roles.json 绑定 SUPER_ADMIN 角色
  - 幂等：已存在则只补齐缺失的 SUPER_ADMIN 角色，不重复创建

运行方式（按用户要求使用 python 绝对路径）：
  C:\\Users\\XS\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe \
    c:\\Users\\XS\\Desktop\\尚志中学809班徐慎智能桌面宠物小白\\scripts\\seed_admin_XSVICYYDS.py
"""
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import sys
import uuid
from datetime import datetime

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent

# ========== 内置超级管理员（与桌面端 AuthSystem 常量保持一致） ==========
BUILTIN_NICKNAME = "XSVICYYDS"
BUILTIN_USERNAME = "XSVICYYDS@outlook.com"
BUILTIN_EMAIL = "XSVICYYDS@outlook.com"
BUILTIN_PASSWORD = "Xs@315207"
BUILTIN_ROLE = "super_admin"

# ========== 数据文件位置（与桌面端小白 auth/data 一致） ==========
AUTH_DATA_DIR = ROOT / "小白-源代码" / "auth" / "data"
USERS_FILE = AUTH_DATA_DIR / "users.json"
ROLES_FILE = AUTH_DATA_DIR / "user_roles.json"


def hash_password_pbkdf2(password: str) -> str:
    """与 PasswordManager.hash_password 完全一致的实现：salt$hex(pbkdf2_hmac) 格式"""
    salt = os.urandom(16).hex()
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    )
    return f"{salt}${derived.hex()}"


def _load_json(path: pathlib.Path, fallback):
    if not path.exists():
        return json.loads(json.dumps(fallback))
    with path.open("r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except Exception:
            return json.loads(json.dumps(fallback))


def _save_json(path: pathlib.Path, data) -> None:
    AUTH_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main() -> int:
    """主入口：幂等写入管理员账号/角色"""
    print(f"[SEED] 项目根目录 = {ROOT}")
    print(f"[SEED] auth 数据目录 = {AUTH_DATA_DIR}")
    users = _load_json(USERS_FILE, {})
    roles = _load_json(ROLES_FILE, {})

    # ---- 检查是否已经存在（按 email / username / nickname 任一匹配） ----
    existing_id: str | None = None
    for uid, u in users.items():
        username_ok = str(u.get("username", "")).strip().lower() == BUILTIN_USERNAME.strip().lower()
        email_ok = str(u.get("email", "")).strip().lower() == BUILTIN_EMAIL.strip().lower()
        nick_ok = str(u.get("nickname", "")).strip() == BUILTIN_NICKNAME.strip()
        if username_ok or email_ok or nick_ok:
            existing_id = uid
            break

    if existing_id is None:
        uid = str(uuid.uuid4())
        record = {
            "user_id": uid,
            "username": BUILTIN_USERNAME,
            "nickname": BUILTIN_NICKNAME,
            "email": BUILTIN_EMAIL,
            "password_hash": hash_password_pbkdf2(BUILTIN_PASSWORD),
            "created_at": datetime.utcnow().isoformat(),
            "status": "active",
        }
        users[uid] = record
        roles[uid] = [BUILTIN_ROLE]
        print(f"[SEED] ✅ 新建超级管理员: user_id={uid}  nickname={BUILTIN_NICKNAME}  email={BUILTIN_EMAIL}")
    else:
        user = users[existing_id]
        # 补齐 nickname（老版 users.json 可能没有）
        if not user.get("nickname"):
            user["nickname"] = BUILTIN_NICKNAME
            print(f"[SEED] +++ 补齐 nickname={BUILTIN_NICKNAME}")
        # 确保账号启用
        if str(user.get("status", "active")).lower() != "active":
            user["status"] = "active"
            print("[SEED] +++ 恢复账号状态为 active")
        # 确保 SUPER_ADMIN 角色
        current_roles = [r for r in roles.get(existing_id, []) if isinstance(r, str)]
        if BUILTIN_ROLE not in current_roles:
            # 去除老的 admin/vip/user/guest，头部放 super_admin，其它自定义角色保留
            filtered = [r for r in current_roles if r not in {"admin", "vip", "user", "guest"}]
            new_roles = [BUILTIN_ROLE, *filtered]
            roles[existing_id] = new_roles
            print(f"[SEED] +++ 补齐角色 SUPER_ADMIN（原={current_roles} → 新={new_roles}）")
        print(f"[SEED] ✅ 已存在超级管理员: user_id={existing_id}  nickname={user.get('nickname')}  email={user.get('email')}")

    _save_json(USERS_FILE, users)
    _save_json(ROLES_FILE, roles)
    print(f"[SEED] ✅ users.json 已写入 {USERS_FILE}  (entries={len(users)})")
    print(f"[SEED] ✅ user_roles.json 已写入 {ROLES_FILE} (entries={len(roles)})")

    # ---- 快速自检：用同样算法再 verify 一次密码哈希 ----
    just_saved = _load_json(USERS_FILE, {})
    target_uid = existing_id or uid
    saved_hash = just_saved[target_uid]["password_hash"]
    salt, hex_derived = saved_hash.split("$")
    recomputed = hashlib.pbkdf2_hmac(
        "sha256",
        BUILTIN_PASSWORD.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()
    if recomputed == hex_derived:
        print(f"[SEED] ✅ 密码哈希自检通过：登录时 邮箱={BUILTIN_EMAIL} / 昵称={BUILTIN_NICKNAME}  密码={BUILTIN_PASSWORD}")
    else:
        print("[SEED] ❌ 密码哈希自检失败（算法不一致）", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
