"""
权限检查装饰器
"""

from functools import wraps
from typing import Callable, Optional
from .models import Role


class PermissionError(Exception):
    """权限错误异常"""
    pass


class LoginRequiredError(PermissionError):
    """需要登录异常"""
    pass


def require_permission(permission_id: str):
    """
    要求特定权限的装饰器
    
    Args:
        permission_id: 需要的权限ID
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            # 检查是否有权限管理器
            if not hasattr(self, 'permission_manager'):
                return func(self, *args, **kwargs)
            
            # 获取用户ID
            user_id = getattr(self, 'current_user_id', 'guest')
            
            # 检查权限
            if not self.permission_manager.has_permission(user_id, permission_id):
                raise PermissionError(f"需要权限: {permission_id}")
            
            return func(self, *args, **kwargs)
        return wrapper
    return decorator


def require_role(role_id: str):
    """
    要求特定角色的装饰器
    
    Args:
        role_id: 需要的角色ID
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            if not hasattr(self, 'permission_manager'):
                return func(self, *args, **kwargs)
            
            user_id = getattr(self, 'current_user_id', 'guest')
            
            if not self.permission_manager.has_role_or_higher(user_id, role_id):
                raise PermissionError(f"需要角色: {role_id}")
            
            return func(self, *args, **kwargs)
        return wrapper
    return decorator


def require_login(func: Callable):
    """
    要求登录的装饰器
    """
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        if not hasattr(self, 'permission_manager'):
            return func(self, *args, **kwargs)
        
        user_id = getattr(self, 'current_user_id', 'guest')
        
        if not self.permission_manager.is_logged_in(user_id):
            raise LoginRequiredError("需要登录")
        
        return func(self, *args, **kwargs)
    return wrapper


def require_vip(func: Callable):
    """
    要求VIP的装饰器
    """
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        if not hasattr(self, 'permission_manager'):
            return func(self, *args, **kwargs)
        
        user_id = getattr(self, 'current_user_id', 'guest')
        
        if not self.permission_manager.is_vip(user_id):
            raise PermissionError("需要VIP会员")
        
        return func(self, *args, **kwargs)
    return wrapper


def require_admin(func: Callable):
    """
    要求管理员的装饰器
    """
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        if not hasattr(self, 'permission_manager'):
            return func(self, *args, **kwargs)
        
        user_id = getattr(self, 'current_user_id', 'guest')
        
        if not self.permission_manager.is_admin(user_id):
            raise PermissionError("需要管理员权限")
        
        return func(self, *args, **kwargs)
    return wrapper
