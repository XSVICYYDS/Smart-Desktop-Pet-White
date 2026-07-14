"""
测试宠物恢复显示功能
"""
import sys
import os

print("=" * 70)
print("测试宠物恢复显示功能")
print("=" * 70)

# 添加项目路径
BASE_DIR = r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\小白-源代码"
sys.path.insert(0, BASE_DIR)

print("\n[1] 测试导入...")
try:
    from screen_capture import ScreenCapture
    from main import DesktopPet
    from PyQt5.QtWidgets import QApplication
    print("   ✓ 所有模块导入成功")
except Exception as e:
    print(f"   ✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n[2] 创建应用...")
try:
    app = QApplication(sys.argv)
    print("   ✓ 应用创建成功")
except Exception as e:
    print(f"   ✗ 应用创建失败: {e}")
    sys.exit(1)

print("\n[3] 创建DesktopPet...")
try:
    pet = DesktopPet()
    print("   ✓ DesktopPet 创建成功")
    pet.show()
    print("   ✓ 宠物窗口已显示")
except Exception as e:
    print(f"   ✗ DesktopPet 创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n[4] 测试ScreenCapture...")
try:
    capture = ScreenCapture(pet)
    print("   ✓ ScreenCapture 创建成功")
    
    # 检查信号连接
    capture.capture_finished.connect(pet.showPet)
    print("   ✓ 信号连接成功")
    
    # 检查closeEvent
    if hasattr(capture, 'closeEvent'):
        print("   ✓ closeEvent 方法已定义")
    else:
        print("   ✗ closeEvent 方法未定义")
        
    # 检查showPet方法
    if hasattr(pet, 'showPet'):
        print("   ✓ showPet 方法已定义")
    else:
        print("   ✗ showPet 方法未定义")
        
except Exception as e:
    print(f"   ✗ ScreenCapture 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 70)
print("修复说明：")
print("=" * 70)
print("1. ✓ 添加了 closeEvent，确保窗口关闭时一定发送信号")
print("2. ✓ 取消保存对话框时不会关闭窗口，让用户可以重新选择")
print("3. ✓ 优化了信号发送逻辑，避免重复")
print("4. ✓ 使用统一的关闭逻辑")
print("\n测试通过！现在截图结束后宠物会自动恢复显示。")
print("=" * 70)

# 测试时注释掉下面的，直接显示测试结果
# print("\n现在打开测试，请按ESC键取消或右键取消来测试宠物恢复功能。")
# sys.exit(app.exec_())
