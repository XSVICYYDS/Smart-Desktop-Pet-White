"""
权限管理器
统一的权限检查和管理接口
"""

from typing import List, Optional, Set, Dict, Any
from datetime import datetime
from .models import Role, Permission, RolePermission, UserRole
from .feature_definitions import FeatureDefinitions


class PermissionManager:
    """
    权限管理器
    """
    
    def __init__(self):
        """
        初始化权限管理器
        """
        # 内存缓存
        self._roles: Dict[str, Role] = {}
        self._permissions: Dict[str, Permission] = {}
        self._role_permissions: Dict[str, Set[str]] = {}
        self._user_roles: Dict[str, List[UserRole]] = {}
        
        # 初始化预定义数据
        self._init_default_data()
    
    def _init_default_data(self):
        """
        初始化默认数据
        """
        # 加载预定义角色
        for role in FeatureDefinitions.get_all_roles():
            self._roles[role.role_id] = role
        
        # 加载预定义权限
        for perm in FeatureDefinitions.get_all_permissions():
            self._permissions[perm.permission_id] = perm
        
        # 加载角色权限映射
        role_perm_map = FeatureDefinitions.get_role_permissions_map()
        for role_id, perm_ids in role_perm_map.items():
            self._role_permissions[role_id] = set(perm_ids)
    
    def get_user_roles(self, user_id: str) -> List[str]:
        """
        获取用户的角色ID列表
        
        Args:
            user_id: 用户ID
            
        Returns:
            角色ID列表（按权限从高到低排序）
        """
        # 默认为访客
        if user_id not in self._user_roles:
            return [Role.GUEST]
        
        # 过滤未过期的角色
        active_roles = []
        for ur in self._user_roles[user_id]:
            if not ur.is_expired():
                active_roles.append(ur.role_id)
        
        # 如果没有有效角色，返回访客
        if not active_roles:
            return [Role.GUEST]
        
        # 按角色等级排序
        hierarchy = FeatureDefinitions.get_role_hierarchy()
        active_roles.sort(key=lambda r: hierarchy.get(r, 0), reverse=True)
        
        return active_roles
    
    def get_user_permissions(self, user_id: str) -> Set[str]:
        """
        获取用户的所有权限ID
        
        Args:
            user_id: 用户ID
            
        Returns:
            权限ID集合
        """
        permissions = set()
        roles = self.get_user_roles(user_id)
        
        for role_id in roles:
            if role_id in self._role_permissions:
                permissions.update(self._role_permissions[role_id])
        
        return permissions
    
    def has_permission(self, user_id: str, permission_id: str) -> bool:
        """
        检查用户是否拥有指定权限
        
        Args:
            user_id: 用户ID
            permission_id: 权限ID
            
        Returns:
            是否有权限
        """
        user_perms = self.get_user_permissions(user_id)
        return permission_id in user_perms
    
    def has_any_permission(self, user_id: str, permission_ids: List[str]) -> bool:
        """
        检查用户是否拥有任一权限
        
        Args:
            user_id: 用户ID
            permission_ids: 权限ID列表
            
        Returns:
            是否拥有任一权限
        """
        user_perms = self.get_user_permissions(user_id)
        return any(p in user_perms for p in permission_ids)
    
    def has_all_permissions(self, user_id: str, permission_ids: List[str]) -> bool:
        """
        检查用户是否拥有所有权限
        
        Args:
            user_id: 用户ID
            permission_ids: 权限ID列表
            
        Returns:
            是否拥有所有权限
        """
        user_perms = self.get_user_permissions(user_id)
        return all(p in user_perms for p in permission_ids)
    
    def has_role(self, user_id: str, role_id: str) -> bool:
        """
        检查用户是否拥有指定角色
        
        Args:
            user_id: 用户ID
            role_id: 角色ID
            
        Returns:
            是否拥有该角色
        """
        user_roles = self.get_user_roles(user_id)
        return role_id in user_roles
    
    def has_role_or_higher(self, user_id: str, role_id: str) -> bool:
        """
        检查用户是否拥有指定或更高等级的角色
        
        Args:
            user_id: 用户ID
            role_id: 角色ID
            
        Returns:
            是否拥有该或更高等级角色
        """
        user_roles = self.get_user_roles(user_id)
        hierarchy = FeatureDefinitions.get_role_hierarchy()
        required_level = hierarchy.get(role_id, 0)
        
        for ur in user_roles:
            user_level = hierarchy.get(ur, 0)
            if user_level >= required_level:
                return True
        return False
    
    def assign_role(self, user_id: str, role_id: str, 
                    assigned_by: str = "system",
                    expires_at: Optional[datetime] = None) -> bool:
        """
        给用户分配角色
        
        Args:
            user_id: 用户ID
            role_id: 角色ID
            assigned_by: 分配人
            expires_at: 过期时间
            
        Returns:
            是否成功
        """
        if role_id not in self._roles:
            return False
        
        if user_id not in self._user_roles:
            self._user_roles[user_id] = []
        
        # 检查是否已分配该角色
        existing = next((ur for ur in self._user_roles[user_id] 
                        if ur.role_id == role_id and not ur.is_expired()), None)
        if existing:
            return True
        
        user_role = UserRole(
            user_id=user_id,
            role_id=role_id,
            assigned_by=assigned_by,
            expires_at=expires_at
        )
        self._user_roles[user_id].append(user_role)
        return True
    
    def revoke_role(self, user_id: str, role_id: str) -> bool:
        """
        撤销用户角色
        
        Args:
            user_id: 用户ID
            role_id: 角色ID
            
        Returns:
            是否成功
        """
        if user_id not in self._user_roles:
            return False
        
        original_count = len(self._user_roles[user_id])
        self._user_roles[user_id] = [
            ur for ur in self._user_roles[user_id] 
            if ur.role_id != role_id or ur.is_expired()
        ]
        
        return len(self._user_roles[user_id]) < original_count
    
    def set_user_roles(self, user_id: str, role_ids: List[str]):
        """
        设置用户的所有角色（替换）
        
        Args:
            user_id: 用户ID
            role_ids: 角色ID列表
        """
        self._user_roles[user_id] = []
        for role_id in role_ids:
            self.assign_role(user_id, role_id)
    
    def get_role(self, role_id: str) -> Optional[Role]:
        """
        获取角色信息
        
        Args:
            role_id: 角色ID
            
        Returns:
            角色对象
        """
        return self._roles.get(role_id)
    
    def get_all_roles(self) -> List[Role]:
        """
        获取所有角色
        
        Returns:
            角色列表
        """
        return list(self._roles.values())
    
    def get_permission(self, permission_id: str) -> Optional[Permission]:
        """
        获取权限信息
        
        Args:
            permission_id: 权限ID
            
        Returns:
            权限对象
        """
        return self._permissions.get(permission_id)
    
    def get_all_permissions(self) -> List[Permission]:
        """
        获取所有权限
        
        Returns:
            权限列表
        """
        return list(self._permissions.values())
    
    def get_role_permissions(self, role_id: str) -> Set[str]:
        """
        获取角色的权限
        
        Args:
            role_id: 角色ID
            
        Returns:
            权限ID集合
        """
        return self._role_permissions.get(role_id, set())
    
    def is_logged_in(self, user_id: str) -> bool:
        """
        检查用户是否已登录（非访客）
        
        Args:
            user_id: 用户ID
            
        Returns:
            是否已登录
        """
        roles = self.get_user_roles(user_id)
        return Role.GUEST not in roles or len(roles) > 1
    
    def is_vip(self, user_id: str) -> bool:
        """
        检查用户是否是VIP
        
        Args:
            user_id: 用户ID
            
        Returns:
            是否是VIP
        """
        return self.has_role_or_higher(user_id, Role.VIP)
    
    def is_admin(self, user_id: str) -> bool:
        """
        检查用户是否是管理员
        
        Args:
            user_id: 用户ID
            
        Returns:
            是否是管理员
        """
        return self.has_role_or_higher(user_id, Role.ADMIN)
    
    def is_super_admin(self, user_id: str) -> bool:
        """
        检查用户是否是超级管理员
        
        Args:
            user_id: 用户ID
            
        Returns:
            是否是超级管理员
        """
        return self.has_role(Role.SUPER_ADMIN)
