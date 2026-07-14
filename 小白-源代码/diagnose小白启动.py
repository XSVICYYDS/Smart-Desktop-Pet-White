"""
小白启动诊断脚本
"""
import sys
import os

# 添加项目根目录到系统路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 70)
print("小白桌面宠物 - 启动诊断")
print("=" * 70)

# 第一步：测试所有导入
print("\n[1] 测试模块导入...")
try:
    from PyQt5.QtWidgets import QApplication
    print("  ✓ PyQt5.QtWidgets.QApplication")
except Exception as e:
    print(f"  ✗ PyQt5.QtWidgets.QApplication: {e}")
    sys.exit(1)

try:
    from screen_capture import ScreenCapture
    print("  ✓ screen_capture.ScreenCapture")
except Exception as e:
    print(f"  ✗ screen_capture.ScreenCapture: {e}")
    sys.exit(1)

try:
    from main import DesktopPet, BASE_DIR
    print(f"  ✓ main.DesktopPet (BASE_DIR: {BASE_DIR})")
except Exception as e:
    print(f"  ✗ main.DesktopPet: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 第二步：创建应用
print("\n[2] 创建 QApplication...")
try:
    app = QApplication(sys.argv)
    print("  ✓ QApplication 创建成功")
except Exception as e:
    print(f"  ✗ QApplication 创建失败: {e}")
    sys.exit(1)

# 第三步：创建宠物实例
print("\n[3] 创建 DesktopPet 实例...")
try:
    pet = DesktopPet()
    print("  ✓ DesktopPet 实例创建成功")
except Exception as e:
    print(f"  ✗ DesktopPet 创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 第四步：检查宠物窗口属性
print("\n[4] 检查宠物窗口属性...")
print(f"  - 窗口宽度: {pet.width()}")
print(f"  - 窗口高度: {pet.height()}")
print(f"  - 窗口位置 X: {pet.x()}")
print(f"  - 窗口位置 Y: {pet.y()}")
print(f"  - 窗口透明度: {pet.windowOpacity()}")
print(f"  - 初始可见性: {pet.isVisible()}")

# 检查窗口标志
flags = pet.windowFlags()
print(f"  - 窗口标志:")
print(f"    - FramelessWindowHint: {'是' if flags & 1 << 0 else '否'}")
print(f"    - WindowStaysOnTopHint: {'是' if flags & 1 << 3 else '否'}")
print(f"    - Tool: {'是' if flags & 1 << 26 else '否'}")

# 第五步：检查UI组件
print("\n[5] 检查 UI 组件...")
if hasattr(pet, 'ui'):
    print("  ✓ pet.ui 存在")
    
    # 检查 image 组件
    if hasattr(pet.ui, 'image'):
        img = pet.ui.image
        print(f"  ✓ pet.ui.image 存在")
        print(f"    - image 宽度: {img.width()}")
        print(f"    - image 高度: {img.height()}")
        print(f"    - image 可见性: {img.isVisible()}")
        
        # 检查 movie
        movie = img.movie()
        if movie:
            print(f"  ✓ pet.ui.image 有 movie")
            print(f"    - movie 状态: {'运行中' if movie.state() == movie.Running else '已停止'}")
        else:
            print(f"  ⚠ pet.ui.image 没有 movie")
    else:
        print(f"  ✗ pet.ui.image 不存在")
else:
    print(f"  ✗ pet.ui 不存在")

# 第六步：显示宠物
print("\n[6] 显示宠物...")
try:
    pet.show()
    print("  ✓ pet.show() 调用成功")
    print(f"  - show() 后可见性: {pet.isVisible()}")
    
    # 强制更新
    app.processEvents()
    print("  ✓ app.processEvents() 调用成功")
    print(f"  - processEvents() 后可见性: {pet.isVisible()}")
    
except Exception as e:
    print(f"  ✗ 显示宠物失败: {e}")
    import traceback
    traceback.print_exc()

# 最终建议
print("\n" + "=" * 70)
print("诊断结果")
print("=" * 70)

if pet.isVisible():
    print("✓ 宠物窗口已成功显示")
    print("\n如果仍然看不到小白，请尝试:")
    print("1. 检查任务栏是否有小白图标")
    print("2. 尝试移动鼠标到屏幕中心区域")
    print("3. 检查是否有其他窗口遮挡")
else:
    print("⚠ 宠物窗口创建成功但未显示")
    print("\n可能的原因:")
    print("1. 窗口位置可能在屏幕外")
    print("2. 窗口透明度可能被设置为0")
    print("3. 可能有其他窗口遮挡")

print("\n启动完整应用...")
print("=" * 70)

# 运行应用
sys.exit(app.exec_())
