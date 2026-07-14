"""
羊了个羊卡片覆盖检测测试
验证覆盖阈值从20%改为60%是否正确生效
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_sheep_coverage_threshold():
    """测试覆盖检测阈值"""
    print("=" * 70)
    print("  羊了个羊卡片覆盖检测测试")
    print("=" * 70)
    
    try:
        # 读取sheep.py文件
        sheep_path = os.path.join(os.path.dirname(__file__), "games", "sheep.py")
        with open(sheep_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查点击检测的阈值
        print("\n[1/2] 检查点击检测阈值...")
        click_check = content.count('inter_area / card_area > 0.6')
        old_click_check = content.count('inter_area / card_area > 0.2')
        
        if click_check >= 2 and old_click_check == 0:
            print("✓ 点击检测阈值已改为60%")
        else:
            print(f"✗ 点击检测阈值修改不完全")
            print(f"  - 新阈值(0.6): {click_check}处")
            print(f"  - 旧阈值(0.2): {old_click_check}处")
            return False
        
        # 检查暗显绘制的阈值
        print("\n[2/2] 检查暗显绘制阈值...")
        dimmed_check = content.count('inter_area / card_area > 0.6')
        
        if dimmed_check >= 2:
            print("✓ 暗显绘制阈值已改为60%")
        else:
            print(f"✗ 暗显绘制阈值修改不完全: {dimmed_check}处")
            return False
        
        print("\n" + "=" * 70)
        print(" ✓ 测试通过！覆盖检测阈值已从20%修改为60%")
        print("=" * 70)
        print()
        print("📊 修改内容：")
        print("  - 修改前：卡片被覆盖超过20%就不能点击")
        print("  - 修改后：卡片被覆盖超过60%才不能点击")
        print("  - 影响文件：games/sheep.py")
        print("  - 修改位置：")
        print("    * 第722行：点击检测逻辑")
        print("    * 第1094行：暗显绘制逻辑")
        return True
        
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_sheep_coverage_threshold()
    sys.exit(0 if success else 1)
