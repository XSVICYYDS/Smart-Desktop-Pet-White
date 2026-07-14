"""
用户数据模型 - 管理用户信息
"""

import os
import json
from datetime import datetime


class UserModel:
    """
    用户数据模型
    """
    def __init__(self, config):
        self.config = config
        self._load_user_data()
    
    def _load_user_data(self):
        """加载用户数据"""
        self.user_data = self.config.get("user_profile", {
            "username": "小白用户",
            "email": "",
            "phone": "",
            "avatar": "",
            "bio": "",
            "status": "active",
            "created_at": datetime.now().isoformat()
        })
    
    def save(self):
        """保存用户数据"""
        self.config.set("user_profile", self.user_data)
    
    @property
    def username(self):
        return self.user_data.get("username", "小白用户")
    
    @username.setter
    def username(self, value):
        self.user_data["username"] = value
    
    @property
    def email(self):
        return self.user_data.get("email", "")
    
    @email.setter
    def email(self, value):
        self.user_data["email"] = value
    
    @property
    def phone(self):
        return self.user_data.get("phone", "")
    
    @phone.setter
    def phone(self, value):
        self.user_data["phone"] = value
    
    @property
    def avatar(self):
        return self.user_data.get("avatar", "")
    
    @avatar.setter
    def avatar(self, value):
        self.user_data["avatar"] = value
    
    @property
    def bio(self):
        return self.user_data.get("bio", "")
    
    @bio.setter
    def bio(self, value):
        self.user_data["bio"] = value
    
    @property
    def status(self):
        return self.user_data.get("status", "active")
    
    @status.setter
    def status(self, value):
        self.user_data["status"] = value
    
    def get_full_info(self):
        """获取完整用户信息"""
        return {
            "username": self.username,
            "email": self.email,
            "phone": self.phone,
            "avatar": self.avatar,
            "bio": self.bio,
            "status": self.status,
            "created_at": self.user_data.get("created_at", "")
        }
