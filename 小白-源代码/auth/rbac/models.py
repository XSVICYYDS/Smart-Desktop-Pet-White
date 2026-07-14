"""
RBAC数据模型
角色、权限及其关联关系
"""

from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid


class Role:
    """
    角色模型
    """
    
    # 预定义角色ID
    GUEST = "guest"
    USER = "user"
    VIP = "vip"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    
    def __init__(self, role_id: str, name: str, description: str = "", 
                 created_at: Optional[datetime] = None):
        """
        初始化角色
        
        Args:
            role_id: 角色ID
            name: 角色名称
            description: 角色描述
            created_at: 创建时间
        """
        self.role_id = role_id
        self.name = name
        self.description = description
        self.created_at = created_at or datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """
        转换为字典
        
        Returns:
            字典表示
        """
        return {
            'role_id': self.role_id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Role':
        """
        从字典创建
        
        Args:
            data: 字典数据
            
        Returns:
            Role对象
        """
        created_at = None
        if 'created_at' in data:
            created_at = datetime.fromisoformat(data['created_at'])
        
        return cls(
            role_id=data['role_id'],
            name=data['name'],
            description=data.get('description', ''),
            created_at=created_at
        )


class Permission:
    """
    权限模型
    """
    
    def __init__(self, permission_id: str, name: str, 
                 module: str = "general", 
                 operation: str = "access",
                 description: str = "",
                 created_at: Optional[datetime] = None):
        """
        初始化权限
        
        Args:
            permission_id: 权限ID
            name: 权限名称
            module: 所属模块
            operation: 操作类型
            description: 权限描述
            created_at: 创建时间
        """
        self.permission_id = permission_id
        self.name = name
        self.module = module
        self.operation = operation
        self.description = description
        self.created_at = created_at or datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """
        转换为字典
        
        Returns:
            字典表示
        """
        return {
            'permission_id': self.permission_id,
            'name': self.name,
            'module': self.module,
            'operation': self.operation,
            'description': self.description,
            'created_at': self.created_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Permission':
        """
        从字典创建
        
        Args:
            data: 字典数据
            
        Returns:
            Permission对象
        """
        created_at = None
        if 'created_at' in data:
            created_at = datetime.fromisoformat(data['created_at'])
        
        return cls(
            permission_id=data['permission_id'],
            name=data['name'],
            module=data.get('module', 'general'),
            operation=data.get('operation', 'access'),
            description=data.get('description', ''),
            created_at=created_at
        )


class RolePermission:
    """
    角色-权限关联模型
    """
    
    def __init__(self, role_id: str, permission_id: str,
                 granted_by: str = "system",
                 granted_at: Optional[datetime] = None):
        """
        初始化角色权限关联
        
        Args:
            role_id: 角色ID
            permission_id: 权限ID
            granted_by: 授权人
            granted_at: 授权时间
        """
        self.role_id = role_id
        self.permission_id = permission_id
        self.granted_by = granted_by
        self.granted_at = granted_at or datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """
        转换为字典
        
        Returns:
            字典表示
        """
        return {
            'role_id': self.role_id,
            'permission_id': self.permission_id,
            'granted_by': self.granted_by,
            'granted_at': self.granted_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RolePermission':
        """
        从字典创建
        
        Args:
            data: 字典数据
            
        Returns:
            RolePermission对象
        """
        granted_at = None
        if 'granted_at' in data:
            granted_at = datetime.fromisoformat(data['granted_at'])
        
        return cls(
            role_id=data['role_id'],
            permission_id=data['permission_id'],
            granted_by=data.get('granted_by', 'system'),
            granted_at=granted_at
        )


class UserRole:
    """
    用户-角色关联模型
    """
    
    def __init__(self, user_id: str, role_id: str,
                 assigned_by: str = "system",
                 assigned_at: Optional[datetime] = None,
                 expires_at: Optional[datetime] = None):
        """
        初始化用户角色关联
        
        Args:
            user_id: 用户ID
            role_id: 角色ID
            assigned_by: 分配人
            assigned_at: 分配时间
            expires_at: 过期时间（可选，用于VIP等临时角色）
        """
        self.user_id = user_id
        self.role_id = role_id
        self.assigned_by = assigned_by
        self.assigned_at = assigned_at or datetime.utcnow()
        self.expires_at = expires_at
    
    def is_expired(self) -> bool:
        """
        检查是否已过期
        
        Returns:
            是否已过期
        """
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self) -> Dict[str, Any]:
        """
        转换为字典
        
        Returns:
            字典表示
        """
        data = {
            'user_id': self.user_id,
            'role_id': self.role_id,
            'assigned_by': self.assigned_by,
            'assigned_at': self.assigned_at.isoformat()
        }
        if self.expires_at is not None:
            data['expires_at'] = self.expires_at.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserRole':
        """
        从字典创建
        
        Args:
            data: 字典数据
            
        Returns:
            UserRole对象
        """
        assigned_at = None
        if 'assigned_at' in data:
            assigned_at = datetime.fromisoformat(data['assigned_at'])
        
        expires_at = None
        if 'expires_at' in data:
            expires_at = datetime.fromisoformat(data['expires_at'])
        
        return cls(
            user_id=data['user_id'],
            role_id=data['role_id'],
            assigned_by=data.get('assigned_by', 'system'),
            assigned_at=assigned_at,
            expires_at=expires_at
        )
