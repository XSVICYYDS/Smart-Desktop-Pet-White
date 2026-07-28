"""
认证系统 - 统一整合类
小白桌面宠物的完整权限管理与登录系统
"""

import os
import json
import uuid
import re
import logging
from typing import Optional, Dict, Any, Callable, Tuple
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
        
        # 会话持久化文件
        self._session_file = os.path.join(storage_dir, 'session_token.json')
        
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
        """初始化演示数据"""
        # 检查是否已有用户
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
                 captcha_id: str, captcha_input: str) -> tuple[bool, str, Optional[str]]:
        """
        注册新用户（严格按需求校验顺序）
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
        # 创建用户
        user_id = str(uuid.uuid4())
        password_hash = self.password_manager.hash_password(password)
        self.user_storage.create_user(user_id, username, valid_email, password_hash, nickname=valid_nick)
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
        # 查找用户（邮箱）
        user = self.user_storage.get_user_by_email(email)
        if not user:
            return False, "邮箱或密码错误", None, should_show_slider
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
        # 记住登录：写入会话文件
        if remember_me:
            self._save_session(email, token)
        # 日志 + 回调
        self.audit_log_storage.add_log(user['user_id'], 'login', f'用户 {user.get("nickname") or user["username"]} 登录成功')
        if self._on_login_callback:
            self._on_login_callback(user, token)
        return True, "登录成功", token, False
    
    def _save_session(self, email: str, token: str):
        """把会话信息持久化到本地 JSON 文件"""
        try:
            import json as _json_mod
            import os as _os_mod
            import base64 as _base64_mod

            payload = self.jwt_manager.verify_token(token) or {}
            exp = payload.get('exp')
            if not exp:
                try:
                    parts = token.split('.')
                    if len(parts) == 3:
                        payload_b64 = parts[1] + '=' * (-len(parts[1]) % 4)
                        exp = _json_mod.loads(_base64_mod.urlsafe_b64decode(payload_b64).decode('utf-8')).get('exp')
                except Exception:
                    exp = None
            session = {"email": email, "token": token, "expires_at": exp}
            folder = _os_mod.path.dirname(self._session_file)
            if folder:
                _os_mod.makedirs(folder, exist_ok=True)
            with open(self._session_file, 'w', encoding='utf-8') as f:
                _json_mod.dump(session, f, ensure_ascii=False, indent=2)
            logger.info(f"会话已持久化到 {self._session_file}")
        except Exception as e:
            logger.warning(f"保存会话失败: {e}")
    
    def auto_restore_login(self) -> bool:
        """启动时从本地文件恢复登录态"""
        if not os.path.exists(self._session_file):
            return False
        try:
            with open(self._session_file, 'r', encoding='utf-8') as f:
                session = json.load(f)
            token = session.get("token")
            if not token:
                return False
            payload = self.jwt_manager.verify_token(token)
            if not payload:
                os.remove(self._session_file)
                logger.info("会话文件中的 token 已过期，已删除")
                return False
            user_id = payload.get("sub")
            user = self.user_storage.get_user(user_id)
            if not user:
                os.remove(self._session_file)
                return False
            self._current_token = token
            self._current_user = user
            logger.info(f"自动恢复登录成功: {user.get('nickname') or user['username']}")
            return True
        except Exception as e:
            logger.warning(f"恢复登录异常: {e}")
            try:
                if os.path.exists(self._session_file):
                    os.remove(self._session_file)
            except:
                pass
            return False
    
    def logout(self):
        """登出并清除持久化会话"""
        if self._current_user:
            user_id = self._current_user['user_id']
            username = self._current_user.get('nickname') or self._current_user['username']
            self.audit_log_storage.add_log(user_id, 'logout', f'用户 {username} 登出')
        self._current_token = None
        self._current_user = None
        # 清理会话文件
        try:
            if os.path.exists(self._session_file):
                os.remove(self._session_file)
        except Exception as e:
            logger.warning(f"删除会话文件失败: {e}")
        if self._on_logout_callback:
            self._on_logout_callback()
    
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
        """获取当前用户"""
        return self._current_user
    
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


# 单例实例
_auth_system_instance: Optional[AuthSystem] = None


def get_auth_system() -> AuthSystem:
    """获取认证系统单例"""
    global _auth_system_instance
    if _auth_system_instance is None:
        _auth_system_instance = AuthSystem()
    return _auth_system_instance
