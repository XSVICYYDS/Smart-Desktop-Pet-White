"""
存储模块初始化
"""

from .user_storage import UserStorage, PermissionStorage, AuditLogStorage

__all__ = [
    'UserStorage',
    'PermissionStorage',
    'AuditLogStorage'
]
