import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("详细测试游戏模块")
print("=" * 60)

try:
    from PyQt5.QtWidgets import QApplication
    app = QApplication(sys.argv)
    print("✓ PyQt5 应用创建成功")
except Exception as e:
    print(f"✗ PyQt5 应用创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    from games.snake import SnakeGame
    print("✓ 贪吃蛇模块导入成功")
    
    print("\n尝试创建贪吃蛇游戏窗口...")
    game = SnakeGame()
    print("✓ 贪吃蛇游戏窗口创建成功")
    game.show()
    print("✓ 游戏窗口已显示")
    print("\n如果看到了窗口说明游戏正常，按任意键关闭测试窗口...")
    
except Exception as e:
    print(f"✗ 贪吃蛇游戏创建失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

try:
    input()
except:
    pass

print("\n" + "=" * 60)
print("测试完成")
print("=" * 60)
