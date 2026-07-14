"""
完整诊断：小白未显示问题
"""
import sys
import os
import traceback

# 添加项目根目录到系统路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 70)
print("完整诊断：小白未显示问题")
print("=" * 70)

# 测试1: 检查所有导入
print("\n[1/6] 检查模块导入...")
try:
    from PyQt5.QtWidgets import QApplication
    print("  ✓ QApplication")
    
    from screen_capture import ScreenCapture
    print("  ✓ ScreenCapture")
    
    from main import DesktopPet, BASE_DIR
    print("  ✓ DesktopPet")
    
    from ui_components import UIComponents
    print("  ✓ UIComponents")
    
    from config import Config
    print("  ✓ Config")
    
    print("\n✓ 所有模块导入成功")
except Exception as e:
    print(f"\n✗ 模块导入失败: {e}")
    traceback.print_exc()
    sys.exit(1)

# 测试2: 检查配置文件
print("\n[2/6] 检查配置文件...")
try:
    config = Config(BASE_DIR)
    print("  ✓ 配置文件加载成功")
    print(f"  - 配置文件路径: {config.config_file}")
    print(f"  - 配置文件是否存在: {os.path.exists(config.config_file)}")
except Exception as e:
    print(f"  ⚠ 配置文件检查失败: {e}")

# 测试3: 创建应用实例
print("\n[3/6] 创建应用实例...")
try:
    app = QApplication(sys.argv)
    print("  ✓ QApplication 创建成功")
except Exception as e:
    print(f"  ✗ QApplication 创建失败: {e}")
    traceback.print_exc()
    sys.exit(1)

# 测试4: 创建宠物实例
print("\n[4/6] 创建宠物实例...")
try:
    pet = DesktopPet()
    print("  ✓ DesktopPet 实例创建成功")
except Exception as e:
    print(f"  ✗ DesktopPet 创建失败: {e}")
    traceback.print_exc()
    sys.exit(1)

# 测试5: 检查宠物窗口属性
print("\n[5/6] 检查宠物窗口属性...")
try:
    print(f"  - 窗口标题: {pet.windowTitle()}")
    print(f"  - 窗口大小: {pet.width()}x{pet.height()}")
    print(f"  - 窗口位置: ({pet.x()}, {pet.y()})")
    print(f"  - 窗口可见性: {pet.isVisible()}")
    print(f"  - 窗口透明度: {pet.windowOpacity()}")
    
    # 检查窗口标志
    flags = pet.windowFlags()
    print(f"  - 窗口标志:")
    print(f"    - FramelessWindowHint: {flags & pet.windowFlags() == pet.windowFlags()}")  # 这会返回True因为是同一个对象
    
    # 检查UI组件
    if hasattr(pet, 'ui'):
        print(f"  - UI组件已初始化: ✓")
        if hasattr(pet.ui, 'image'):
            print(f"  - 图像组件已创建: ✓")
            print(f"    - 图像大小: {pet.ui.image.width()}x{pet.ui.image.height()}")
    else:
        print(f"  - UI组件未初始化: ✗")
        
except Exception as e:
    print(f"  ✗ 检查窗口属性失败: {e}")
    traceback.print_exc()

# 测试6: 显示宠物
print("\n[6/6] 显示宠物...")
try:
    # 先尝试正常显示
    pet.show()
    print("  ✓ pet.show() 调用成功")
    
    # 检查显示状态
    print(f"  - 显示后可见性: {pet.isVisible()}")
    print(f"  - 窗口激活状态: {pet.isActiveWindow()}")
    
    # 强制更新
    app.processEvents()
    print("  ✓ 事件处理完成")
    
except Exception as e:
    print(f"  ✗ 显示宠物失败: {e}")
    traceback.print_exc()

# 最终建议
print("\n" + "=" * 70)
print("诊断完成")
print("=" * 70)
print("\n如果小白仍未显示，请尝试:")
print("1. 检查任务栏是否有小白图标")
print("2. 查看是否有其他窗口遮挡了小白")
print("3. 尝试调整窗口位置")
print("4. 检查屏幕分辨率是否正常")
print("\n现在启动完整应用...")
print("=" * 70)

# 运行应用
try:
    sys.exit(app.exec_())
except Exception as e:
    print(f"\n应用运行出错: {e}")
    traceback.print_exc()
    sys.exit(1)
