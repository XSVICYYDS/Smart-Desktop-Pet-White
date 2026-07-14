"""
安全模块 - 简化实现
"""

import re
import secrets


class CSRFProtection:
    """CSRF防护 - 简化"""
    
    def __init__(self):
        self._tokens = {}
    
    def generate_token(self, session_id: str) -> str:
        token = secrets.token_hex(32)
        self._tokens[session_id] = token
        return token
    
    def validate_token(self, session_id: str, token: str) -> bool:
        if session_id not in self._tokens:
            return False
        return secrets.compare_digest(self._tokens[session_id], token)


class XSSProtection:
    """XSS防护 - 简化"""
    
    @staticmethod
    def sanitize(text: str) -> str:
        if not text:
            return text
        # 简单的HTML转义
        text = text.replace('&', '&amp;')
        text = text.replace('<', '&lt;')
        text = text.replace('>', '&gt;')
        text = text.replace('"', '&quot;')
        text = text.replace("'", '&#x27;')
        return text


class InputValidator:
    """输入验证"""
    
    @staticmethod
    def validate_email(email: str) -> tuple[bool, str]:
        if not email:
            return False, "邮箱不能为空"
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False, "邮箱格式不正确"
        return True, ""
    
    @staticmethod
    def validate_username(username: str) -> tuple[bool, str]:
        if not username:
            return False, "用户名不能为空"
        if len(username) < 3 or len(username) > 20:
            return False, "用户名长度应在3-20之间"
        if not re.match(r'^[a-zA-Z0-9_\u4e00-\u9fa5]+$', username):
            return False, "用户名只能包含字母、数字、下划线和中文"
        return True, ""
    
    @staticmethod
    def validate_activation_code(code: str) -> tuple[bool, str]:
        if not code:
            return False, "激活码不能为空"
        code = code.strip().replace(' ', '').replace('-', '')
        if len(code) != 16:
            return False, "激活码应为16位"
        if not re.match(r'^[a-zA-Z0-9]+$', code):
            return False, "激活码只能包含字母和数字"
        return True, ""
