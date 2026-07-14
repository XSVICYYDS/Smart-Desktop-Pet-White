"""
JWT密钥持久化验证脚本
简单演示密钥持久化和令牌跨重启有效性
"""

import sys
import os
import tempfile
import shutil

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from auth.core.jwt_manager import JWTManager


def main():
    print("=" * 70)
    print("JWT Key Persistence Verification")
    print("=" * 70)
    
    # 创建临时目录
    test_dir = tempfile.mkdtemp(prefix="jwt_verify_")
    print(f"\nUsing test directory: {test_dir}")
    
    try:
        # ========== Part 1: Key Persistence ==========
        print("\n" + "-" * 70)
        print("Part 1: Key Persistence")
        print("-" * 70)
        
        print("\n1.1 Creating first JWTManager...")
        jwt1 = JWTManager(storage_dir=test_dir)
        print(f"    Generated key: {jwt1.current_secret[:30]}...")
        
        print("\n1.2 Checking key file...")
        key_file = os.path.join(test_dir, 'jwt_secret.key')
        print(f"    Key file exists: {os.path.exists(key_file)}")
        
        print("\n1.3 Creating second JWTManager (simulating restart)...")
        jwt2 = JWTManager(storage_dir=test_dir)
        print(f"    Loaded key: {jwt2.current_secret[:30]}...")
        
        keys_match = jwt1.current_secret == jwt2.current_secret
        print(f"\n    Keys match: {keys_match}")
        
        if keys_match:
            print("    [OK] Key persistence works correctly!")
        else:
            print("    [ERROR] Key persistence failed!")
            return False
        
        # ========== Part 2: Token Validity After Restart ==========
        print("\n" + "-" * 70)
        print("Part 2: Token Validity After Restart")
        print("-" * 70)
        
        print("\n2.1 Generating token with first JWTManager...")
        token = jwt1.generate_token("user123", "testuser", "user")
        print(f"    Token: {token[:50]}...")
        
        print("\n2.2 Verifying token with first JWTManager...")
        payload1 = jwt1.verify_token(token)
        print(f"    Verified: {payload1 is not None}")
        print(f"    Username: {payload1.get('username') if payload1 else 'N/A'}")
        
        print("\n2.3 Verifying token with second JWTManager (after restart)...")
        payload2 = jwt2.verify_token(token)
        print(f"    Verified: {payload2 is not None}")
        print(f"    Username: {payload2.get('username') if payload2 else 'N/A'}")
        
        if payload1 and payload2 and payload1 == payload2:
            print("\n    [OK] Token remains valid after restart!")
        else:
            print("\n    [ERROR] Token invalid after restart!")
            return False
        
        # ========== Part 3: Key Rotation ==========
        print("\n" + "-" * 70)
        print("Part 3: Key Rotation")
        print("-" * 70)
        
        print("\n3.1 Rotating key...")
        old_key = jwt1.current_secret
        new_key = jwt1.rotate_secret_key()
        print(f"    Old key: {old_key[:30]}...")
        print(f"    New key: {new_key[:30]}...")
        print(f"    Keys different: {old_key != new_key}")
        
        print("\n3.2 Verifying old token with rotated JWTManager...")
        payload3 = jwt1.verify_token(token)
        print(f"    Old token verified: {payload3 is not None}")
        
        if payload3:
            print("    [OK] Old token still valid after key rotation!")
        else:
            print("    [ERROR] Old token invalid after key rotation!")
            return False
        
        # ========== Summary ==========
        print("\n" + "=" * 70)
        print("ALL VERIFICATIONS PASSED!")
        print("JWT key persistence and token validity after restart work correctly.")
        print("=" * 70)
        
        return True
        
    finally:
        # Cleanup
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
            print(f"\nCleanup: {test_dir}")


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
