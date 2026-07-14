"""
完整诊断并启动小白
"""
import sys
import os

print("=" * 70)
print(" 小白桌面宠物 - 完整诊断与启动 ")
print("=" * 70)

# 添加项目路径
BASE_DIR = r"c:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\小白-源代码"
sys.path.insert(0, BASE_DIR)

print("\n[1/8] 导入 PyQt5...")
try:
    from PyQt5.QtWidgets import QApplication
    from PyQt5.QtCore import Qt, QTimer
    from PyQt5.QtGui import QMovie
    print("    ✓ 成功")
except Exception as e:
    print(f"    ✗ 失败: {e}")
    sys.exit(1)

print("\n[2/8] 导入主模块...")
try:
    from main import DesktopPet, BASE_DIR as MAIN_BASE
    print(f"    ✓ 成功 (BASE_DIR: {MAIN_BASE})")
except Exception as e:
    print(f"    ✗ 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n[3/8] 导入屏幕截图模块...")
try:
    from screen_capture import ScreenCapture
    print("    ✓ 成功")
except Exception as e:
    print(f"    ✗ 失败: {e}")
    sys.exit(1)

print("\n[4/8] 创建 QApplication...")
try:
    app = QApplication(sys.argv)
    print("    ✓ 成功")
except Exception as e:
    print(f"    ✗ 失败: {e}")
    sys.exit(1)

print("\n[5/8] 创建 DesktopPet 实例...")
try:
    pet = DesktopPet()
    print("    ✓ 成功")
except Exception as e:
    print(f"    ✗ 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n[6/8] 检查宠物窗口属性...")
try:
    print(f"    窗口宽度: {pet.width()} px")
    print(f"    窗口高度: {pet.height()} px")
    print(f"    窗口位置: ({pet.x()}, {pet.y()})")
    print(f"    窗口透明度: {pet.windowOpacity()}")
    print(f"    窗口可见性: {pet.isVisible()}")
except Exception as e:
    print(f"    ✗ 检查失败: {e}")

print("\n[7/8] 检查 UI 组件...")
try:
    if hasattr(pet, 'ui'):
        print("    ✓ pet.ui 存在")
        
        if hasattr(pet.ui, 'image'):
            img = pet.ui.image
            print(f"    ✓ pet.ui.image 存在")
            print(f"      - 宽度: {img.width()} px")
            print(f"      - 高度: {img.height()} px")
            print(f"      - 可见性: {img.isVisible()}")
            
            movie = img.movie()
            if movie:
                print(f"    ✓ pet.ui.image 有动画")
                print(f"      - 动画状态: {'运行中' if movie.state() == movie.Running else '已停止'}")
            else:
                print(f"    ⚠ pet.ui.image 没有动画（这是正常的，如果宠物还没开始动画）")
    else:
        print(f"    ✗ pet.ui 不存在")
except Exception as e:
    print(f"    ✗ 检查失败: {e}")

print("\n[8/8] 显示宠物窗口...")
try:
    pet.show()
    print("    ✓ pet.show() 调用成功")
    
    app.processEvents()
    print("    ✓ app.processEvents() 调用成功")
    
    print(f"    宠物可见性: {pet.isVisible()}")
    
    if pet.isVisible():
        print("\n    ✓ 宠物窗口已成功显示！")
        print("    请查看桌面，小白应该正在那里。")
    else:
        print("\n    ⚠ 宠物窗口创建成功但isVisible()返回False")
        print("    这可能是正常的，窗口可能已经被显示了。")
        
except Exception as e:
    print(f"    ✗ 显示失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
print(" 诊断完成！现在启动应用...")
print("=" * 70)
print("\n提示：")
print("1. 请查看桌面，小白应该正在那里")
print("2. 如果看不到，请检查是否有其他窗口遮挡")
print("3. 任务栏中应该有小白图标")
print("4. 右键点击小白可以看到菜单选项")
print("=" * 70)

# 运行应用
try:
    sys.exit(app.exec_())
except KeyboardInterrupt:
    print("\n\n应用被用户中断。")
    sys.exit(0)
