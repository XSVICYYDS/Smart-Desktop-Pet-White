"""
RBAC权限系统模块
"""

from .models import Role, Permission, RolePermission, UserRole
from .permission_manager import PermissionManager
from .feature_definitions import FeatureDefinitions
from .decorators import require_permission, require_role

__all__ = [
    "Role",
    "Permission",
    "RolePermission",
    "UserRole",
    "PermissionManager",
    "FeatureDefinitions",
    "require_permission",
    "require_role"
]
