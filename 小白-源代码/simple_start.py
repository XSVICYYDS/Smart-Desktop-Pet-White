"""
最简单的测试：只导入main模块
"""
import sys
import os

print("开始最简单的测试...")

# 添加路径
BASE_DIR = r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\小白-源代码"
sys.path.insert(0, BASE_DIR)

print("1. 尝试导入QApplication...")
try:
    from PyQt5.QtWidgets import QApplication
    print("   ✓ 成功")
except Exception as e:
    print(f"   ✗ 失败: {e}")
    sys.exit(1)

print("2. 尝试导入DesktopPet...")
try:
    from main import DesktopPet
    print("   ✓ 成功")
except Exception as e:
    print(f"   ✗ 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("3. 创建QApplication...")
app = QApplication(sys.argv)
print("   ✓ 成功")

print("4. 创建DesktopPet...")
try:
    pet = DesktopPet()
    print("   ✓ 成功")
except Exception as e:
    print(f"   ✗ 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("5. 调用pet.show()...")
pet.show()
print("   ✓ 成功")

print("\n" + "=" * 50)
print("测试完成！小白应该已经显示了。")
print("=" * 50)
print("\n如果小白仍未显示，请告诉我，我将进一步诊断。")
print("\n启动应用循环...")

# 运行应用
sys.exit(app.exec_())
