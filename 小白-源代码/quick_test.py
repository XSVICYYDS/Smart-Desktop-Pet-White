"""
快速验证截图功能
"""
import sys
import os

# 添加项目根目录到系统路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("快速验证截图功能...")

try:
    # 导入必要的模块
    from screen_capture import ScreenCapture
    from PyQt5.QtWidgets import QApplication
    
    print("✓ 模块导入成功")
    
    # 创建应用
    app = QApplication(sys.argv)
    print("✓ 应用创建成功")
    
    # 测试ScreenCapture
    capture = ScreenCapture()
    print("✓ ScreenCapture创建成功")
    print(f"  - parent_window: {capture.parent_window}")
    print(f"  - is_selecting: {capture.is_selecting}")
    
    print("\n所有验证通过！截图功能应该可以正常工作。")
    
except Exception as e:
    print(f"\n✗ 验证失败: {e}")
    import traceback
    traceback.print_exc()
