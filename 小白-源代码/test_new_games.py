import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """测试所有游戏模块导入"""
    games_to_test = [
        ('SnakeGame', 'games.snake'),
        ('TetrisGame', 'games.tetris'),
        ('Game2048', 'games.game2048'),
        ('WhackAMole', 'games.whackamole'),
        ('MinesweeperGame', 'games.minesweeper'),
        ('TicTacToeGame', 'games.tictactoe'),
        ('SokobanGame', 'games.sokoban'),
        ('PongGame', 'games.pong'),
        ('TankBattleGame', 'games.tankbattle')
    ]

    print("=" * 60)
    print("测试游戏模块导入")
    print("=" * 60)

    all_success = True

    for class_name, module_name in games_to_test:
        try:
            module = __import__(module_name, fromlist=[class_name])
            game_class = getattr(module, class_name)
            print(f"✓ {class_name} ({module_name}) - OK")
        except Exception as e:
            print(f"✗ {class_name} ({module_name}) - 失败: {e}")
            all_success = False

    print("=" * 60)
    if all_success:
        print("所有游戏模块导入成功！")
    else:
        print("部分模块导入失败，请检查错误。")
    print("=" * 60)

    return all_success

def test_ui_imports():
    """测试UI组件导入"""
    print("\n测试UI组件导入...")
    try:
        from ui_components import (
            SnakeGame, TetrisGame, Game2048, WhackAMole,
            MinesweeperGame, TicTacToeGame, SokobanGame, PongGame, TankBattleGame
        )
        print("✓ UI组件导入成功！")
        return True
    except Exception as e:
        print(f"✗ UI组件导入失败: {e}")
        return False

if __name__ == '__main__':
    success1 = test_imports()
    success2 = test_ui_imports()

    if success1 and success2:
        print("\n所有测试通过！")
        sys.exit(0)
    else:
        print("\n测试失败！")
        sys.exit(1)
