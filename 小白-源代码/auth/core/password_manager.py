"""
密码管理器
提供密码加密、验证和强度检查功能
"""

import hashlib
import hmac
import os
import re
from typing import Tuple, Optional
from datetime import datetime, timedelta


class PasswordManager:
    """
    密码管理器类
    提供安全的密码处理功能
    """
    
    # 工作因子 - 越高越安全但越慢
    WORK_FACTOR = 12
    
    # 密码强度要求
    MIN_LENGTH = 8
    REQUIRE_UPPER = True
    REQUIRE_LOWER = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    def __init__(self):
        """初始化密码管理器"""
        pass
    
    def hash_password(self, password: str) -> str:
        """
        加密密码
        
        Args:
            password: 明文密码
            
        Returns:
            加密后的密码哈希
        """
        # 使用SHA-256 + salt模拟bcrypt（避免额外依赖）
        salt = os.urandom(16).hex()
        hash_obj = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000  # 迭代次数
        )
        return f"{salt}${hash_obj.hex()}"
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """
        验证密码
        
        Args:
            password: 明文密码
            hashed: 加密后的密码哈希
            
        Returns:
            密码是否匹配
        """
        try:
            salt, hash_hex = hashed.split('$')
            hash_obj = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode('utf-8'),
                salt.encode('utf-8'),
                100000
            )
            return hmac.compare_digest(hash_obj.hex(), hash_hex)
        except Exception:
            return False
    
    def check_password_strength(self, password: str) -> Tuple[bool, str, int]:
        """
        检查密码强度
        
        Args:
            password: 待检查的密码
            
        Returns:
            (是否符合要求, 提示信息, 分数0-100)
        """
        score = 0
        issues = []
        
        # 长度检查
        if len(password) < self.MIN_LENGTH:
            issues.append(f"密码长度至少需要{self.MIN_LENGTH}个字符")
        else:
            score += 20
            if len(password) >= 12:
                score += 10
            if len(password) >= 16:
                score += 10
        
        # 大写字母检查
        if self.REQUIRE_UPPER and not re.search(r'[A-Z]', password):
            issues.append("需要包含至少一个大写字母")
        else:
            score += 15
        
        # 小写字母检查
        if self.REQUIRE_LOWER and not re.search(r'[a-z]', password):
            issues.append("需要包含至少一个小写字母")
        else:
            score += 15
        
        # 数字检查
        if self.REQUIRE_DIGIT and not re.search(r'[0-9]', password):
            issues.append("需要包含至少一个数字")
        else:
            score += 15
        
        # 特殊字符检查
        if self.REQUIRE_SPECIAL and not re.search(f'[{re.escape(self.SPECIAL_CHARS)}]', password):
            issues.append(f"需要包含至少一个特殊字符（{self.SPECIAL_CHARS}）")
        else:
            score += 15
        
        # 检查常见密码模式
        common_patterns = [
            r'123456',
            r'password',
            r'qwerty',
            r'abc123',
            r'111111',
            r'000000'
        ]
        for pattern in common_patterns:
            if pattern.lower() in password.lower():
                issues.append("密码包含常见模式，安全性较低")
                score -= 20
                break
        
        score = max(0, min(100, score))
        
        if issues:
            return False, "\n".join(issues), score
        else:
            return True, "密码强度符合要求", score
    
    def generate_secure_password(self, length: int = 16) -> str:
        """
        生成安全密码
        
        Args:
            length: 密码长度
            
        Returns:
            生成的安全密码
        """
        import secrets
        
        chars = "abcdefghijklmnopqrstuvwxyz"
        chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        chars += "0123456789"
        chars += self.SPECIAL_CHARS
        
        password = []
        
        # 确保包含各类字符
        password.append(secrets.choice("abcdefghijklmnopqrstuvwxyz"))
        password.append(secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ"))
        password.append(secrets.choice("0123456789"))
        password.append(secrets.choice(self.SPECIAL_CHARS))
        
        # 填充剩余字符
        for _ in range(length - 4):
            password.append(secrets.choice(chars))
        
        # 打乱顺序
        secret_list = list(password)
        secrets.SystemRandom().shuffle(secret_list)
        
        return ''.join(secret_list)
