"""
小白桌面宠物 - 权限管理系统测试脚本
"""

import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from auth import get_auth_system, FeatureDefinitions, Role


def test_auth_system():
    """测试认证系统"""
    print("=" * 60)
    print("小白桌面宠物 - 权限管理系统测试")
    print("=" * 60)
    
    # 获取认证系统实例
    auth = get_auth_system()
    
    # 1. 测试基础功能（访客状态）
    print("\n[1] 测试访客权限...")
    print(f"  是否已登录: {auth.is_logged_in()}")
    print(f"  当前角色: {auth.get_current_user_roles()}")
    print(f"  是否VIP: {auth.is_vip()}")
    print(f"  是否管理员: {auth.is_admin()}")
    
    # 测试权限检查
    print(f"\n  基础宠物功能权限: {auth.has_permission('pet.basic')}")
    print(f"  Pro动画权限: {auth.has_permission('pet.pro_animations')}")
    print(f"  个人中心权限: {auth.has_permission('mycenter.profile')}")
    
    # 2. 测试验证码
    print("\n[2] 测试验证码...")
    captcha_id, captcha_code, svg_content = auth.generate_captcha()
    print(f"  验证码ID: {captcha_id}")
    print(f"  验证码值: {captcha_code}")
    print(f"  SVG长度: {len(svg_content)} 字符")
    print(f"  验证正确验证码: {auth.verify_captcha(captcha_id, captcha_code)}")
    print(f"  验证错误验证码: {auth.verify_captcha(captcha_id, 'WRONG')}")
    
    # 3. 测试登录（demo用户）
    print("\n[3] 测试登录...")
    print("  尝试登录 demo / Demo123!")
    
    # 重新生成验证码用于登录测试
    captcha_id, captcha_code, _ = auth.generate_captcha()
    
    success, msg, token = auth.login('demo', 'Demo123!', captcha_id, captcha_code)
    print(f"  登录结果: {'成功' if success else '失败'}")
    print(f"  消息: {msg}")
    if token:
        print(f"  Token长度: {len(token)}")
    
    # 4. 测试登录后的权限
    if success:
        print("\n[4] 测试登录后权限...")
        print(f"  是否已登录: {auth.is_logged_in()}")
        print(f"  当前用户: {auth.get_current_user()['username']}")
        print(f"  当前角色: {auth.get_current_user_roles()}")
        print(f"  是否VIP: {auth.is_vip()}")
        print(f"  Pro动画权限: {auth.has_permission('pet.pro_animations')}")
        print(f"  个人中心权限: {auth.has_permission('mycenter.profile')}")
        
        # 5. 测试VIP激活
        print("\n[5] 测试VIP激活...")
        print("  尝试用 VIP1234567890ABCDEF 激活...")
        vip_success, vip_msg = auth.activate_vip('VIP1234567890ABCD')
        print(f"  VIP激活结果: {'成功' if vip_success else '失败'}")
        print(f"  消息: {vip_msg}")
        
        if vip_success:
            print(f"  激活后是否VIP: {auth.is_vip()}")
            print(f"  VIP游戏权限: {auth.has_permission('games.vip')}")
        
        # 6. 登出
        print("\n[6] 测试登出...")
        auth.logout()
        print(f"  登出后是否已登录: {auth.is_logged_in()}")
    
    # 7. 测试管理员登录
    print("\n[7] 测试管理员登录...")
    captcha_id, captcha_code, _ = auth.generate_captcha()
    admin_success, admin_msg, admin_token = auth.login('admin', 'Admin123!', captcha_id, captcha_code)
    print(f"  管理员登录: {'成功' if admin_success else '失败'}")
    if admin_success:
        print(f"  是否管理员: {auth.is_admin()}")
        print(f"  用户管理权限: {auth.has_permission('admin.user_manage')}")
        auth.logout()
    
    # 8. 查看权限定义
    print("\n[8] 权限定义检查...")
    all_roles = FeatureDefinitions.get_all_roles()
    all_perms = FeatureDefinitions.get_all_permissions()
    print(f"  预定义角色数: {len(all_roles)}")
    print(f"  预定义权限数: {len(all_perms)}")
    
    # 9. 审计日志
    print("\n[9] 审计日志...")
    logs = auth.get_audit_logs(10)
    print(f"  最近日志数: {len(logs)}")
    for log in logs[:5]:
        print(f"    - {log['timestamp'][:19]} | {log['user_id'][:8]} | {log['action']}")
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)
    print("\n演示账户:")
    print("  普通用户: demo / Demo123!")
    print("  VIP用户: vip / Vip123!")
    print("  管理员: admin / Admin123!")


if __name__ == '__main__':
    test_auth_system()
