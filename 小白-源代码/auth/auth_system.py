"""
认证系统 - 统一整合类
小白桌面宠物的完整权限管理与登录系统
支持：
  - 内置超级管理员：XSVICYYDS / Xs@315207 / XSVICYYDS@outlook.com
  - 管理员功能：管理账号 / 管理权限（角色） / 管理版本 三大能力
  - 越权保护：普通用户无法改管理员，管理员无法改内置超级管理员的角色/状态
"""

import os
import json
import uuid
import re
import logging
from typing import Optional, Dict, Any, Callable, Tuple, List
from datetime import datetime, timedelta

from .core.password_manager import PasswordManager
from .core.jwt_manager import JWTManager
from .core.captcha_generator import CaptchaGenerator
from .core.rate_limiter import RateLimiter
from .core.email_verifier import EmailVerifier
from .rbac.permission_manager import PermissionManager
from .rbac.models import Role
from .storage.user_storage import UserStorage, PermissionStorage, AuditLogStorage
from .security import CSRFProtection, XSSProtection, InputValidator

logger = logging.getLogger(__name__)

# 内置超级管理员（硬编码保证永远存在、不可被越权修改角色/状态）
#  - 登录支持邮箱：XSVICYYDS@outlook.com
#  - 展示昵称 / 用户名：XSVICYYDS
#  - 登录密码：Xs@315207 （≥8 位，大小写 + 数字 + 特殊字符，满足强度规则）
_BUILTIN_SUPER_ADMIN: Dict[str, str] = {
    "nickname": "XSVICYYDS",
    "username": "XSVICYYDS@outlook.com",
    "email": "XSVICYYDS@outlook.com",
    "password": "Xs@315207",
}


class AuthSystem:
    """统一的认证系统类"""
    
    def __init__(self):
        # 核心组件
        self.password_manager = PasswordManager()
        self.jwt_manager = JWTManager()
        self.captcha_generator = CaptchaGenerator()
        self.rate_limiter = RateLimiter()
        self.email_verifier = EmailVerifier()
        
        # 权限管理
        self.permission_manager = PermissionManager()
        
        # 存储
        storage_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
        self.user_storage = UserStorage(storage_dir=storage_dir)
        self.permission_storage = PermissionStorage(storage_dir=storage_dir)
        self.audit_log_storage = AuditLogStorage(storage_dir=storage_dir)
        
        # 会话持久化：改成多用户会话池（sessions 目录 + profile 索引）
        #  - 单个会话：sessions/<user_id>.json （每个记住登录的用户独立保存）
        #  - 会话索引：profile_index.json 记录记住登录的 user_id 列表 + 最近活跃 user_id
        #  - 兼容老版本：若存在旧的 session_token.json 会被自动迁移到 sessions/
        self._sessions_dir = os.path.join(storage_dir, 'sessions')
        self._profile_index_file = os.path.join(storage_dir, 'profile_index.json')
        self._legacy_session_file = os.path.join(storage_dir, 'session_token.json')
        os.makedirs(self._sessions_dir, exist_ok=True)

        # 多会话：当前活跃 user_id；其余会话"已记住登录"但不占用当前槽位
        self._active_user_id: Optional[str] = None
        
        # 安全
        self.csrf_protection = CSRFProtection()
        self.xss_protection = XSSProtection()
        self.input_validator = InputValidator()
        
        # 当前用户状态
        self._current_token: Optional[str] = None
        self._current_user: Optional[Dict] = None
        
        # 事件回调
        self._on_login_callback: Optional[Callable] = None
        self._on_logout_callback: Optional[Callable] = None
        self._on_permission_change_callback: Optional[Callable] = None
        
        # 连续图形验证码失败计数（触发滑块验证）
        self._captcha_fail_count: Dict[str, int] = {}
        
        # 从存储加载权限
        self._load_saved_roles()
        
        # 默认演示用户
        self._init_demo_data()
    
    def _init_demo_data(self):
        """初始化演示数据 + 内置超级管理员（保证每次启动都存在）"""
        # 先确保内置超级管理员存在：XSVICYYDS / Xs@315207 / XSVICYYDS@outlook.com
        builtin_email = _BUILTIN_SUPER_ADMIN["email"].strip().lower()
        admin_by_email = self.user_storage.get_user_by_email(builtin_email)
        admin_by_uname = self.user_storage.get_user_by_username(_BUILTIN_SUPER_ADMIN["username"])
        if not admin_by_email and not admin_by_uname:
            admin_user_id = str(uuid.uuid4())
            pw_hash = self.password_manager.hash_password(_BUILTIN_SUPER_ADMIN["password"])
            self.user_storage.create_user(
                admin_user_id,
                _BUILTIN_SUPER_ADMIN["username"],
                builtin_email,
                pw_hash,
                nickname=_BUILTIN_SUPER_ADMIN["nickname"],
            )
            self.permission_manager.assign_role(admin_user_id, Role.SUPER_ADMIN)
            self.permission_storage.set_user_roles(admin_user_id, [Role.SUPER_ADMIN])
            logger.info(f"内置超级管理员已创建: user_id={admin_user_id} email={builtin_email}")
        else:
            # 已存在的内置管理员，确保分配到 SUPER_ADMIN 角色（防止之前误降到 admin/user）
            exist = admin_by_email or admin_by_uname
            uid = exist["user_id"]
            roles = self.permission_storage.get_user_roles(uid)
            if Role.SUPER_ADMIN not in roles:
                new_roles = [r for r in roles if r != Role.ADMIN and r != Role.VIP and r != Role.USER and r != Role.GUEST]
                new_roles.insert(0, Role.SUPER_ADMIN)
                self.permission_manager.set_user_roles(uid, new_roles)
                self.permission_storage.set_user_roles(uid, new_roles)
                logger.info(f"内置超级管理员角色已重置为 SUPER_ADMIN: user_id={uid}")

        # 演示用户（历史兼容保留）
        if not self.user_storage.get_user_by_username('demo'):
            demo_user_id = str(uuid.uuid4())
            password_hash = self.password_manager.hash_password('Demo123!')
            self.user_storage.create_user(demo_user_id, 'demo', 'demo@example.com', password_hash, nickname='演示用户')
            self.permission_manager.assign_role(demo_user_id, Role.USER)
            self.permission_storage.set_user_roles(demo_user_id, [Role.USER])
        
        if not self.user_storage.get_user_by_username('vip'):
            vip_user_id = str(uuid.uuid4())
            password_hash = self.password_manager.hash_password('Vip123!')
            self.user_storage.create_user(vip_user_id, 'vip', 'vip@example.com', password_hash, nickname='VIP会员')
            self.permission_manager.assign_role(vip_user_id, Role.VIP)
            self.permission_storage.set_user_roles(vip_user_id, [Role.VIP])
        
        if not self.user_storage.get_user_by_username('admin'):
            admin_user_id = str(uuid.uuid4())
            password_hash = self.password_manager.hash_password('Admin123!')
            self.user_storage.create_user(admin_user_id, 'admin', 'admin@example.com', password_hash, nickname='系统管理员')
            self.permission_manager.assign_role(admin_user_id, Role.ADMIN)
            self.permission_storage.set_user_roles(admin_user_id, [Role.ADMIN])
    
    def _load_saved_roles(self):
        """从存储加载用户角色"""
        for user in self.user_storage.get_all_users():
            user_id = user['user_id']
            saved_roles = self.permission_storage.get_user_roles(user_id)
            for role_id in saved_roles:
                self.permission_manager.assign_role(user_id, role_id)
    
    # ================= 严格输入校验方法 =================
    
    def _validate_nickname(self, nickname: str) -> Tuple[bool, str]:
        """校验昵称：2-20字符，去除首尾空格"""
        if not nickname:
            return False, "昵称不能为空"
        n = nickname.strip()
        if len(n) < 2:
            return False, "昵称至少需要2个字符"
        if len(n) > 20:
            return False, "昵称最多20个字符"
        return True, n
    
    def _validate_password_rules(self, pwd: str) -> Tuple[bool, str]:
        """严格密码规则：>=8位 + 大写 + 小写 + 数字"""
        if len(pwd) < 8:
            return False, "密码至少需要8个字符"
        if not re.search(r'[A-Z]', pwd):
            return False, "密码必须包含大写字母"
        if not re.search(r'[a-z]', pwd):
            return False, "密码必须包含小写字母"
        if not re.search(r'[0-9]', pwd):
            return False, "密码必须包含数字"
        return True, "密码强度符合要求"
    
    def _validate_email_format(self, email: str) -> Tuple[bool, str]:
        """邮箱格式正则校验"""
        pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email or ''):
            return False, "邮箱格式不正确"
        return True, email.strip().lower()
    
    def set_callbacks(self, on_login=None, on_logout=None, on_permission_change=None):
        """设置事件回调"""
        self._on_login_callback = on_login
        self._on_logout_callback = on_logout
        self._on_permission_change_callback = on_permission_change
    
    def generate_captcha(self) -> tuple[str, str, str]:
        """生成验证码"""
        return self.captcha_generator.generate()
    
    def verify_captcha(self, captcha_id: str, user_input: str) -> bool:
        """验证验证码"""
        return self.captcha_generator.verify(captcha_id, user_input)
    
    def register(self, nickname: str, email: str, email_code: str,
                 password: str, confirm_password: str,
                 captcha_id: str, captcha_input: str,
                 avatar: str = '') -> tuple[bool, str, Optional[str]]:
        """
        注册新用户（严格按需求校验顺序）
        Args:
            nickname: 昵称
            email: 邮箱
            email_code: 邮箱验证码
            password: 密码
            confirm_password: 确认密码
            captcha_id: 图形验证码ID
            captcha_input: 图形验证码输入
            avatar: 头像 Base64/Data URL 或本地路径（可选）
        Returns: (success, message, user_id)
        """
        # 1. 昵称校验
        ok, result = self._validate_nickname(nickname)
        if not ok:
            return False, result, None
        valid_nick = result
        # 2. 邮箱格式校验
        ok, result = self._validate_email_format(email)
        if not ok:
            return False, result, None
        valid_email = result
        # 3. 邮箱验证码校验（必须已通过 send_code 获取）
        ok, msg = self.email_verifier.verify_code(valid_email, email_code)
        if not ok:
            return False, msg, None
        # 4. 密码严格规则校验
        ok, msg = self._validate_password_rules(password)
        if not ok:
            return False, msg, None
        # 5. 两次密码一致校验
        if password != confirm_password:
            return False, "两次输入的密码不一致", None
        # 6. 图形验证码校验
        if not self.verify_captcha(captcha_id, captcha_input):
            return False, "图形验证码错误", None
        # 7. 用户去重校验
        if self.user_storage.get_user_by_email(valid_email):
            return False, "该邮箱已被注册", None
        # username 与 email 保持一致（因为登录仅支持邮箱）
        username = valid_email
        if self.user_storage.get_user_by_username(username):
            return False, "该邮箱已被注册", None
        # 创建用户（附带头像）
        user_id = str(uuid.uuid4())
        password_hash = self.password_manager.hash_password(password)
        self.user_storage.create_user(user_id, username, valid_email, password_hash, nickname=valid_nick, avatar=avatar)
        # 分配普通用户角色
        self.permission_manager.assign_role(user_id, Role.USER)
        self.permission_storage.set_user_roles(user_id, [Role.USER])
        # 记录日志
        self.audit_log_storage.add_log(user_id, 'register', f'用户 {valid_nick} 注册成功')
        logger.info(f"注册成功: user_id={user_id}, nickname={valid_nick}, email={valid_email}")
        return True, "注册成功", user_id
    
    def login(self, email: str, password: str, captcha_id: str, captcha_input: str,
              remember_me: bool = False, slider_passed: bool = False) -> tuple[bool, str, Optional[str]]:
        """
        登录（仅支持邮箱登录）
        Args:
            email: 邮箱
            password: 密码
            captcha_id: 图形验证码ID
            captcha_input: 用户输入的图形验证码
            remember_me: 是否记住登录状态（持久化会话）
            slider_passed: 是否已通过滑块验证（图形验证码错>=3次时需为True）
        Returns:
            (success, message, token, should_show_slider)
            四元组：第4个返回值标记是否应切换为滑块验证
        """
        # 频率限制
        allowed, remaining_time = self.rate_limiter.check_login_allowed(email)
        if not allowed:
            msg = self.rate_limiter.format_lockout_message(remaining_time)
            return False, msg, None, False
        # 判断该邮箱是否已触发滑块升级（阈值 2：fail_count>=2 时就切换到滑块模式）
        should_show_slider = self._captcha_fail_count.get(email, 0) >= 2
        if should_show_slider and not slider_passed:
            return False, "图形验证码错误次数过多，请先完成滑块拼图验证", None, True
        # 图形验证码校验：
        #   - 非滑块模式：必须输入正确图形验证码
        #   - 内部 SKIP 场景（注册成功后自动登录/重启恢复）：仅当失败计数为 0 时信任
        #   - 滑块模式下 slider_passed=True 即可跳过图形验证码
        captcha_skipped = (captcha_id == "SKIP" and captcha_input == "SKIP")
        if captcha_skipped and not should_show_slider:
            if self._captcha_fail_count.get(email, 0) > 0:
                return False, "请输入图形验证码", None, (self._captcha_fail_count.get(email, 0) >= 2)
        if not should_show_slider and not captcha_skipped:
            if not self.verify_captcha(captcha_id, captcha_input):
                self._captcha_fail_count[email] = self._captcha_fail_count.get(email, 0) + 1
                fail_count = self._captcha_fail_count[email]
                extra = f"（连续错误{fail_count}次，下一次将升级为滑块验证）" if fail_count >= 1 else ""
                return False, f"图形验证码错误{extra}", None, (fail_count >= 2)
        # 查找用户（支持邮箱、或昵称/用户名 XSVICYYDS 直接登录）
        user = (self.user_storage.get_user_by_email(email)
                or self.user_storage.get_user_by_username(email))
        if not user:
            # 额外兼容：输入 XSVICYYDS 昵称直接作为登录名
            for u in self.user_storage.get_all_users():
                if (u.get("nickname") or u.get("username") or "") == email.strip():
                    user = u
                    break
        if not user:
            return False, "邮箱或密码错误", None, should_show_slider
        # 禁用账号拦截（但内置 XSVICYYDS 超级管理员不会被 disable，这里作为双保险）
        if str(user.get("status", "active")).lower() != "active" and not self._is_builtin_super_admin(user):
            return False, "账号已被禁用，请联系管理员 XSVICYYDS", None, should_show_slider
        # 验证密码
        if not self.password_manager.verify_password(password, user['password_hash']):
            return False, "邮箱或密码错误", None, should_show_slider
        # 成功：重置失败计数
        self.rate_limiter.reset_login_attempts(email)
        self._captcha_fail_count[email] = 0
        # 生成 token
        token = self.jwt_manager.generate_token(
            user['user_id'],
            user['username'],
            self.permission_manager.get_user_roles(user['user_id'])[0]
        )
        # 更新当前用户
        self._current_token = token
        self._current_user = user
        # 记住登录：写入该用户独立的会话文件，不再覆盖其它人的会话
        if remember_me:
            self._save_session(email, token, user_id=user['user_id'])
        # 日志 + 回调
        self.audit_log_storage.add_log(user['user_id'], 'login', f'用户 {user.get("nickname") or user["username"]} 登录成功')
        if self._on_login_callback:
            self._on_login_callback(user, token)
        return True, "登录成功", token, False
    
    def _read_profile_index(self) -> Dict[str, Any]:
        """读取会话索引（记住登录的 user_id 列表 + 最近活跃 user_id）；不存在则返回空结构"""
        try:
            if not os.path.exists(self._profile_index_file):
                return {"saved_user_ids": [], "last_active_user_id": None}
            with open(self._profile_index_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            data.setdefault("saved_user_ids", [])
            data.setdefault("last_active_user_id", None)
            return data
        except Exception as e:
            logger.warning(f"读取会话索引失败，忽略：{e}")
            return {"saved_user_ids": [], "last_active_user_id": None}

    def _write_profile_index(self, data: Dict[str, Any]) -> None:
        """写回会话索引（原子性覆盖写）"""
        try:
            folder = os.path.dirname(self._profile_index_file)
            if folder:
                os.makedirs(folder, exist_ok=True)
            with open(self._profile_index_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"写回会话索引失败: {e}")

    def _session_file_for(self, user_id: str) -> str:
        """返回某个 user_id 的独立会话文件路径"""
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in user_id) or "unknown"
        return os.path.join(self._sessions_dir, f"{safe}.json")

    def _save_session(self, email: str, token: str, user_id: Optional[str] = None):
        """
        把会话信息持久化到 <user_id>.json，并把 user_id 记录到 profile_index.saved_user_ids，
        同时更新 last_active_user_id；因此多人可以分别记住登录，不会互相覆盖。
        在会话里保存 nickname / avatar 快照，方便托盘/窗口快速展示。
        """
        try:
            import base64 as _base64_mod
            import time as _time

            # 如果没传 user_id，尝试从 token payload 或 email 反查
            if not user_id:
                payload = self.jwt_manager.verify_token(token) or {}
                user_id = payload.get('sub')
            if not user_id:
                found = self.user_storage.get_user_by_email(email) or self.user_storage.get_user_by_username(email)
                if found:
                    user_id = found.get('user_id')
            if not user_id:
                logger.warning("无法定位 user_id，跳过多会话持久化")
                return

            # 反查用户表，读取展示名和头像快照（用于切换账号菜单显示）
            user = self.user_storage.get_user(user_id) if user_id else None
            if not user:
                user = self.user_storage.get_user_by_email(email) or self.user_storage.get_user_by_username(email)
            nickname_snap = (user or {}).get('nickname') or (user or {}).get('username') or email
            avatar_snap = (user or {}).get('avatar') or ''

            payload = self.jwt_manager.verify_token(token) or {}
            exp = payload.get('exp')
            if not exp:
                try:
                    parts = token.split('.')
                    if len(parts) == 3:
                        payload_b64 = parts[1] + '=' * (-len(parts[1]) % 4)
                        exp = json.loads(_base64_mod.urlsafe_b64decode(payload_b64).decode('utf-8')).get('exp')
                except Exception:
                    exp = None
            session = {
                "email": email,
                "token": token,
                "expires_at": exp,
                "user_id": user_id,
                "nickname": nickname_snap,
                "avatar": avatar_snap,
                "logged_in_at": int(_time.time()),
            }

            file_path = self._session_file_for(user_id)
            os.makedirs(self._sessions_dir, exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(session, f, ensure_ascii=False, indent=2)

            # 更新索引：加入 saved_user_ids + 标记 last_active
            index = self._read_profile_index()
            if user_id not in index["saved_user_ids"]:
                index["saved_user_ids"].append(user_id)
            index["last_active_user_id"] = user_id
            self._write_profile_index(index)

            self._active_user_id = user_id
            logger.info(f"用户 {user_id} 会话已持久化到 {file_path}（不再影响其他已记住登录的账号）")
        except Exception as e:
            logger.warning(f"保存多会话失败: {e}")

    def _migrate_legacy_session_if_needed(self) -> None:
        """如果存在老的单会话 session_token.json，迁到 sessions/ 下并删除旧文件"""
        if not os.path.exists(self._legacy_session_file):
            return
        try:
            with open(self._legacy_session_file, 'r', encoding='utf-8') as f:
                legacy = json.load(f)
            token = legacy.get('token')
            email = legacy.get('email')
            if not token:
                os.remove(self._legacy_session_file)
                return
            # 反查 user_id
            user_id: Optional[str] = None
            payload = self.jwt_manager.verify_token(token) or {}
            if payload.get('sub'):
                user_id = payload['sub']
            if not user_id and email:
                found = self.user_storage.get_user_by_email(email) or self.user_storage.get_user_by_username(email)
                if found:
                    user_id = found.get('user_id')
            if user_id:
                dst = self._session_file_for(user_id)
                with open(dst, 'w', encoding='utf-8') as f:
                    json.dump({**legacy, "user_id": user_id}, f, ensure_ascii=False, indent=2)
                index = self._read_profile_index()
                if user_id not in index["saved_user_ids"]:
                    index["saved_user_ids"].append(user_id)
                index.setdefault("last_active_user_id", user_id)
                self._write_profile_index(index)
                logger.info(f"旧会话迁移完成：{email} -> user_id={user_id}")
            os.remove(self._legacy_session_file)
        except Exception as e:
            logger.warning(f"旧会话迁移异常（忽略）: {e}")
    
    def auto_restore_login(self, target_user_id: Optional[str] = None) -> bool:
        """
        启动时从多会话池恢复登录态：
        - 若指定 target_user_id（--profile 参数），优先恢复该用户
        - 否则恢复 last_active_user_id（最近使用过的用户）
        - 自动迁移老版本单会话文件
        """
        self._migrate_legacy_session_if_needed()
        index = self._read_profile_index()

        # 优先顺序：显式指定 > 最近活跃 > 无会话
        candidate = target_user_id or index.get("last_active_user_id")
        if not candidate:
            return False
        file_path = self._session_file_for(candidate)
        if not os.path.exists(file_path):
            # 无效记录：清理索引
            saved = [u for u in index.get("saved_user_ids", []) if u != candidate]
            index["saved_user_ids"] = saved
            if index.get("last_active_user_id") == candidate:
                index["last_active_user_id"] = saved[-1] if saved else None
            self._write_profile_index(index)
            return False
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                session = json.load(f)
            token = session.get("token")
            if not token:
                os.remove(file_path)
                return False
            payload = self.jwt_manager.verify_token(token)
            if not payload:
                os.remove(file_path)
                logger.info(f"用户 {candidate} 的 token 已过期，已删除会话文件")
                # 移除出索引
                saved = [u for u in index.get("saved_user_ids", []) if u != candidate]
                index["saved_user_ids"] = saved
                if index.get("last_active_user_id") == candidate:
                    index["last_active_user_id"] = saved[-1] if saved else None
                self._write_profile_index(index)
                return False
            user_id = payload.get("sub") or session.get("user_id") or candidate
            user = self.user_storage.get_user(user_id)
            if not user:
                os.remove(file_path)
                return False
            self._current_token = token
            self._current_user = user
            self._active_user_id = user_id
            # 刷新 last_active
            index["last_active_user_id"] = user_id
            self._write_profile_index(index)
            logger.info(f"多会话自动恢复成功: 用户 {user.get('nickname') or user['username']}（user_id={user_id}）")
            return True
        except Exception as e:
            logger.warning(f"多会话恢复登录异常: {e}")
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except:
                pass
            return False

    def list_saved_profiles(self) -> List[Dict[str, Any]]:
        """
        返回已记住登录的用户档案列表（用于切换用户界面）
        返回：[{user_id, nickname, email, last_active, is_active}]
        """
        self._migrate_legacy_session_if_needed()
        index = self._read_profile_index()
        last_active = index.get("last_active_user_id")
        out: List[Dict[str, Any]] = []
        for uid in index.get("saved_user_ids", []):
            user = self.user_storage.get_user(uid)
            if not user:
                # 清理无效记录
                continue
            # 仅在会话文件存在时才算"已记住登录"
            if not os.path.exists(self._session_file_for(uid)):
                continue
            out.append({
                "user_id": uid,
                "nickname": user.get("nickname") or user.get("username") or "用户",
                "email": user.get("email") or user.get("username") or "",
                "last_active": last_active == uid,
                "is_active": self._active_user_id == uid or (self._current_user and self._current_user.get('user_id') == uid),
            })
        return out

    def switch_profile(self, user_id: str) -> Tuple[bool, str]:
        """
        切换到另一个已记住登录的用户档案（无需重新输入密码）
        这样 A 登录过、B 也登录过以后，在同一台电脑能一键切换互不影响。
        """
        if not user_id:
            return False, "目标用户为空"
        if self._current_user and self._current_user.get('user_id') == user_id:
            return True, "已在该账号下"
        file_path = self._session_file_for(user_id)
        if not os.path.exists(file_path):
            return False, "该账号尚未在本机记住登录，需要先登录一次"
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                session = json.load(f)
            token = session.get("token")
            if not token:
                return False, "会话文件损坏，请重新登录"
            payload = self.jwt_manager.verify_token(token)
            if not payload:
                os.remove(file_path)
                index = self._read_profile_index()
                saved = [u for u in index.get("saved_user_ids", []) if u != user_id]
                index["saved_user_ids"] = saved
                self._write_profile_index(index)
                return False, "该账号的会话已过期，请重新登录"
            user = self.user_storage.get_user(user_id)
            if not user:
                return False, "该账号不存在"
            # 切换：更新 current + last_active + active_user_id
            self._current_token = token
            self._current_user = user
            self._active_user_id = user_id
            index = self._read_profile_index()
            index["last_active_user_id"] = user_id
            self._write_profile_index(index)
            self.audit_log_storage.add_log(user_id, 'profile.switch',
                                           f"切换到账号 {user.get('nickname') or user.get('username')}")
            if self._on_login_callback:
                self._on_login_callback(user, token)
            logger.info(f"已切换到用户档案：{user.get('nickname') or user['username']}（user_id={user_id}）")
            return True, "切换成功"
        except Exception as e:
            logger.warning(f"切换档案失败: {e}")
            return False, f"切换失败：{e}"

    def get_active_profile_id(self) -> Optional[str]:
        """返回当前活跃 user_id（供 StateManager / Config 切分 profile 目录使用）"""
        if self._active_user_id:
            return self._active_user_id
        if self._current_user:
            return self._current_user.get('user_id')
        return None

    def logout_profile(self, user_id: Optional[str] = None) -> None:
        """
        登出某个用户档案；不传 user_id 则登出当前活跃用户。
        其它已记住登录的档案不会被影响。
        """
        target = user_id or (self._current_user.get('user_id') if self._current_user else None)
        index = self._read_profile_index()
        saved = list(index.get("saved_user_ids", []))

        if target and target in saved:
            saved.remove(target)
            index["saved_user_ids"] = saved
            try:
                fp = self._session_file_for(target)
                if os.path.exists(fp):
                    os.remove(fp)
            except Exception as e:
                logger.warning(f"删除会话文件失败 {target}: {e}")

        # 如果删掉的是 last_active，就回填最后一个
        if index.get("last_active_user_id") == target:
            index["last_active_user_id"] = saved[-1] if saved else None
        self._write_profile_index(index)

        # 如果 target == 当前活跃用户 → 重置 current_*
        if (not user_id) or (self._current_user and self._current_user.get('user_id') == target):
            if self._current_user:
                uid = self._current_user['user_id']
                uname = self._current_user.get('nickname') or self._current_user['username']
                self.audit_log_storage.add_log(uid, 'logout', f'用户 {uname} 登出')
            self._current_token = None
            self._current_user = None
            self._active_user_id = index.get("last_active_user_id")
            if self._on_logout_callback:
                self._on_logout_callback()

    def logout(self):
        """登出当前活跃用户（不影响其它已记住登录的档案）— 兼容旧调用方式"""
        self.logout_profile(None)
    
    # ================= 便捷展示方法 =================
    
    def get_current_display_name(self) -> str:
        """获取当前用户的展示昵称（未登录返回「访客」）"""
        if not self._current_user:
            return "访客"
        return self._current_user.get("nickname") or self._current_user.get("username") or "用户"
    
    def get_current_user(self) -> Optional[Dict]:
        """获取当前用户（保证返回带 nickname）"""
        user = self._current_user
        if user and "nickname" not in user:
            user["nickname"] = user.get("username", "用户")
        return user
    
    def validate_token(self, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """验证token"""
        if token is None:
            token = self._current_token
        
        if not token:
            return None
        
        payload = self.jwt_manager.verify_token(token)
        if payload:
            # 更新当前用户
            user = self.user_storage.get_user(payload['sub'])
            if user:
                self._current_token = token
                self._current_user = user
            return payload
        
        return None
    
    def refresh_token(self) -> Optional[str]:
        """刷新token"""
        if not self._current_token:
            return None
        
        new_token = self.jwt_manager.refresh_token(self._current_token)
        if new_token:
            self._current_token = new_token
        return new_token
    
    def activate_vip(self, activation_code: str) -> tuple[bool, str]:
        """激活VIP"""
        if not self._current_user:
            return False, "请先登录"
        
        # 验证激活码格式
        valid, msg = self.input_validator.validate_activation_code(activation_code)
        if not valid:
            return False, msg
        
        # 简化的激活码验证（演示用）
        # 实际项目中应该验证真实的激活码
        if activation_code.upper().startswith('VIP'):
            user_id = self._current_user['user_id']
            
            # 分配VIP角色
            self.permission_manager.assign_role(user_id, Role.VIP)
            
            # 保存到存储
            current_roles = self.permission_storage.get_user_roles(user_id)
            if Role.VIP not in current_roles:
                current_roles.append(Role.VIP)
            self.permission_storage.set_user_roles(user_id, current_roles)
            
            # 记录日志
            self.audit_log_storage.add_log(user_id, 'vip_activate', f'用户 {self._current_user["username"]} 激活VIP成功')
            
            # 回调权限变更
            if self._on_permission_change_callback:
                self._on_permission_change_callback()
            
            return True, "VIP激活成功"
        
        return False, "无效的激活码（演示：输入以VIP开头的16位码）"
    
    def has_permission(self, permission_id: str) -> bool:
        """检查当前用户是否有权限"""
        if not self._current_user:
            user_id = 'guest'
        else:
            user_id = self._current_user['user_id']
        
        return self.permission_manager.has_permission(user_id, permission_id)
    
    def has_role(self, role_id: str) -> bool:
        """检查当前用户是否有角色"""
        if not self._current_user:
            user_id = 'guest'
        else:
            user_id = self._current_user['user_id']
        
        return self.permission_manager.has_role_or_higher(user_id, role_id)
    
    def is_logged_in(self) -> bool:
        """检查是否已登录"""
        return self._current_user is not None
    
    def is_vip(self) -> bool:
        """检查是否是VIP"""
        if not self._current_user:
            return False
        return self.permission_manager.is_vip(self._current_user['user_id'])
    
    def is_admin(self) -> bool:
        """检查是否是管理员"""
        if not self._current_user:
            return False
        return self.permission_manager.is_admin(self._current_user['user_id'])
    
    def get_current_user(self) -> Optional[Dict]:
        """获取当前用户（确保含 avatar 字段，旧数据自动补空串）"""
        u = self._current_user
        if u and 'avatar' not in u:
            u['avatar'] = ''
        return u

    def get_current_avatar(self) -> str:
        """获取当前头像（Base64/Data URL 或空串）"""
        u = self.get_current_user()
        return (u or {}).get('avatar') or ''

    def update_current_user_avatar(self, avatar_data_url_or_path: str) -> tuple[bool, str]:
        """
        更新当前登录用户的头像
        Args:
            avatar_data_url_or_path: Base64 Data URL、本地文件路径，或空串（清除头像）
        Returns:
            (success, message)
        """
        if not self._current_user:
            return False, "请先登录"
        uid = self._current_user.get('user_id')
        if not uid:
            return False, "当前用户缺少 user_id"
        cleaned = (avatar_data_url_or_path or '').strip()
        self.user_storage.update_user(uid, avatar=cleaned)
        # 同步内存里的 current user
        self._current_user['avatar'] = cleaned
        # 同步会话文件里的头像快照（切换账号菜单展示）
        sess_file = self._session_file_for(uid)
        try:
            if os.path.exists(sess_file):
                with open(sess_file, 'r', encoding='utf-8') as f:
                    sess = json.load(f)
                sess['avatar'] = cleaned
                if 'nickname' not in sess or not sess['nickname']:
                    sess['nickname'] = self.get_current_display_name()
                with open(sess_file, 'w', encoding='utf-8') as f:
                    json.dump(sess, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"同步会话头像快照失败（可忽略）: {e}")
        logger.info(f"用户 {uid} 头像已更新")
        return True, "头像已更新"

    def list_saved_sessions(self) -> list:
        """
        列出所有「已记住登录」的账号会话（供切换账号菜单使用）
        返回按 logged_in_at 倒序：
        [{"user_id","email","nickname","avatar","logged_in_at","is_active"}, ...]
        """
        index = self._read_profile_index()
        out: list = []
        active_uid = self._active_user_id or index.get("last_active_user_id")
        for uid in list(index.get("saved_user_ids") or []):
            fpath = self._session_file_for(uid)
            if not os.path.exists(fpath):
                continue
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    sess = json.load(f)
            except Exception:
                continue
            entry = {
                "user_id": sess.get("user_id") or uid,
                "email": sess.get("email") or "",
                "nickname": sess.get("nickname") or "",
                "avatar": sess.get("avatar") or "",
                "logged_in_at": sess.get("logged_in_at") or 0,
                "is_active": (sess.get("user_id") or uid) == active_uid,
            }
            # 若会话里没有昵称/头像，尝试从用户表补齐并写回
            if not entry["nickname"] or not entry["avatar"]:
                u = self.user_storage.get_user(entry["user_id"]) if entry["user_id"] else None
                if u:
                    if not entry["nickname"]:
                        entry["nickname"] = u.get("nickname") or u.get("username") or entry["email"]
                        sess["nickname"] = entry["nickname"]
                    if not entry["avatar"]:
                        entry["avatar"] = u.get("avatar") or ""
                        sess["avatar"] = entry["avatar"]
                    try:
                        with open(fpath, 'w', encoding='utf-8') as f_:
                            json.dump(sess, f_, ensure_ascii=False, indent=2)
                    except Exception:
                        pass
            out.append(entry)
        out.sort(key=lambda it: int(it.get("logged_in_at") or 0), reverse=True)
        return out

    def switch_profile(self, user_id: str) -> tuple[bool, str]:
        """
        切换到另一个「已记住登录」的账号档案（无需重新输入密码）
        会同步刷新：当前 token / 当前用户 / active_user_id / 状态档案 / 配置档案
        """
        if not user_id:
            return False, "未指定 user_id"
        if self._active_user_id and self._active_user_id == user_id:
            return True, "已经是当前账号"
        fpath = self._session_file_for(user_id)
        if not os.path.exists(fpath):
            return False, "该账号会话不存在或已被移除"
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                sess = json.load(f)
        except Exception as e:
            return False, f"读取会话失败：{e}"
        token = sess.get("token")
        if not token:
            return False, "该账号会话已失效，请重新登录"
        payload = self.jwt_manager.verify_token(token)
        if not payload:
            return False, "该账号登录已过期，请重新登录"
        uid = payload.get("sub") or sess.get("user_id")
        if not uid:
            return False, "该账号会话缺少用户标识"
        user = self.user_storage.get_user(uid)
        if not user:
            return False, "该账号不存在或已被删除"
        # 更新内存态
        self._current_token = token
        self._current_user = user
        self._active_user_id = uid
        # 更新索引：最近活跃账号
        index = self._read_profile_index()
        if uid not in index["saved_user_ids"]:
            index["saved_user_ids"].append(uid)
        index["last_active_user_id"] = uid
        self._write_profile_index(index)
        logger.info(f"已切换账号 -> user_id={uid}")
        return True, "切换成功"
    
    def get_current_user_roles(self) -> list:
        """获取当前用户角色"""
        if not self._current_user:
            return [Role.GUEST]
        return self.permission_manager.get_user_roles(self._current_user['user_id'])
    
    def get_current_user_permissions(self) -> set:
        """获取当前用户权限"""
        if not self._current_user:
            user_id = 'guest'
        else:
            user_id = self._current_user['user_id']
        return self.permission_manager.get_user_permissions(user_id)
    
    def log_action(self, action: str, details: str = ''):
        """记录操作日志"""
        if self._current_user:
            self.audit_log_storage.add_log(self._current_user['user_id'], action, details)
        else:
            self.audit_log_storage.add_log('guest', action, details)
    
    def get_audit_logs(self, limit: int = 100) -> list:
        """获取审计日志"""
        return self.audit_log_storage.get_logs(limit)
    
    def get_all_users(self) -> list:
        """获取所有用户（管理员用）"""
        if not self.is_admin():
            return []
        return self.user_storage.get_all_users()

    # ================= 管理员功能：账号 / 权限 / 版本 =================

    def _is_builtin_super_admin(self, user_or_id: Any) -> bool:
        """判断某用户是否是内置超级管理员 XSVICYYDS（按 user_id/username/email 任一匹配都算）"""
        if user_or_id is None:
            return False
        if isinstance(user_or_id, str):
            uid = user_or_id
            user = self.user_storage.get_user(uid)
            if user is None:
                # 可能直接用 username / email 传进来
                user = self.user_storage.get_user_by_username(uid) or self.user_storage.get_user_by_email(uid)
        else:
            user = user_or_id
        if not user:
            return False
        email_ok = str(user.get("email", "")).strip().lower() == _BUILTIN_SUPER_ADMIN["email"].strip().lower()
        uname_ok = str(user.get("username", "")).strip().lower() == _BUILTIN_SUPER_ADMIN["username"].strip().lower()
        nick_ok = str(user.get("nickname", "")).strip() == _BUILTIN_SUPER_ADMIN["nickname"].strip()
        return email_ok or uname_ok or nick_ok

    def _current_user_highest_level(self) -> int:
        """返回当前登录用户的最高角色等级（0 最低）"""
        if not self._current_user:
            return 0
        from .rbac.feature_definitions import FeatureDefinitions  # 局部导入，避免循环依赖
        hierarchy = FeatureDefinitions.get_role_hierarchy()
        return max([hierarchy.get(r, 0) for r in self.get_current_user_roles()] or [0])

    def _require_admin(self, *, need_super: bool = False, target_user_id: Optional[str] = None,
                       protect_builtin: bool = True) -> Tuple[bool, str]:
        """
        统一越权保护（与 1249413 经验一致：RBAC 三元组——操作者 + 目标 + 操作）
        Args:
            need_super: True 时要求必须 SUPER_ADMIN
            target_user_id: 目标用户，为空时只检查操作者
            protect_builtin: True 时内置 SUPER_ADMIN（XSVICYYDS）任何人均不可变更其角色/状态（防止越权）
        Returns: (ok, message)
        """
        if not self._current_user:
            return False, "未登录"
        current_level = self._current_user_highest_level()
        if need_super and current_level < FeatureDefinitions.get_role_hierarchy()[Role.SUPER_ADMIN]:
            return False, "该操作仅允许 SUPER_ADMIN（XSVICYYDS）执行"
        if current_level < FeatureDefinitions.get_role_hierarchy()[Role.ADMIN]:
            return False, "该操作仅允许管理员执行"
        if target_user_id and protect_builtin:
            if self._is_builtin_super_admin(target_user_id):
                # 内置 XSVICYYDS：只有自己（SUPER_ADMIN）才能改自己的密码；其它任何写操作都禁止
                if need_super and self._current_user["user_id"] != target_user_id:
                    return False, "禁止修改内置超级管理员（XSVICYYDS）的角色/状态"
                if not need_super:
                    # 其它管理员写操作一律拦截
                    return False, "禁止修改内置超级管理员（XSVICYYDS）的账号/角色/状态"
        return True, "权限通过"

    def admin_list_users(self) -> List[Dict[str, Any]]:
        """【管理账号】管理员查看所有用户（含角色、创建时间）"""
        ok, _ = self._require_admin()
        if not ok:
            return []
        rows = []
        for user in self.user_storage.get_all_users():
            roles = self.permission_storage.get_user_roles(user["user_id"])
            rows.append({
                "user_id": user["user_id"],
                "nickname": user.get("nickname") or user.get("username"),
                "username": user.get("username"),
                "email": user.get("email"),
                "status": user.get("status", "active"),
                "roles": roles,
                "highest_role": (roles or ["guest"])[0],
                "created_at": user.get("created_at"),
                "is_builtin_super_admin": self._is_builtin_super_admin(user["user_id"]),
            })
        rows.sort(key=lambda x: (0 if x["is_builtin_super_admin"] else 1,
                                 FeatureDefinitions.get_role_hierarchy().get(x["highest_role"], 0)),
                  reverse=True)
        return rows

    def admin_update_user_role(self, target_user_id: str, new_role_id: str) -> Tuple[bool, str]:
        """【管理权限】管理员调整目标用户的角色（严格越权保护）"""
        # 1. 操作者身份：需要 SUPER_ADMIN 才能授予 SUPER_ADMIN；其它角色需要至少 ADMIN
        need_super = new_role_id == Role.SUPER_ADMIN
        ok, msg = self._require_admin(need_super=need_super, target_user_id=target_user_id)
        if not ok:
            return False, msg
        # 2. 校验目标角色合法
        if new_role_id not in {Role.GUEST, Role.USER, Role.VIP, Role.ADMIN, Role.SUPER_ADMIN}:
            return False, f"未知角色: {new_role_id}"
        # 3. 目标必须存在
        target = self.user_storage.get_user(target_user_id)
        if not target:
            return False, "目标用户不存在"
        # 4. 非 SUPER_ADMIN 操作者不得把目标提到 ADMIN 或更高
        if self._current_user_highest_level() < FeatureDefinitions.get_role_hierarchy()[Role.SUPER_ADMIN]:
            if new_role_id in {Role.ADMIN, Role.SUPER_ADMIN}:
                return False, "仅 SUPER_ADMIN（XSVICYYDS）可授予管理员及更高角色"
        # 5. 写入：使用单元素角色数组（简化；多角色不暴露在 UI）
        self.permission_manager.set_user_roles(target_user_id, [new_role_id])
        self.permission_storage.set_user_roles(target_user_id, [new_role_id])
        self.audit_log_storage.add_log(
            self._current_user["user_id"], "admin.role.update",
            f"{self._current_user.get('nickname') or self._current_user['username']} "
            f"将 {target.get('nickname') or target['username']} 的角色改为 {new_role_id}"
        )
        if self._on_permission_change_callback:
            self._on_permission_change_callback()
        return True, "角色更新成功"

    def admin_reset_user_password(self, target_user_id: str, new_password: str) -> Tuple[bool, str]:
        """【管理账号】管理员重置任意非内置用户密码；XSVICYYDS 本人可重置自己密码"""
        ok, _ = self._require_admin()
        if not ok:
            return False, "未登录或无管理员权限"
        target = self.user_storage.get_user(target_user_id)
        if not target:
            return False, "目标用户不存在"
        if self._is_builtin_super_admin(target_user_id) and self._current_user["user_id"] != target_user_id:
            return False, "其它管理员不得重置内置超级管理员（XSVICYYDS）的密码"
        # 严格密码规则复用注册校验
        ok, msg = self._validate_password_rules(new_password)
        if not ok:
            return False, msg
        pw_hash = self.password_manager.hash_password(new_password)
        self.user_storage.update_user(target_user_id, password_hash=pw_hash)
        self.audit_log_storage.add_log(
            self._current_user["user_id"], "admin.password.reset",
            f"{self._current_user.get('nickname') or self._current_user['username']} 重置了 "
            f"{target.get('nickname') or target['username']} 的密码"
        )
        return True, "密码已重置"

    def admin_set_user_status(self, target_user_id: str, disabled: bool) -> Tuple[bool, str]:
        """【管理账号】禁用/启用账号（内置 XSVICYYDS 禁止禁用）"""
        ok, msg = self._require_admin(target_user_id=target_user_id)
        if not ok:
            return False, msg
        target = self.user_storage.get_user(target_user_id)
        if not target:
            return False, "目标用户不存在"
        if self._current_user_highest_level() < FeatureDefinitions.get_role_hierarchy()[Role.SUPER_ADMIN]:
            target_role = self.permission_storage.get_user_roles(target_user_id)
            if Role.ADMIN in target_role or Role.SUPER_ADMIN in target_role:
                return False, "非 SUPER_ADMIN 不得禁用/启用其它管理员账号"
        new_status = "disabled" if disabled else "active"
        self.user_storage.update_user(target_user_id, status=new_status)
        self.audit_log_storage.add_log(
            self._current_user["user_id"], "admin.user.status",
            f"{self._current_user.get('nickname') or self._current_user['username']} "
            f"将 {target.get('nickname') or target['username']} 账号状态改为 {new_status}"
        )
        if self._current_user and self._current_user["user_id"] == target_user_id and disabled:
            # 禁用自己则立即登出
            self.logout()
        return True, "账号状态已更新"

    def admin_delete_user(self, target_user_id: str) -> Tuple[bool, str]:
        """【管理账号】删除账号（内置 XSVICYYDS 禁止删除）"""
        ok, msg = self._require_admin(target_user_id=target_user_id)
        if not ok:
            return False, msg
        target = self.user_storage.get_user(target_user_id)
        if not target:
            return False, "目标用户不存在"
        if self._current_user and self._current_user["user_id"] == target_user_id:
            return False, "不允许删除当前登录账号"
        if self._current_user_highest_level() < FeatureDefinitions.get_role_hierarchy()[Role.SUPER_ADMIN]:
            target_role = self.permission_storage.get_user_roles(target_user_id)
            if Role.ADMIN in target_role or Role.SUPER_ADMIN in target_role:
                return False, "非 SUPER_ADMIN 不得删除其它管理员账号"
        self.user_storage.delete_user(target_user_id)
        try:
            self.permission_storage.set_user_roles(target_user_id, [])
        except Exception:
            pass
        self.audit_log_storage.add_log(
            self._current_user["user_id"], "admin.user.delete",
            f"{self._current_user.get('nickname') or self._current_user['username']} "
            f"删除了用户 {target.get('nickname') or target['username']}"
        )
        return True, "用户已删除"

    def admin_list_roles_matrix(self) -> Dict[str, Any]:
        """【管理权限】返回角色→权限矩阵（前端直接渲染表格）"""
        ok, _ = self._require_admin()
        if not ok:
            return {"roles": [], "permissions": [], "matrix": {}}
        from .rbac.feature_definitions import FeatureDefinitions
        roles = FeatureDefinitions.get_all_roles()
        perms = FeatureDefinitions.get_all_permissions()
        role_perm_map = FeatureDefinitions.get_role_permissions_map()
        matrix: Dict[str, List[str]] = {}
        for r in roles:
            matrix[r.role_id] = list(role_perm_map.get(r.role_id, set()))
        return {
            "roles": [r.to_dict() for r in roles],
            "permissions": [p.to_dict() for p in perms],
            "matrix": matrix,
            "hierarchy": FeatureDefinitions.get_role_hierarchy(),
        }

    def admin_list_versions(self) -> List[Dict[str, Any]]:
        """【管理版本】返回版本发布清单（静态清单，用于管理控制台 Tab 展示）"""
        ok, msg = self._require_admin(need_super=False)
        if not ok:
            return []
        return [
            {
                "tag": "v0.4.43",
                "title": "小白 v0.4.43 稳定版",
                "summary": "新增安装包制作流程、桌面动画 20 种、游戏 10 款、系统托盘快捷工具。",
                "released_at": "2026-06-20T10:00:00+08:00",
                "github_url": "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/tag/v0.4.43",
                "canary": False,
            },
            {
                "tag": "v0.6.0",
                "title": "小白 v0.6.0 管理能力版",
                "summary": "新增登录/注册中心（拼图容差 15px / 真人验证前置）、内置 SUPER_ADMIN XSVICYYDS、"
                           "管理员三大控制台（管理账号 / 管理权限 / 管理版本）。",
                "released_at": "2026-07-30T09:30:00+08:00",
                "github_url": "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/tag/v0.6.0",
                "canary": False,
            },
            {
                "tag": "v0.7.0-dev",
                "title": "小白 v0.7.0 开发版（预览）",
                "summary": "开发版：云端账号同步、游戏得分排行、AI 对话历史聚合、管理员批量发送邮件通知（待发布）。",
                "released_at": "",
                "github_url": "",
                "canary": True,
            },
        ]


# 单例实例
_auth_system_instance: Optional[AuthSystem] = None


def get_auth_system() -> AuthSystem:
    """获取认证系统单例"""
    global _auth_system_instance
    if _auth_system_instance is None:
        _auth_system_instance = AuthSystem()
    return _auth_system_instance
