"""
直接测试小白是否显示
"""
import sys
import os

# 添加项目根目录到系统路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("开始直接测试...")

# 导入必要的模块
from PyQt5.QtWidgets import QApplication

print("创建 QApplication...")
app = QApplication(sys.argv)

from main import DesktopPet

print("创建 DesktopPet...")
pet = DesktopPet()

print(f"宠物窗口信息:")
print(f"  - 可见性: {pet.isVisible()}")
print(f"  - 窗口大小: {pet.width()} x {pet.height()}")
print(f"  - 窗口位置: ({pet.x()}, {pet.y()})")

print("\n调用 pet.show()...")
pet.show()

print(f"show()后:")
print(f"  - 可见性: {pet.isVisible()}")

# 强制处理事件
app.processEvents()

print(f"processEvents()后:")
print(f"  - 可见性: {pet.isVisible()}")

# 检查UI组件
if hasattr(pet, 'ui'):
    print("\n检查 UI 组件:")
    if hasattr(pet.ui, 'image'):
        img = pet.ui.image
        print(f"  - image 可见性: {img.isVisible()}")
        print(f"  - image 大小: {img.width()} x {img.height()}")
        
        # 检查是否有movie
        movie = img.movie()
        if movie:
            print(f"  - image 有动画: ✓")
            print(f"  - 动画状态: {'运行中' if movie.state() == movie.Running else '已停止'}")
        else:
            print(f"  - image 没有动画: ✗")

print("\n应用正在运行...")
sys.exit(app.exec_())
