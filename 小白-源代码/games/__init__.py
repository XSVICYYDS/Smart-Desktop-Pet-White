"""
休闲小游戏模块
包含贪吃蛇、俄罗斯方块、2048、打地鼠、扫雷、井字棋、推箱子、乒乓球、坦克大战、五子棋、数独、连连看、消消乐、华容道、羊了个羊等小游戏
"""

from .snake import SnakeGame
from .tetris import TetrisGame
from .game2048 import Game2048
from .whackamole import WhackAMole
from .minesweeper import MinesweeperGame
from .tictactoe import TicTacToeGame
from .sokoban import SokobanGame
from .pong import PongGame
from .tankbattle import TankBattleGame
from .gomoku import GomokuGame
from .sudoku import SudokuGame
from .lianlian import LianlianGame
from .xiaoxiaole import XiaoxiaoleGame
from .huarongdao import HuarongGame
from .sheep import SheepGame

__all__ = [
    'SnakeGame',
    'TetrisGame',
    'Game2048',
    'WhackAMole',
    'MinesweeperGame',
    'TicTacToeGame',
    'SokobanGame',
    'PongGame',
    'TankBattleGame',
    'GomokuGame',
    'SudokuGame',
    'LianlianGame',
    'XiaoxiaoleGame',
    'HuarongGame',
    'SheepGame'
]
