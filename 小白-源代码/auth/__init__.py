"""
认证授权模块
多级别用户权限管理与安全登录系统
"""

__version__ = "1.0.0"

from .core import (
    PasswordManager,
    JWTManager,
    CaptchaGenerator,
    RateLimiter
)
from .rbac import (
    PermissionManager,
    FeatureDefinitions,
    require_permission,
    require_role,
    Role,
    Permission
)
from .storage import (
    UserStorage,
    PermissionStorage,
    AuditLogStorage
)
from .auth_system import AuthSystem, get_auth_system

__all__ = [
    # Core
    "PasswordManager",
    "JWTManager",
    "CaptchaGenerator",
    "RateLimiter",
    
    # RBAC
    "PermissionManager",
    "FeatureDefinitions",
    "require_permission",
    "require_role",
    "Role",
    "Permission",
    
    # Storage
    "UserStorage",
    "PermissionStorage",
    "AuditLogStorage",
    
    # Main System
    "AuthSystem",
    "get_auth_system"
]
