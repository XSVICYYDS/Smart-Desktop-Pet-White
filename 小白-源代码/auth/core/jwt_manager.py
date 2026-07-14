"""
JWT令牌管理器
提供令牌的生成、验证和刷新功能
"""

import json
import hmac
import hashlib
import base64
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import os


class JWTManager:
    """
    JWT令牌管理器类
    实现简化版的JWT功能（避免额外依赖）
    """
    
    # 默认配置
    DEFAULT_EXPIRY_DAYS = 7
    REFRESH_BEFORE_HOURS = 1
    SECRET_KEY = None
    
    def __init__(self, secret_key: Optional[str] = None, storage_dir: Optional[str] = None):
        """
        初始化JWT管理器
        
        Args:
            secret_key: 签名密钥，不提供则自动从文件加载或生成
            storage_dir: 密钥存储目录，不提供则使用默认目录
        """
        self.storage_dir = storage_dir
        
        if secret_key:
            # 外部指定密钥，直接使用
            self.current_secret = secret_key
            self.previous_secrets: list = []
        else:
            # 加载或生成密钥
            self.current_secret = self._load_or_generate_secret_key()
            self.previous_secrets = self._load_previous_secrets()
    
    def _get_storage_dir(self) -> str:
        """获取密钥存储目录"""
        if self.storage_dir is None:
            self.storage_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                'data'
            )
        return self.storage_dir
    
    def _load_or_generate_secret_key(self) -> str:
        """
        加载或生成JWT密钥
        
        Returns:
            JWT密钥字符串
        """
        storage_dir = self._get_storage_dir()
        os.makedirs(storage_dir, exist_ok=True)
        secret_key_file = os.path.join(storage_dir, 'jwt_secret.key')
        
        # 尝试加载已有密钥
        if os.path.exists(secret_key_file):
            try:
                with open(secret_key_file, 'r', encoding='utf-8') as f:
                    secret_key = f.read().strip()
                    if secret_key:
                        return secret_key
            except Exception:
                pass  # 文件损坏或读取失败，重新生成
        
        # 生成新密钥并保存
        secret_key = self._generate_secret_key()
        self._save_secret_key(secret_key)
        return secret_key
    
    def _save_secret_key(self, secret_key: str) -> bool:
        """
        保存密钥到文件
        
        Args:
            secret_key: 要保存的密钥
            
        Returns:
            是否保存成功
        """
        storage_dir = self._get_storage_dir()
        os.makedirs(storage_dir, exist_ok=True)
        secret_key_file = os.path.join(storage_dir, 'jwt_secret.key')
        
        try:
            with open(secret_key_file, 'w', encoding='utf-8') as f:
                f.write(secret_key)
            # 设置文件权限（仅所有者可读写）
            try:
                os.chmod(secret_key_file, 0o600)
            except Exception:
                pass  # Windows上可能不支持chmod
            return True
        except Exception:
            return False
    
    def _load_previous_secrets(self) -> list:
        """
        加载历史密钥列表
        
        Returns:
            历史密钥列表
        """
        storage_dir = self._get_storage_dir()
        previous_secrets_file = os.path.join(storage_dir, 'jwt_secret_history.json')
        
        if os.path.exists(previous_secrets_file):
            try:
                with open(previous_secrets_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        
        return []
    
    def _save_previous_secrets(self) -> bool:
        """
        保存历史密钥列表
        
        Returns:
            是否保存成功
        """
        storage_dir = self._get_storage_dir()
        os.makedirs(storage_dir, exist_ok=True)
        previous_secrets_file = os.path.join(storage_dir, 'jwt_secret_history.json')
        
        try:
            with open(previous_secrets_file, 'w', encoding='utf-8') as f:
                json.dump(self.previous_secrets, f, ensure_ascii=False, indent=2)
            return True
        except Exception:
            return False
    
    def rotate_secret_key(self) -> str:
        """
        轮换密钥，返回新密钥
        
        Returns:
            新的密钥字符串
        """
        old_secret = self.current_secret
        
        # 将当前密钥移入历史密钥列表
        self.previous_secrets.insert(0, {
            'secret': old_secret,
            'created_at': datetime.utcnow().isoformat()
        })
        
        # 保留最近3个密钥，允许渐进式迁移
        if len(self.previous_secrets) > 3:
            self.previous_secrets = self.previous_secrets[:3]
        
        # 生成新密钥
        new_secret = self._generate_secret_key()
        self.current_secret = new_secret
        
        # 保存到文件
        self._save_secret_key(new_secret)
        self._save_previous_secrets()
        
        return new_secret
    
    def _generate_secret_key(self) -> str:
        """
        生成安全的随机密钥
        
        Returns:
            随机密钥
        """
        return base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8')
    
    def _base64url_encode(self, data: bytes) -> str:
        """
        Base64 URL安全编码
        
        Args:
            data: 要编码的数据
            
        Returns:
            编码后的字符串
        """
        encoded = base64.urlsafe_b64encode(data)
        return encoded.rstrip(b'=').decode('utf-8')
    
    def _base64url_decode(self, data: str) -> bytes:
        """
        Base64 URL安全解码
        
        Args:
            data: 要解码的字符串
            
        Returns:
            解码后的数据
        """
        padding_needed = 4 - len(data) % 4
        if padding_needed < 4:
            data += '=' * padding_needed
        return base64.urlsafe_b64decode(data.encode('utf-8'))
    
    def _create_signature(self, header_b64: str, payload_b64: str, secret: Optional[str] = None) -> str:
        """
        创建签名
        
        Args:
            header_b64: 头部的base64编码
            payload_b64: 载荷的base64编码
            secret: 要使用的密钥，不提供则使用当前密钥
            
        Returns:
            签名的base64编码
        """
        key = secret if secret else self.current_secret
        message = f"{header_b64}.{payload_b64}".encode('utf-8')
        signature = hmac.new(
            key.encode('utf-8'),
            message,
            hashlib.sha256
        ).digest()
        return self._base64url_encode(signature)
    
    def generate_token(self, user_id: str, username: str, role: str, 
                       expiry_days: Optional[int] = None, 
                       extra_claims: Optional[Dict] = None) -> str:
        """
        生成JWT令牌
        
        Args:
            user_id: 用户ID
            username: 用户名
            role: 用户角色
            expiry_days: 有效期天数，默认7天
            extra_claims: 额外的声明信息
            
        Returns:
            JWT令牌字符串
        """
        if expiry_days is None:
            expiry_days = self.DEFAULT_EXPIRY_DAYS
        
        now = datetime.utcnow()
        expiry = now + timedelta(days=expiry_days)
        
        # 构建头部
        header = {
            "alg": "HS256",
            "typ": "JWT"
        }
        
        # 构建载荷
        payload = {
            "sub": user_id,
            "username": username,
            "role": role,
            "iat": int(now.timestamp()),
            "exp": int(expiry.timestamp())
        }
        
        # 添加额外声明
        if extra_claims:
            payload.update(extra_claims)
        
        # 编码
        header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
        payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
        
        header_b64 = self._base64url_encode(header_json)
        payload_b64 = self._base64url_encode(payload_json)
        signature_b64 = self._create_signature(header_b64, payload_b64)
        
        return f"{header_b64}.{payload_b64}.{signature_b64}"
    
    def _verify_with_secret(self, token: str, secret: str) -> Optional[Dict[str, Any]]:
        """
        使用指定密钥验证令牌
        
        Args:
            token: JWT令牌字符串
            secret: 要使用的密钥
            
        Returns:
            成功返回载荷数据，失败返回None
        """
        try:
            # 分割令牌
            parts = token.split('.')
            if len(parts) != 3:
                return None
            
            header_b64, payload_b64, signature_b64 = parts
            
            # 验证签名
            expected_signature = self._create_signature(header_b64, payload_b64, secret)
            if not hmac.compare_digest(signature_b64, expected_signature):
                return None
            
            # 解码载荷
            payload_json = self._base64url_decode(payload_b64)
            payload = json.loads(payload_json.decode('utf-8'))
            
            # 检查过期时间
            if 'exp' in payload:
                expiry = datetime.fromtimestamp(payload['exp'], tz=None)
                if datetime.utcnow() > expiry:
                    return None
            
            return payload
            
        except Exception:
            return None
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        验证JWT令牌，支持历史密钥验证
        
        Args:
            token: JWT令牌字符串
            
        Returns:
            成功返回载荷数据，失败返回None
        """
        # 首先尝试当前密钥
        result = self._verify_with_secret(token, self.current_secret)
        if result:
            return result
        
        # 尝试历史密钥（支持密钥轮换期间的令牌验证）
        for secret_data in self.previous_secrets:
            result = self._verify_with_secret(token, secret_data['secret'])
            if result:
                return result
        
        return None
    
    def should_refresh(self, payload: Dict[str, Any]) -> bool:
        """
        检查是否需要刷新令牌
        
        Args:
            payload: 令牌载荷
            
        Returns:
            是否需要刷新
        """
        if 'exp' not in payload:
            return True
        
        expiry = datetime.fromtimestamp(payload['exp'], tz=None)
        refresh_before = expiry - timedelta(hours=self.REFRESH_BEFORE_HOURS)
        
        return datetime.utcnow() >= refresh_before
    
    def refresh_token(self, token: str, expiry_days: Optional[int] = None) -> Optional[str]:
        """
        刷新令牌
        
        Args:
            token: 旧的JWT令牌
            expiry_days: 新令牌的有效期
            
        Returns:
            新的JWT令牌，失败返回None
        """
        payload = self.verify_token(token)
        if not payload:
            return None
        
        # 检查是否可以刷新（即使快过期也可以）
        if 'exp' in payload:
            expiry = datetime.fromtimestamp(payload['exp'], tz=None)
            # 允许在过期后1小时内仍可刷新
            grace_period = timedelta(hours=1)
            if datetime.utcnow() > expiry + grace_period:
                return None
        
        # 生成新令牌
        user_id = payload.get('sub', '')
        username = payload.get('username', '')
        role = payload.get('role', '')
        
        # 保留额外声明，但移除iat和exp
        extra_claims = {k: v for k, v in payload.items() 
                       if k not in ['sub', 'username', 'role', 'iat', 'exp']}
        
        return self.generate_token(user_id, username, role, expiry_days, extra_claims)
    
    def get_expiry_time(self, token: str) -> Optional[datetime]:
        """
        获取令牌过期时间
        
        Args:
            token: JWT令牌
            
        Returns:
            过期时间，失败返回None
        """
        payload = self.verify_token(token)
        if payload and 'exp' in payload:
            return datetime.fromtimestamp(payload['exp'], tz=None)
        return None
    
    def get_user_info(self, token: str) -> Optional[Dict[str, Any]]:
        """
        从令牌中获取用户信息
        
        Args:
            token: JWT令牌
            
        Returns:
            用户信息字典，失败返回None
        """
        payload = self.verify_token(token)
        if payload:
            return {
                'user_id': payload.get('sub', ''),
                'username': payload.get('username', ''),
                'role': payload.get('role', '')
            }
        return None
