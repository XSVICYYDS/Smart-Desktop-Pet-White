"""
功能权限定义
定义所有功能权限项及其访问规则
"""

from typing import Dict, List, Any
from .models import Role, Permission


class FeatureDefinitions:
    """
    功能权限定义类
    """
    
    # 权限ID前缀
    PREFIX_PET = "pet"
    PREFIX_GAMES = "games"
    PREFIX_TOOLS = "tools"
    PREFIX_MYCENTER = "mycenter"
    PREFIX_ADMIN = "admin"
    
    @classmethod
    def get_all_roles(cls) -> List[Role]:
        """
        获取所有预定义角色
        
        Returns:
            角色列表
        """
        return [
            Role(
                role_id=Role.GUEST,
                name="访客",
                description="未登录用户，仅可访问基础功能"
            ),
            Role(
                role_id=Role.USER,
                name="普通用户",
                description="已登录用户，可访问Pro功能"
            ),
            Role(
                role_id=Role.VIP,
                name="VIP会员",
                description="VIP用户，可访问所有高级功能"
            ),
            Role(
                role_id=Role.ADMIN,
                name="管理员",
                description="系统管理员，可管理用户和系统"
            ),
            Role(
                role_id=Role.SUPER_ADMIN,
                name="超级管理员",
                description="超级管理员，拥有全部权限"
            )
        ]
    
    @classmethod
    def get_all_permissions(cls) -> List[Permission]:
        """
        获取所有预定义权限
        
        Returns:
            权限列表
        """
        permissions = []
        
        # 宠物相关权限
        permissions.extend([
            Permission(
                permission_id=f"{cls.PREFIX_PET}.basic",
                name="基础宠物互动",
                module="宠物",
                operation="access",
                description="基础的宠物互动功能"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_PET}.pro_animations",
                name="Pro动画",
                module="宠物",
                operation="access",
                description="高级宠物动画"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_PET}.all_features",
                name="全部宠物功能",
                module="宠物",
                operation="access",
                description="所有宠物功能"
            )
        ])
        
        # 游戏相关权限
        permissions.extend([
            Permission(
                permission_id=f"{cls.PREFIX_GAMES}.basic",
                name="基础游戏",
                module="游戏",
                operation="access",
                description="基础小游戏"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_GAMES}.vip",
                name="VIP专属游戏",
                module="游戏",
                operation="access",
                description="VIP专属小游戏"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_GAMES}.all",
                name="全部游戏",
                module="游戏",
                operation="access",
                description="所有游戏功能"
            )
        ])
        
        # 工具相关权限
        permissions.extend([
            Permission(
                permission_id=f"{cls.PREFIX_TOOLS}.screenshot",
                name="截图",
                module="工具",
                operation="access",
                description="截图工具"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_TOOLS}.screen_pen",
                name="屏幕笔",
                module="工具",
                operation="access",
                description="屏幕画笔工具"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_TOOLS}.system",
                name="系统工具",
                module="工具",
                operation="access",
                description="系统快捷工具"
            )
        ])
        
        # 个人中心权限
        permissions.extend([
            Permission(
                permission_id=f"{cls.PREFIX_MYCENTER}.profile",
                name="个人资料",
                module="个人中心",
                operation="access",
                description="查看和编辑个人资料"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_MYCENTER}.settings",
                name="设置",
                module="个人中心",
                operation="access",
                description="账户设置"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_MYCENTER}.history",
                name="使用历史",
                module="个人中心",
                operation="access",
                description="查看使用历史记录"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_MYCENTER}.vip_upgrade",
                name="VIP升级",
                module="个人中心",
                operation="access",
                description="VIP会员升级功能"
            )
        ])
        
        # 管理员权限
        permissions.extend([
            Permission(
                permission_id=f"{cls.PREFIX_ADMIN}.user_manage",
                name="用户管理",
                module="管理",
                operation="manage",
                description="管理用户账户"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_ADMIN}.permission_config",
                name="权限配置",
                module="管理",
                operation="manage",
                description="配置用户权限"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_ADMIN}.system_settings",
                name="系统设置",
                module="管理",
                operation="manage",
                description="系统全局设置"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_ADMIN}.audit_logs",
                name="审计日志",
                module="管理",
                operation="view",
                description="查看系统审计日志"
            ),
            Permission(
                permission_id=f"{cls.PREFIX_ADMIN}.statistics",
                name="数据统计",
                module="管理",
                operation="view",
                description="查看系统数据统计"
            )
        ])
        
        return permissions
    
    @classmethod
    def get_role_permissions_map(cls) -> Dict[str, List[str]]:
        """
        获取角色-权限映射表
        
        Returns:
            角色ID到权限ID列表的映射
        """
        return {
            # 访客权限
            Role.GUEST: [
                f"{cls.PREFIX_PET}.basic",
                f"{cls.PREFIX_GAMES}.basic",
                f"{cls.PREFIX_TOOLS}.screenshot",
                f"{cls.PREFIX_TOOLS}.screen_pen",
                f"{cls.PREFIX_TOOLS}.system"
            ],
            
            # 普通用户权限（包含访客权限 + Pro功能）
            Role.USER: [
                f"{cls.PREFIX_PET}.basic",
                f"{cls.PREFIX_PET}.pro_animations",
                f"{cls.PREFIX_GAMES}.basic",
                f"{cls.PREFIX_TOOLS}.screenshot",
                f"{cls.PREFIX_TOOLS}.screen_pen",
                f"{cls.PREFIX_TOOLS}.system",
                f"{cls.PREFIX_MYCENTER}.profile",
                f"{cls.PREFIX_MYCENTER}.settings",
                f"{cls.PREFIX_MYCENTER}.history",
                f"{cls.PREFIX_MYCENTER}.vip_upgrade"
            ],
            
            # VIP权限（包含用户权限 + VIP功能）
            Role.VIP: [
                f"{cls.PREFIX_PET}.basic",
                f"{cls.PREFIX_PET}.pro_animations",
                f"{cls.PREFIX_PET}.all_features",
                f"{cls.PREFIX_GAMES}.basic",
                f"{cls.PREFIX_GAMES}.vip",
                f"{cls.PREFIX_GAMES}.all",
                f"{cls.PREFIX_TOOLS}.screenshot",
                f"{cls.PREFIX_TOOLS}.screen_pen",
                f"{cls.PREFIX_TOOLS}.system",
                f"{cls.PREFIX_MYCENTER}.profile",
                f"{cls.PREFIX_MYCENTER}.settings",
                f"{cls.PREFIX_MYCENTER}.history",
                f"{cls.PREFIX_MYCENTER}.vip_upgrade"
            ],
            
            # 管理员权限
            Role.ADMIN: [
                f"{cls.PREFIX_PET}.basic",
                f"{cls.PREFIX_PET}.pro_animations",
                f"{cls.PREFIX_PET}.all_features",
                f"{cls.PREFIX_GAMES}.basic",
                f"{cls.PREFIX_GAMES}.vip",
                f"{cls.PREFIX_GAMES}.all",
                f"{cls.PREFIX_TOOLS}.screenshot",
                f"{cls.PREFIX_TOOLS}.screen_pen",
                f"{cls.PREFIX_TOOLS}.system",
                f"{cls.PREFIX_MYCENTER}.profile",
                f"{cls.PREFIX_MYCENTER}.settings",
                f"{cls.PREFIX_MYCENTER}.history",
                f"{cls.PREFIX_ADMIN}.user_manage",
                f"{cls.PREFIX_ADMIN}.audit_logs",
                f"{cls.PREFIX_ADMIN}.statistics"
            ],
            
            # 超级管理员权限（全部权限）
            Role.SUPER_ADMIN: [
                p.permission_id for p in cls.get_all_permissions()
            ]
        }
    
    @classmethod
    def get_feature_info(cls, permission_id: str) -> Dict[str, Any]:
        """
        获取功能信息
        
        Args:
            permission_id: 权限ID
            
        Returns:
            功能信息字典
        """
        for perm in cls.get_all_permissions():
            if perm.permission_id == permission_id:
                return {
                    'permission_id': perm.permission_id,
                    'name': perm.name,
                    'module': perm.module,
                    'description': perm.description
                }
        return {}
    
    @classmethod
    def get_role_hierarchy(cls) -> Dict[str, int]:
        """
        获取角色等级（用于权限继承判断）
        
        Returns:
            角色ID到等级的映射，数值越大权限越高
        """
        return {
            Role.GUEST: 0,
            Role.USER: 1,
            Role.VIP: 2,
            Role.ADMIN: 3,
            Role.SUPER_ADMIN: 4
        }
