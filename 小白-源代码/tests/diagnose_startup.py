"""
诊断小白启动问题
"""
import sys
import os
import traceback

# 添加项目根目录到系统路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("诊断小白启动问题")
print("=" * 60)

# 测试1: 基础导入测试
print("\n[测试1] 基础导入测试...")
try:
    import PyQt5
    from PyQt5.QtWidgets import QApplication
    print("✓ PyQt5 基础导入成功")
except Exception as e:
    print(f"✗ PyQt5 导入失败: {e}")
    sys.exit(1)

# 测试2: 测试screen_capture模块
print("\n[测试2] screen_capture 模块测试...")
try:
    from screen_capture import ScreenCapture
    print("✓ screen_capture 模块导入成功")
except Exception as e:
    print(f"✗ screen_capture 模块导入失败: {e}")
    print("\n详细错误信息:")
    traceback.print_exc()
    print("\n建议: 检查 screen_capture.py 文件是否有语法错误")
    sys.exit(1)

# 测试3: 测试main模块导入
print("\n[测试3] main 模块导入测试...")
try:
    from main import DesktopPet, BASE_DIR
    print("✓ main 模块导入成功")
except Exception as e:
    print(f"✗ main 模块导入失败: {e}")
    print("\n详细错误信息:")
    traceback.print_exc()
    print("\n建议: 检查 main.py 中的导入语句")
    sys.exit(1)

# 测试4: 尝试启动应用
print("\n[测试4] 启动小白测试...")
try:
    app = QApplication(sys.argv)
    print("✓ QApplication 创建成功")
    
    pet = DesktopPet()
    print("✓ DesktopPet 实例创建成功")
    
    pet.show()
    print("✓ 宠物窗口显示成功")
    
    print("\n" + "=" * 60)
    print("诊断结果: 所有测试通过！")
    print("=" * 60)
    print("\n如果小白仍未显示，请尝试:")
    print("1. 检查任务栏是否有小白图标")
    print("2. 尝试点击桌面任意位置，看宠物是否在其他窗口后面")
    print("3. 重启应用程序")
    
    sys.exit(app.exec_())
    
except Exception as e:
    print(f"✗ 启动失败: {e}")
    print("\n详细错误信息:")
    traceback.print_exc()
    print("\n建议: 根据上述错误信息进行排查")
    sys.exit(1)
