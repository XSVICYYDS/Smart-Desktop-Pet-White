import sys
import os

# 添加源代码路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("测试小白休闲小游戏")
print("=" * 60)

try:
    from PyQt5.QtWidgets import QApplication
    from games import SnakeGame, TetrisGame, Game2048, WhackAMole
    print("✓ 所有模块导入成功")
except Exception as e:
    print(f"✗ 模块导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 创建Qt应用
app = QApplication(sys.argv)

print("\n选择要测试的游戏:")
print("1. 贪吃蛇")
print("2. 俄罗斯方块")
print("3. 2048")
print("4. 打地鼠")
print("0. 退出")

choice = input("\n请输入数字选择 (0-4): ")

try:
    game = None
    
    if choice == '1':
        print("\n打开贪吃蛇...")
        game = SnakeGame()
        game.show()
    elif choice == '2':
        print("\n打开俄罗斯方块...")
        game = TetrisGame()
        game.show()
    elif choice == '3':
        print("\n打开2048...")
        game = Game2048()
        game.show()
    elif choice == '4':
        print("\n打开打地鼠...")
        game = WhackAMole()
        game.show()
    elif choice == '0':
        print("\n退出测试")
        sys.exit(0)
    else:
        print("\n无效选择，退出")
        sys.exit(1)
    
    if game:
        print("\n游戏已打开！按任意键关闭测试...")
        input()
        game.close()
        
except Exception as e:
    print(f"\n✗ 打开游戏失败: {e}")
    import traceback
    traceback.print_exc()
