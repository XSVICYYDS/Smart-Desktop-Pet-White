"""
测试截屏功能导入
"""
import sys
import os

# 添加项目根目录到系统路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("开始测试导入...")

try:
    # 测试导入
    from screen_capture import ScreenCapture
    print("✓ ScreenCapture 导入成功")
    
    # 测试导入依赖
    from PyQt5.QtWidgets import QApplication, QWidget
    print("✓ PyQt5 导入成功")
    
    # 测试ScreenCapture实例化
    app = QApplication(sys.argv)
    print("✓ QApplication 创建成功")
    
    capture = ScreenCapture()
    print("✓ ScreenCapture 实例创建成功")
    
    print("\n所有测试通过！")
    
except Exception as e:
    print(f"\n✗ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
