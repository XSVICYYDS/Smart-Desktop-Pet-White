"""
请求频率限制器
防止暴力破解和滥用
"""

from typing import Dict, Optional
from datetime import datetime, timedelta
from collections import deque


class RateLimiter:
    """
    请求频率限制器类
    实现滑动窗口限流
    """
    
    # 默认配置
    LOGIN_MAX_ATTEMPTS = 5
    LOGIN_WINDOW_MINUTES = 15
    ACTIVATION_MAX_ATTEMPTS = 3
    ACTIVATION_WINDOW_HOURS = 1
    
    # 存储
    _attempts = {}
    
    def __init__(self):
        """初始化频率限制器"""
        pass
    
    def _cleanup_expired(self, key: str, window_seconds: float):
        """
        清理过期的记录
        
        Args:
            key: 记录键
            window_seconds: 窗口期秒数
        """
        if key not in self._attempts:
            return
        
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=window_seconds)
        
        # 过滤掉过期的记录
        self._attempts[key] = [
            ts for ts in self._attempts[key]
            if ts > cutoff
        ]
        
        # 如果列表为空，删除该键
        if not self._attempts[key]:
            del self._attempts[key]
    
    def record_attempt(self, key: str) -> int:
        """
        记录一次尝试
        
        Args:
            key: 记录键（用户名/邮箱/IP等）
            
        Returns:
            当前窗口期内的尝试次数
        """
        now = datetime.utcnow()
        
        if key not in self._attempts:
            self._attempts[key] = deque()
        
        self._attempts[key].append(now)
        
        return len(self._attempts[key])
    
    def check_login_allowed(self, identifier: str) -> tuple[bool, Optional[int]]:
        """
        检查是否允许登录尝试
        
        Args:
            identifier: 用户标识（用户名/邮箱/手机号）
            
        Returns:
            (是否允许, 剩余锁定秒数)
        """
        key = f"login:{identifier}"
        window_seconds = self.LOGIN_WINDOW_MINUTES * 60
        
        self._cleanup_expired(key, window_seconds)
        
        attempts = len(self._attempts.get(key, []))
        
        if attempts >= self.LOGIN_MAX_ATTEMPTS:
            # 计算剩余锁定时间
            if key in self._attempts and self._attempts[key]:
                oldest = self._attempts[key][0]
                remaining = (oldest + timedelta(seconds=window_seconds) - datetime.utcnow()).total_seconds()
                remaining = max(0, int(remaining))
                return False, remaining
        
        # 记录这次尝试
        self.record_attempt(key)
        
        return True, None
    
    def check_activation_allowed(self, user_id: str) -> tuple[bool, Optional[int]]:
        """
        检查是否允许激活码验证尝试
        
        Args:
            user_id: 用户ID
            
        Returns:
            (是否允许, 剩余限制秒数)
        """
        key = f"activation:{user_id}"
        window_seconds = self.ACTIVATION_WINDOW_HOURS * 3600
        
        self._cleanup_expired(key, window_seconds)
        
        attempts = len(self._attempts.get(key, []))
        
        if attempts >= self.ACTIVATION_MAX_ATTEMPTS:
            if key in self._attempts and self._attempts[key]:
                oldest = self._attempts[key][0]
                remaining = (oldest + timedelta(seconds=window_seconds) - datetime.utcnow()).total_seconds()
                remaining = max(0, int(remaining))
                return False, remaining
        
        self.record_attempt(key)
        
        return True, None
    
    def reset_login_attempts(self, identifier: str):
        """
        重置登录尝试计数（登录成功时调用）
        
        Args:
            identifier: 用户标识
        """
        key = f"login:{identifier}"
        if key in self._attempts:
            del self._attempts[key]
    
    def reset_activation_attempts(self, user_id: str):
        """
        重置激活尝试计数
        
        Args:
            user_id: 用户ID
        """
        key = f"activation:{user_id}"
        if key in self._attempts:
            del self._attempts[key]
    
    def get_login_attempts(self, identifier: str) -> int:
        """
        获取当前登录尝试次数
        
        Args:
            identifier: 用户标识
            
        Returns:
            尝试次数
        """
        key = f"login:{identifier}"
        window_seconds = self.LOGIN_WINDOW_MINUTES * 60
        
        self._cleanup_expired(key, window_seconds)
        
        return len(self._attempts.get(key, []))
    
    def is_locked(self, identifier: str) -> bool:
        """
        检查用户是否被锁定
        
        Args:
            identifier: 用户标识
            
        Returns:
            是否被锁定
        """
        allowed, _ = self.check_login_allowed(identifier)
        return not allowed
    
    def clear_all(self):
        """清除所有限制记录"""
        self._attempts.clear()
    
    def clear_for_identifier(self, identifier: str):
        """
        清除指定用户的所有限制记录
        
        Args:
            identifier: 用户标识
        """
        keys_to_delete = [
            key for key in self._attempts
            if identifier in key
        ]
        for key in keys_to_delete:
            del self._attempts[key]
    
    def format_lockout_message(self, remaining_seconds: int) -> str:
        """
        格式化锁定提示信息
        
        Args:
            remaining_seconds: 剩余秒数
            
        Returns:
            友好的提示信息
        """
        if remaining_seconds < 60:
            return f"尝试次数过多，请在 {remaining_seconds} 秒后重试"
        elif remaining_seconds < 3600:
            minutes = remaining_seconds // 60
            return f"尝试次数过多，请在 {minutes} 分钟后重试"
        else:
            hours = remaining_seconds // 3600
            minutes = (remaining_seconds % 3600) // 60
            if minutes > 0:
                return f"尝试次数过多，请在 {hours} 小时 {minutes} 分钟后重试"
            return f"尝试次数过多，请在 {hours} 小时后重试"
