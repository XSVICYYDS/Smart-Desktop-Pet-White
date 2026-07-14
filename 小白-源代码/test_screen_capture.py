"""
截屏功能测试脚本
用于测试矩形区域截屏功能
"""
import sys
import os

# 添加项目根目录到系统路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt5.QtWidgets import QApplication, QMessageBox
from screen_capture import ScreenCapture


def testScreenCapture():
    """测试截屏功能
    
    启动应用程序并打开截屏工具
    """
    try:
        # 创建应用
        app = QApplication(sys.argv)
        
        # 显示提示信息
        print("正在启动截屏测试...")
        print("提示：")
        print("1. 使用鼠标左键拖动选择截取区域")
        print("2. 按ESC键取消截图")
        print("3. 选择区域后将弹出保存对话框")
        print()
        
        # 创建截屏工具
        capture = ScreenCapture()
        capture.exec_()
        
        print("截屏工具已关闭")
        return 0
    except Exception as e:
        print(f"测试失败: {e}")
        QMessageBox.critical(None, "测试失败", f"截屏测试失败:\n{e}")
        return 1


if __name__ == '__main__':
    sys.exit(testScreenCapture())
