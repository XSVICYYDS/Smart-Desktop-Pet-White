"""
测试所有新游戏
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt5.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QPushButton, QLabel, QWidget
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont

from games import (
    GomokuGame, SudokuGame, LianlianGame,
    XiaoxiaoleGame, HuarongGame
)


class GameTestWindow(QMainWindow):
    """游戏测试窗口"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("游戏测试")
        self.setFixedSize(400, 500)
        self.setStyleSheet("background-color: #2C3E50;")
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setSpacing(15)
        layout.setContentsMargins(30, 30, 30, 30)
        
        title = QLabel("🎮 游戏测试")
        title.setStyleSheet("color: #FF69B4; font-size: 28px; font-weight: bold;")
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)
        
        games = [
            ("五子棋", self.openGomoku),
            ("数独", self.openSudoku),
            ("连连看", self.openLianlian),
            ("消消乐", self.openXiaoxiaole),
            ("华容道", self.openHuarong),
        ]
        
        for name, func in games:
            btn = QPushButton(name)
            btn.setFixedHeight(50)
            btn.setStyleSheet("""
                QPushButton {
                    background-color: #3498DB;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 18px;
                    font-weight: bold;
                }
                QPushButton:hover {
                    background-color: #2980B9;
                }
            """)
            btn.clicked.connect(func)
            layout.addWidget(btn)
        
        layout.addStretch()
        
        info = QLabel("点击按钮测试各游戏\nESC: 退出游戏")
        info.setStyleSheet("color: #BDC3C7; font-size: 14px;")
        info.setAlignment(Qt.AlignCenter)
        layout.addWidget(info)
    
    def openGomoku(self):
        game = GomokuGame(self)
        game.exec_()
    
    def openSudoku(self):
        game = SudokuGame(self)
        game.exec_()
    
    def openLianlian(self):
        game = LianlianGame(self)
        game.exec_()
    
    def openXiaoxiaole(self):
        game = XiaoxiaoleGame(self)
        game.exec_()
    
    def openHuarong(self):
        game = HuarongGame(self)
        game.exec_()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = GameTestWindow()
    window.show()
    sys.exit(app.exec_())