"""
邮箱验证码管理器
功能：生成 6 位数字验证码、60 秒发送限流、5 分钟有效期、模拟发送（无SMTP依赖）
"""

import random
import logging
from typing import Dict, Tuple
from datetime import datetime, timedelta
from .rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class EmailVerifier:
    """邮箱验证码验证器（模拟版，不发送真实邮件）"""

    def __init__(self):
        # 验证码存储: {email: {"code": str, "expires_at": datetime}}
        self._codes: Dict[str, Dict] = {}
        # 发送限流器：同一邮箱 60 秒内最多发送 1 次
        self._send_limiter = RateLimiter(default_limit=1, default_window_seconds=60)
        logger.info("EmailVerifier 初始化完成（模拟发送模式）")

    def _generate_code(self) -> str:
        """生成 6 位纯数字验证码"""
        return "".join(random.choices("0123456789", k=6))

    def _purge_expired(self):
        """清理已过期的验证码"""
        now = datetime.utcnow()
        expired_keys = [
            email for email, info in self._codes.items()
            if now > info["expires_at"]
        ]
        for k in expired_keys:
            del self._codes[k]

    def send_code(self, email: str) -> Tuple[bool, str, str]:
        """
        生成并模拟发送验证码
        Args:
            email: 收件邮箱
        Returns:
            (成功标记, 提示消息, 验证码内容供模拟弹窗显示)
        """
        self._purge_expired()
        limit_key = f"email_send:{email}"
        if not self._send_limiter.check_and_record(limit_key):
            remaining = int(self._send_limiter.get_wait_seconds(limit_key))
            return False, f"验证码发送过于频繁，请在 {remaining} 秒后重试", ""

        code = self._generate_code()
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        self._codes[email.lower()] = {
            "code": code,
            "expires_at": expires_at,
            "attempts": 0
        }
        # 模拟发送：直接返回 code 给 UI 显示
        logger.info(f"[模拟发送] 验证码 {code} 已发送至 {email}，有效期5分钟")
        return True, f"验证码已发送（开发版模拟），请查看下方弹窗获取验证码：{code}", code

    def verify_code(self, email: str, user_code: str) -> Tuple[bool, str]:
        """
        验证用户输入的邮箱验证码
        Args:
            email: 邮箱
            user_code: 用户输入的 6 位验证码
        Returns:
            (是否验证通过, 提示消息)
        """
        self._purge_expired()
        key = email.lower()
        if key not in self._codes:
            return False, "验证码不存在或已过期，请重新发送"

        info = self._codes[key]
        if datetime.utcnow() > info["expires_at"]:
            del self._codes[key]
            return False, "验证码已过期，请重新发送"

        # 尝试次数限制（5次错后强制重发）
        info["attempts"] = info.get("attempts", 0) + 1
        if info["attempts"] > 5:
            del self._codes[key]
            return False, "验证码错误次数过多，请重新发送"

        if user_code.strip() != info["code"]:
            return False, f"验证码错误，还剩 {6 - info['attempts']} 次尝试机会"

        # 验证通过后立即删除，避免重复使用
        del self._codes[key]
        return True, "邮箱验证通过"
