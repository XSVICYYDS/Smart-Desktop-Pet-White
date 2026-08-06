"""
用户存储 - 简化实现
"""

import json
import os
from typing import Dict, Optional, Any
from datetime import datetime


class UserStorage:
    """用户存储"""
    
    def __init__(self, storage_dir: str = None):
        if storage_dir is None:
            storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)
        self.users_file = os.path.join(self.storage_dir, 'users.json')
        self._load()
    
    def _load(self):
        self._users: Dict[str, Dict] = {}
        if os.path.exists(self.users_file):
            try:
                with open(self.users_file, 'r', encoding='utf-8') as f:
                    raw = json.load(f)
                # 兼容旧数据：没有 nickname 的用户用 username 补齐；确保 avatar 字段存在
                for uid, u in raw.items():
                    if 'nickname' not in u:
                        u['nickname'] = u.get('username', '用户')
                    if 'avatar' not in u:
                        u['avatar'] = ''
                self._users = raw
            except:
                pass
    
    def _save(self):
        with open(self.users_file, 'w', encoding='utf-8') as f:
            json.dump(self._users, f, ensure_ascii=False, indent=2)
    
    def get_user(self, user_id: str) -> Optional[Dict]:
        return self._users.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        for user in self._users.values():
            if user.get('email') == email:
                return user
        return None
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        for user in self._users.values():
            if user.get('username') == username:
                return user
        return None
    
    def create_user(self, user_id: str, username: str, email: str, password_hash: str, nickname: str = None, avatar: str = '') -> Dict:
        """
        创建用户
        Args:
            user_id: 用户ID
            username: 用户名（唯一标识）
            email: 邮箱（唯一标识）
            password_hash: 密码哈希
            nickname: 昵称（展示名），为空时默认取 username
            avatar: 头像 Base64（Data URL）或本地路径，默认为空串
        """
        display_nick = nickname if nickname else username
        user = {
            'user_id': user_id,
            'username': username,
            'nickname': display_nick,
            'email': email,
            'password_hash': password_hash,
            'created_at': datetime.utcnow().isoformat(),
            'status': 'active',
            'avatar': avatar or ''
        }
        self._users[user_id] = user
        self._save()
        return user
    
    def update_user(self, user_id: str, **kwargs):
        if user_id in self._users:
            self._users[user_id].update(kwargs)
            self._save()
    
    def delete_user(self, user_id: str):
        if user_id in self._users:
            del self._users[user_id]
            self._save()
    
    def get_all_users(self) -> list:
        return list(self._users.values())


class PermissionStorage:
    """权限存储 - 简化"""
    
    def __init__(self, storage_dir: str = None):
        if storage_dir is None:
            storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)
        self.roles_file = os.path.join(self.storage_dir, 'user_roles.json')
        self._load()
    
    def _load(self):
        self._user_roles: Dict[str, list] = {}
        if os.path.exists(self.roles_file):
            try:
                with open(self.roles_file, 'r', encoding='utf-8') as f:
                    self._user_roles = json.load(f)
            except:
                pass
    
    def _save(self):
        with open(self.roles_file, 'w', encoding='utf-8') as f:
            json.dump(self._user_roles, f, ensure_ascii=False, indent=2)
    
    def get_user_roles(self, user_id: str) -> list:
        return self._user_roles.get(user_id, [])
    
    def set_user_roles(self, user_id: str, roles: list):
        self._user_roles[user_id] = roles
        self._save()


class AuditLogStorage:
    """审计日志存储 - 简化"""
    
    def __init__(self, storage_dir: str = None):
        if storage_dir is None:
            storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)
        self.logs_file = os.path.join(self.storage_dir, 'audit_logs.json')
        self._load()
    
    def _load(self):
        self._logs: list = []
        if os.path.exists(self.logs_file):
            try:
                with open(self.logs_file, 'r', encoding='utf-8') as f:
                    self._logs = json.load(f)
            except:
                pass
    
    def _save(self):
        # 只保留最近1000条日志
        if len(self._logs) > 1000:
            self._logs = self._logs[-1000:]
        with open(self.logs_file, 'w', encoding='utf-8') as f:
            json.dump(self._logs, f, ensure_ascii=False, indent=2)
    
    def add_log(self, user_id: str, action: str, details: str = '', ip: str = ''):
        log = {
            'user_id': user_id,
            'action': action,
            'details': details,
            'ip': ip,
            'timestamp': datetime.utcnow().isoformat()
        }
        self._logs.append(log)
        self._save()
    
    def get_logs(self, limit: int = 100) -> list:
        return list(reversed(self._logs[-limit:]))
