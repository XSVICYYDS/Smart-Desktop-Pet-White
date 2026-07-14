import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_tictactoe():
    """测试井字棋问题"""
    print("=" * 60)
    print("检查井字棋游戏问题...")
    print("=" * 60)
    
    from games.tictactoe import TicTacToeGame
    
    # 问题1: AI下棋时机问题
    print("\n问题分析:")
    print("1. 当前逻辑: 玩家下完后立即检查是否轮到O，若是则AI下")
    print("   但玩家是X，下完后current_player变成O，这样AI会立即下")
    print("   这个逻辑有问题！")
    
    print("\n修复建议:")
    print("   应该是: 玩家(X)下完 → 检查游戏结束 → 若未结束 → AI下 → 更新current_player")

def test_sokoban():
    """测试推箱子问题"""
    print("\n" + "=" * 60)
    print("检查推箱子游戏问题...")
    print("=" * 60)
    
    from games.sokoban import SokobanGame
    
    print("\n问题分析:")
    print("1. 方向键控制逻辑:")
    print("   Up -> move(-1, 0)")
    print("   Down -> move(1, 0)")
    print("   Left -> move(0, -1)") 
    print("   Right -> move(0, 1)")
    print("   这个逻辑看起来是对的！")
    
    print("\n2. 检查关卡数据:")
    print("   让我们看看关卡定义...")
    
    from games.sokoban import SokobanGame
    for i, level in enumerate(SokobanGame.LEVELS):
        print(f"\n关卡 {i+1}:")
        for row in level:
            print(f"  '{row}'")

if __name__ == '__main__':
    test_tictactoe()
    test_sokoban()
