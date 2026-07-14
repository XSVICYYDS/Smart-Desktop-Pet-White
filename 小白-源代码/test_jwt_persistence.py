"""
JWT密钥持久化测试脚本
测试密钥是否正确持久化和加载
"""

import sys
import os
import shutil
import tempfile

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from auth.core.jwt_manager import JWTManager


def test_key_persistence():
    """Test key persistence"""
    print("=" * 60)
    print("Test 1: Key Persistence")
    print("=" * 60)
    
    # 创建临时目录用于测试
    test_dir = tempfile.mkdtemp(prefix="jwt_test_")
    print(f"Test directory: {test_dir}")
    
    try:
        # 第一次创建JWTManager，应该生成新密钥
        print("\nStep 1: First JWTManager creation...")
        jwt1 = JWTManager(storage_dir=test_dir)
        key1 = jwt1.current_secret
        print(f"Generated key: {key1[:20]}...")
        
        # 检查密钥文件是否生成
        key_file = os.path.join(test_dir, 'jwt_secret.key')
        assert os.path.exists(key_file), "Key file not generated"
        print("[OK] Key file generated")
        
        # 读取文件内容
        with open(key_file, 'r', encoding='utf-8') as f:
            file_key = f.read().strip()
        assert file_key == key1, "Key file content mismatch"
        print("[OK] Key file content correct")
        
        # 第二次创建JWTManager，应该加载已有密钥
        print("\nStep 2: Second JWTManager creation (should load existing key)...")
        jwt2 = JWTManager(storage_dir=test_dir)
        key2 = jwt2.current_secret
        print(f"Loaded key: {key2[:20]}...")
        
        assert key1 == key2, "Keys are different, persistence failed"
        print("[OK] Key persistence successful, same key in both instances")
        
        print("\n[SUCCESS] Test 1 passed: Key persistence works correctly")
        return True
        
    finally:
        # 清理测试目录
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
            print(f"\nCleanup test directory: {test_dir}")


def test_token_after_restart():
    """Test if token remains valid after restart"""
    print("\n" + "=" * 60)
    print("Test 2: Token Validity After Restart")
    print("=" * 60)
    
    test_dir = tempfile.mkdtemp(prefix="jwt_test_restart_")
    print(f"Test directory: {test_dir}")
    
    try:
        # First run: Create JWTManager and generate token
        print("\nStep 1: First run - Generate token...")
        jwt1 = JWTManager(storage_dir=test_dir)
        token = jwt1.generate_token("user123", "testuser", "user")
        print(f"Generated token: {token[:50]}...")
        
        # Verify token is valid
        payload1 = jwt1.verify_token(token)
        assert payload1 is not None, "Token verification failed"
        print(f"[OK] Token verified: User {payload1.get('username')}")
        
        # Simulate restart: Create new JWTManager instance
        print("\nStep 2: Simulate restart - Create new JWTManager instance...")
        jwt2 = JWTManager(storage_dir=test_dir)
        print(f"Loaded key: {jwt2.current_secret[:20]}...")
        
        # Verify previous token is still valid
        print("\nStep 3: Verify token after restart...")
        payload2 = jwt2.verify_token(token)
        assert payload2 is not None, "Token invalid after restart"
        print(f"[OK] Token still valid: User {payload2.get('username')}")
        
        # Verify payload is consistent
        assert payload1 == payload2, "Payload mismatch"
        print("[OK] Payload consistent")
        
        print("\n[SUCCESS] Test 2 passed: Token remains valid after restart")
        return True
        
    finally:
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
            print(f"\nCleanup: {test_dir}")


def test_key_rotation():
    """Test key rotation functionality"""
    print("\n" + "=" * 60)
    print("Test 3: Key Rotation")
    print("=" * 60)
    
    test_dir = tempfile.mkdtemp(prefix="jwt_test_rotation_")
    print(f"Test directory: {test_dir}")
    
    try:
        # First run: Generate token
        print("\nStep 1: Generate token...")
        jwt1 = JWTManager(storage_dir=test_dir)
        old_key = jwt1.current_secret
        print(f"Current key: {old_key[:20]}...")
        
        token = jwt1.generate_token("user123", "testuser", "user")
        print(f"Generated token: {token[:50]}...")
        
        # Verify old token is valid
        payload1 = jwt1.verify_token(token)
        assert payload1 is not None, "Old token verification failed"
        print("[OK] Old token valid")
        
        # Rotate key
        print("\nStep 2: Rotate key...")
        new_key = jwt1.rotate_secret_key()
        print(f"New key: {new_key[:20]}...")
        
        assert old_key != new_key, "Rotated key should be different"
        print("[OK] Key rotated")
        
        # Verify old token is still valid (using historical key)
        print("\nStep 3: Verify old token after rotation...")
        payload2 = jwt1.verify_token(token)
        assert payload2 is not None, "Old token should still be valid after rotation"
        print(f"[OK] Old token still valid: User {payload2.get('username')}")
        
        # Verify historical keys
        assert len(jwt1.previous_secrets) > 0, "Historical keys list is empty"
        assert jwt1.previous_secrets[0]['secret'] == old_key, "Historical key incorrect"
        print(f"[OK] Historical keys saved: {len(jwt1.previous_secrets)} keys")
        
        # Simulate restart
        print("\nStep 4: Simulate restart...")
        jwt2 = JWTManager(storage_dir=test_dir)
        assert jwt2.current_secret == new_key, "Key should be consistent after restart"
        
        payload3 = jwt2.verify_token(token)
        assert payload3 is not None, "Old token should still be valid after restart"
        print(f"[OK] Old token still valid after restart: User {payload3.get('username')}")
        
        # Generate new token and verify
        new_token = jwt2.generate_token("user456", "newuser", "admin")
        payload4 = jwt2.verify_token(new_token)
        assert payload4 is not None, "New token should be valid"
        assert payload4.get('username') == "newuser", "New token username incorrect"
        print(f"[OK] New token valid: User {payload4.get('username')}")
        
        print("\n[SUCCESS] Test 3 passed: Key rotation works correctly")
        return True
        
    finally:
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
            print(f"\nCleanup: {test_dir}")


def test_corrupted_key_file():
    """Test handling of corrupted key file"""
    print("\n" + "=" * 60)
    print("Test 4: Corrupted Key File Handling")
    print("=" * 60)
    
    test_dir = tempfile.mkdtemp(prefix="jwt_test_corrupt_")
    print(f"Test directory: {test_dir}")
    
    try:
        # First run: Generate key
        print("\nStep 1: First JWTManager creation...")
        jwt1 = JWTManager(storage_dir=test_dir)
        key1 = jwt1.current_secret
        print(f"Generated key: {key1[:20]}...")
        
        # Corrupt the key file
        print("\nStep 2: Corrupt key file...")
        key_file = os.path.join(test_dir, 'jwt_secret.key')
        with open(key_file, 'w', encoding='utf-8') as f:
            f.write("CORRUPTED_KEY_DATA")
        print("[OK] Key file corrupted")
        
        # Recreate JWTManager
        print("\nStep 3: Recreate JWTManager...")
        jwt2 = JWTManager(storage_dir=test_dir)
        key2 = jwt2.current_secret
        print(f"New key: {key2[:20]}...")
        
        # New key should be generated since the old one is corrupted
        assert len(key2) > 0, "New key should not be empty"
        print("[OK] System handles corrupted key file correctly")
        
        print("\n[SUCCESS] Test 4 passed: Corrupted key file handling works")
        return True
        
    finally:
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
            print(f"\nCleanup: {test_dir}")


def test_multiple_rotation():
    """Test multiple key rotations"""
    print("\n" + "=" * 60)
    print("Test 5: Multiple Key Rotations")
    print("=" * 60)
    
    test_dir = tempfile.mkdtemp(prefix="jwt_test_multi_rotation_")
    print(f"Test directory: {test_dir}")
    
    try:
        # Initial creation
        print("\nStep 1: Initial creation...")
        jwt = JWTManager(storage_dir=test_dir)
        tokens = []
        keys = [jwt.current_secret]
        
        # Generate multiple tokens
        for i in range(5):
            token = jwt.generate_token(f"user{i}", f"testuser{i}", "user")
            tokens.append(token)
            print(f"Generated token {i+1}")
        
        # Perform multiple rotations
        print("\nStep 2: Perform multiple key rotations...")
        for i in range(3):
            new_key = jwt.rotate_secret_key()
            keys.append(new_key)
            print(f"Rotation {i+1}: {new_key[:20]}...")
        
        # Verify all old tokens are still valid
        print("\nStep 3: Verify all old tokens...")
        for i, token in enumerate(tokens):
            payload = jwt.verify_token(token)
            assert payload is not None, f"Token {i} should still be valid"
            print(f"[OK] Token {i} still valid: User {payload.get('username')}")
        
        # Verify historical keys count (max 3)
        assert len(jwt.previous_secrets) <= 3, "Historical keys should not exceed 3"
        print(f"[OK] Historical keys count correct: {len(jwt.previous_secrets)}")
        
        # Simulate restart
        print("\nStep 4: Simulate restart...")
        jwt2 = JWTManager(storage_dir=test_dir)
        
        # Verify all tokens are still valid
        for i, token in enumerate(tokens):
            payload = jwt2.verify_token(token)
            assert payload is not None, f"Token {i} should still be valid after restart"
            print(f"[OK] Token {i} still valid after restart: User {payload.get('username')}")
        
        print("\n[SUCCESS] Test 5 passed: Multiple key rotations work correctly")
        return True
        
    finally:
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
            print(f"\nCleanup: {test_dir}")


def main():
    """Main function, run all tests"""
    print("\n" + "=" * 60)
    print("JWT Key Persistence Feature Tests")
    print("=" * 60)
    
    all_passed = True
    
    # Run all tests
    tests = [
        test_key_persistence,
        test_token_after_restart,
        test_key_rotation,
        test_corrupted_key_file,
        test_multiple_rotation,
    ]
    
    for test in tests:
        try:
            result = test()
            if not result:
                all_passed = False
        except Exception as e:
            print(f"\n[FAIL] Test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            all_passed = False
    
    # Summary
    print("\n" + "=" * 60)
    if all_passed:
        print("ALL TESTS PASSED! JWT key persistence works correctly.")
    else:
        print("SOME TESTS FAILED! Please check the output above.")
    print("=" * 60)
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
