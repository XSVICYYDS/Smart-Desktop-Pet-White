"""
密码强度检测工具
"""

import re


class PasswordStrengthChecker:
    """
    密码强度检测器
    """
    @staticmethod
    def check_strength(password: str) -> tuple:
        """
        检测密码强度
        返回: (分数, 强度描述, 颜色)
        """
        if not password:
            return 0, "请输入密码", "#999999"
        
        score = 0
        
        # 长度检测
        if len(password) >= 8:
            score += 1
        
        # 包含大小写字母
        if re.search(r'[a-z]', password) and re.search(r'[A-Z]', password):
            score += 1
        
        # 包含数字
        if re.search(r'\d', password):
            score += 1
        
        # 包含特殊字符
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 1
        
        if score <= 1:
            return score, "弱", "#F44336"
        elif score == 2:
            return score, "中", "#FF9800"
        elif score == 3:
            return score, "强", "#2196F3"
        else:
            return score, "很强", "#4CAF50"
    
    @staticmethod
    def get_feedback(password: str) -> list:
        """获取密码改进建议"""
        feedback = []
        
        if len(password) < 8:
            feedback.append("密码长度至少8位")
        
        if not (re.search(r'[a-z]', password) and re.search(r'[A-Z]', password)):
            feedback.append("包含大小写字母")
        
        if not re.search(r'\d', password):
            feedback.append("包含数字")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            feedback.append("包含特殊字符")
        
        return feedback
