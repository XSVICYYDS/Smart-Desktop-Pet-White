"""
启动小白桌面宠物
"""
import sys
import os

# 获取项目根目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 添加到系统路径
sys.path.insert(0, BASE_DIR)

# 导入并启动应用
from PyQt5.QtWidgets import QApplication
from main import DesktopPet

if __name__ == '__main__':
    app = QApplication(sys.argv)
    pet = DesktopPet()
    print("✓ 小白桌面宠物已启动")
    print("提示：请检查桌面是否有小白宠物显示")
    sys.exit(app.exec_())
