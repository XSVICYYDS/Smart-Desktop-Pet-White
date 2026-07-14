"""
图形验证码生成器
使用SVG格式防止机器人识别
"""

import random
import string
from typing import Tuple, Optional
from datetime import datetime, timedelta


class CaptchaGenerator:
    """
    图形验证码生成器类
    生成SVG格式的验证码
    """
    
    # 默认配置
    DEFAULT_LENGTH = 4
    DEFAULT_WIDTH = 150
    DEFAULT_HEIGHT = 50
    VALID_CHARS = string.ascii_uppercase + string.digits  # 大写字母+数字
    EXPIRY_MINUTES = 10
    
    # 颜色配置
    COLORS = [
        '#FF69B4',  # 粉色
        '#FF1493',  # 深粉色
        '#C71585',  # 紫红色
        '#DB7093',  # 苍白紫罗兰红
        '#FF6EB4',  # HotPink
        '#FF83FA',  # Orchid1
        '#EE799F',  # HotPink2
    ]
    
    # 验证码存储 - 内存存储
    _captcha_store = {}
    
    def __init__(self):
        """初始化验证码生成器"""
        pass
    
    def _generate_random_code(self, length: int = DEFAULT_LENGTH) -> str:
        """
        生成随机验证码
        
        Args:
            length: 验证码长度
            
        Returns:
            验证码字符串
        """
        return ''.join(random.choice(self.VALID_CHARS) for _ in range(length))
    
    def _generate_svg_content(self, code: str, 
                             width: int = DEFAULT_WIDTH, 
                             height: int = DEFAULT_HEIGHT) -> str:
        """
        生成SVG内容
        
        Args:
            code: 验证码
            width: 宽度
            height: 高度
            
        Returns:
            SVG字符串
        """
        # 背景色
        bg_color = '#FFFFFF'
        
        svg_parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        ]
        
        # 背景
        svg_parts.append(f'<rect width="100%" height="100%" fill="{bg_color}"/>')
        
        # 添加干扰线
        for _ in range(4):
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            x2 = random.randint(0, width)
            y2 = random.randint(0, height)
            color = random.choice(self.COLORS)
            svg_parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.5" opacity="0.6"/>')
        
        # 添加干扰点
        for _ in range(30):
            x = random.randint(0, width)
            y = random.randint(0, height)
            color = random.choice(self.COLORS)
            svg_parts.append(f'<circle cx="{x}" cy="{y}" r="1" fill="{color}" opacity="0.5"/>')
        
        # 绘制字符
        char_width = width / len(code)
        for i, char in enumerate(code):
            # 随机位置偏移
            x = i * char_width + char_width / 2 + random.randint(-5, 5)
            y = height / 2 + random.randint(-8, 8)
            
            # 随机旋转
            rotation = random.randint(-20, 20)
            
            # 随机颜色
            color = random.choice(self.COLORS)
            
            # 随机字体大小
            font_size = random.randint(24, 32)
            
            svg_parts.append(
                f'<text x="{x}" y="{y}" font-size="{font_size}" fill="{color}" '
                f'text-anchor="middle" dominant-baseline="middle" '
                f'font-family="Arial, sans-serif" font-weight="bold" '
                f'transform="rotate({rotation} {x} {y})">{char}</text>'
            )
        
        svg_parts.append('</svg>')
        
        return '\n'.join(svg_parts)
    
    def generate(self, length: Optional[int] = None, 
                width: Optional[int] = None,
                height: Optional[int] = None,
                captcha_id: Optional[str] = None) -> Tuple[str, str, str]:
        """
        生成验证码
        
        Args:
            length: 验证码长度
            width: SVG宽度
            height: SVG高度
            captcha_id: 验证码ID，不提供则自动生成
            
        Returns:
            (captcha_id, code, svg_content)
        """
        if length is None:
            length = self.DEFAULT_LENGTH
        if width is None:
            width = self.DEFAULT_WIDTH
        if height is None:
            height = self.DEFAULT_HEIGHT
        
        if captcha_id is None:
            captcha_id = self._generate_id()
        
        code = self._generate_random_code(length)
        svg_content = self._generate_svg_content(code, width, height)
        
        # 存储验证码
        self._captcha_store[captcha_id] = {
            'code': code,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=self.EXPIRY_MINUTES)
        }
        
        # 清理过期验证码
        self._cleanup_expired()
        
        return captcha_id, code, svg_content
    
    def _generate_id(self) -> str:
        """
        生成验证码ID
        
        Returns:
            随机ID
        """
        import uuid
        return str(uuid.uuid4())
    
    def verify(self, captcha_id: str, user_input: str, 
              case_sensitive: bool = False) -> bool:
        """
        验证验证码
        
        Args:
            captcha_id: 验证码ID
            user_input: 用户输入
            case_sensitive: 是否区分大小写
            
        Returns:
            是否验证成功
        """
        if captcha_id not in self._captcha_store:
            return False
        
        stored = self._captcha_store[captcha_id]
        
        # 检查是否过期
        if datetime.utcnow() > stored['expires_at']:
            del self._captcha_store[captcha_id]
            return False
        
        # 验证
        stored_code = stored['code']
        if not case_sensitive:
            stored_code = stored_code.upper()
            user_input = user_input.upper()
        
        # 验证成功后删除
        if stored_code == user_input:
            del self._captcha_store[captcha_id]
            return True
        
        return False
    
    def refresh(self, captcha_id: str, 
               length: Optional[int] = None,
               width: Optional[int] = None,
               height: Optional[int] = None) -> Tuple[str, str, str]:
        """
        刷新验证码（复用ID）
        
        Args:
            captcha_id: 原有验证码ID
            length: 验证码长度
            width: SVG宽度
            height: SVG高度
            
        Returns:
            (captcha_id, code, svg_content)
        """
        # 删除旧的
        if captcha_id in self._captcha_store:
            del self._captcha_store[captcha_id]
        
        # 生成新的，复用ID
        return self.generate(length, width, height, captcha_id)
    
    def _cleanup_expired(self):
        """清理过期的验证码"""
        now = datetime.utcnow()
        expired_ids = [
            cid for cid, data in self._captcha_store.items()
            if now > data['expires_at']
        ]
        for cid in expired_ids:
            del self._captcha_store[cid]
    
    def clear_all(self):
        """清除所有验证码"""
        self._captcha_store.clear()
