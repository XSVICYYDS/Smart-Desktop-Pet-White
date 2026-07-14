"""
认证系统 - 统一整合类
小白桌面宠物的完整权限管理与登录系统
"""

import uuid
from typing import Optional, Dict, Any, Callable
from datetime import datetime, timedelta

from .core.password_manager import PasswordManager
from .core.jwt_manager import JWTManager
from .core.captcha_generator import CaptchaGenerator
from .core.rate_limiter import RateLimiter
from .rbac.permission_manager import PermissionManager
from .rbac.models import Role
from .storage.user_storage import UserStorage, PermissionStorage, AuditLogStorage
from .security import CSRFProtection, XSSProtection, InputValidator


class AuthSystem:
    """统一的认证系统类"""
    
    def __init__(self):
        # 核心组件
        self.password_manager = PasswordManager()
        self.jwt_manager = JWTManager()
        self.captcha_generator = CaptchaGenerator()
        self.rate_limiter = RateLimiter()
        
        # 权限管理
        self.permission_manager = PermissionManager()
        
        # 存储
        self.user_storage = UserStorage()
        self.permission_storage = PermissionStorage()
        self.audit_log_storage = AuditLogStorage()
        
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
        
        # 从存储加载权限
        self._load_saved_roles()
        
        # 默认演示用户
        self._init_demo_data()
    
    def _init_demo_data(self):
        """初始化演示数据"""
        # 检查是否已有用户
        if not self.user_storage.get_user_by_username('demo'):
            # 创建演示用户
            demo_user_id = str(uuid.uuid4())
            password_hash = self.password_manager.hash_password('Demo123!')
            self.user_storage.create_user(demo_user_id, 'demo', 'demo@example.com', password_hash)
            # 分配普通用户角色
            self.permission_manager.assign_role(demo_user_id, Role.USER)
            self.permission_storage.set_user_roles(demo_user_id, [Role.USER])
        
        # 创建VIP演示用户
        if not self.user_storage.get_user_by_username('vip'):
            vip_user_id = str(uuid.uuid4())
            password_hash = self.password_manager.hash_password('Vip123!')
            self.user_storage.create_user(vip_user_id, 'vip', 'vip@example.com', password_hash)
            self.permission_manager.assign_role(vip_user_id, Role.VIP)
            self.permission_storage.set_user_roles(vip_user_id, [Role.VIP])
        
        # 创建管理员
        if not self.user_storage.get_user_by_username('admin'):
            admin_user_id = str(uuid.uuid4())
            password_hash = self.password_manager.hash_password('Admin123!')
            self.user_storage.create_user(admin_user_id, 'admin', 'admin@example.com', password_hash)
            self.permission_manager.assign_role(admin_user_id, Role.ADMIN)
            self.permission_storage.set_user_roles(admin_user_id, [Role.ADMIN])
    
    def _load_saved_roles(self):
        """从存储加载用户角色"""
        # 为所有已保存的用户恢复角色
        for user in self.user_storage.get_all_users():
            user_id = user['user_id']
            saved_roles = self.permission_storage.get_user_roles(user_id)
            for role_id in saved_roles:
                self.permission_manager.assign_role(user_id, role_id)
    
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
    
    def register(self, username: str, email: str, password: str, captcha_id: str, captcha_input: str) -> tuple[bool, str, Optional[str]]:
        """
        注册新用户
        
        Returns: (success, message, user_id)
        """
        # 验证验证码
        if not self.verify_captcha(captcha_id, captcha_input):
            return False, "验证码错误", None
        
        # 验证输入
        valid, msg = self.input_validator.validate_username(username)
        if not valid:
            return False, msg, None
        
        valid, msg = self.input_validator.validate_email(email)
        if not valid:
            return False, msg, None
        
        valid, msg = self.password_manager.check_password_strength(password)
        if not valid:
            return False, msg, None
        
        # 检查用户是否已存在
        if self.user_storage.get_user_by_username(username):
            return False, "用户名已存在", None
        
        if self.user_storage.get_user_by_email(email):
            return False, "邮箱已被注册", None
        
        # 创建用户
        user_id = str(uuid.uuid4())
        password_hash = self.password_manager.hash_password(password)
        self.user_storage.create_user(user_id, username, email, password_hash)
        
        # 分配普通用户角色
        self.permission_manager.assign_role(user_id, Role.USER)
        self.permission_storage.set_user_roles(user_id, [Role.USER])
        
        # 记录日志
        self.audit_log_storage.add_log(user_id, 'register', f'用户 {username} 注册成功')
        
        return True, "注册成功", user_id
    
    def login(self, username_or_email: str, password: str, captcha_id: str, captcha_input: str) -> tuple[bool, str, Optional[str]]:
        """
        登录
        
        Returns: (success, message, token)
        """
        # 检查频率限制
        allowed, remaining_time = self.rate_limiter.check_login_allowed(username_or_email)
        if not allowed:
            msg = self.rate_limiter.format_lockout_message(remaining_time)
            return False, msg, None
        
        # 验证验证码
        if not self.verify_captcha(captcha_id, captcha_input):
            return False, "验证码错误", None
        
        # 查找用户
        user = self.user_storage.get_user_by_username(username_or_email)
        if not user:
            user = self.user_storage.get_user_by_email(username_or_email)
        
        if not user:
            return False, "用户名或密码错误", None
        
        # 验证密码
        if not self.password_manager.verify_password(password, user['password_hash']):
            return False, "用户名或密码错误", None
        
        # 重置失败计数
        self.rate_limiter.reset_login_attempts(username_or_email)
        
        # 生成token
        token = self.jwt_manager.generate_token(
            user['user_id'],
            user['username'],
            self.permission_manager.get_user_roles(user['user_id'])[0]
        )
        
        # 更新当前用户
        self._current_token = token
        self._current_user = user
        
        # 记录日志
        self.audit_log_storage.add_log(user['user_id'], 'login', f'用户 {user["username"]} 登录成功')
        
        # 回调
        if self._on_login_callback:
            self._on_login_callback(user, token)
        
        return True, "登录成功", token
    
    def logout(self):
        """登出"""
        if self._current_user:
            user_id = self._current_user['user_id']
            username = self._current_user['username']
            self.audit_log_storage.add_log(user_id, 'logout', f'用户 {username} 登出')
        
        self._current_token = None
        self._current_user = None
        
        if self._on_logout_callback:
            self._on_logout_callback()
    
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
