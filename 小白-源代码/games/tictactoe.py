import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QGridLayout)
from PyQt5.QtCore import Qt


class TicTacToeGame(QDialog):
    """井字棋游戏"""
    
    def __init__(self, parent=None):
        super(TicTacToeGame, self).__init__(parent)
        self.setWindowTitle("井字棋 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        self.board = [''] * 9
        self.current_player = 'X'
        self.game_over = False
        self.is_vs_ai = True
        self.x_score = 0
        self.o_score = 0
        self.draws = 0
        
        self.initUI()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        score_layout = QHBoxLayout()
        self.score_label = QLabel(f"X: {self.x_score}  O: {self.o_score}  平局: {self.draws}")
        self.score_label.setStyleSheet("color: #ECF0F1; font-size: 16px; font-weight: bold;")
        score_layout.addWidget(self.score_label)
        score_layout.addStretch()
        layout.addLayout(score_layout)
        
        mode_layout = QHBoxLayout()
        self.mode_label = QLabel("模式: 人机对战")
        self.mode_label.setStyleSheet("color: #ECF0F1; font-size: 14px;")
        mode_layout.addWidget(self.mode_label)
        
        self.toggle_mode_button = QPushButton("双人对战")
        self.toggle_mode_button.setStyleSheet("""
            QPushButton {
                background-color: #9B59B6;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
            }
        """)
        self.toggle_mode_button.clicked.connect(self.toggleMode)
        mode_layout.addWidget(self.toggle_mode_button)
        mode_layout.addStretch()
        layout.addLayout(mode_layout)
        
        self.turn_label = QLabel("当前: X (玩家)")
        self.turn_label.setStyleSheet("color: #ECF0F1; font-size: 18px; font-weight: bold;")
        self.turn_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.turn_label)
        
        self.grid_layout = QGridLayout()
        self.grid_layout.setSpacing(5)
        self.buttons = []
        
        for i in range(9):
            button = QPushButton()
            button.setFixedSize(80, 80)
            button.clicked.connect(lambda checked, idx=i: self.onButtonClicked(idx))
            button.setStyleSheet("""
                QPushButton {
                    background-color: #34495E;
                    border: 3px solid #1ABC9C;
                    font-size: 40px;
                    font-weight: bold;
                }
                QPushButton:hover {
                    background-color: #3D566E;
                }
            """)
            self.grid_layout.addWidget(button, i // 3, i % 3)
            self.buttons.append(button)
        
        layout.addLayout(self.grid_layout)
        
        button_layout = QHBoxLayout()
        
        self.restart_button = QPushButton("重新开始")
        self.restart_button.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
        """)
        self.restart_button.clicked.connect(self.restartGame)
        button_layout.addWidget(self.restart_button)
        
        self.reset_score_button = QPushButton("重置分数")
        self.reset_score_button.setStyleSheet("""
            QPushButton {
                background-color: #E74C3C;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
        """)
        self.reset_score_button.clicked.connect(self.resetScore)
        button_layout.addWidget(self.reset_score_button)
        
        layout.addLayout(button_layout)
        
        help_label = QLabel("ESC: 退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
    
    def toggleMode(self):
        """切换游戏模式"""
        self.is_vs_ai = not self.is_vs_ai
        if self.is_vs_ai:
            self.mode_label.setText("模式: 人机对战")
            self.toggle_mode_button.setText("双人对战")
        else:
            self.mode_label.setText("模式: 双人对战")
            self.toggle_mode_button.setText("人机对战")
        self.restartGame()
    
    def onButtonClicked(self, index):
        """点击格子"""
        if self.game_over or self.board[index] != '':
            return
        
        self.makeMove(index, self.current_player)
        
        if not self.game_over and self.is_vs_ai and self.current_player == 'O':
            self.aiMove()
    
    def makeMove(self, index, player):
        """落子"""
        self.board[index] = player
        self.updateButtons()
        
        if self.checkWin(player):
            self.game_over = True
            if player == 'X':
                self.x_score += 1
                QMessageBox.information(self, "游戏结束", "X 获胜！")
            else:
                self.o_score += 1
                QMessageBox.information(self, "游戏结束", "O 获胜！")
            self.updateScore()
            return
        
        if '' not in self.board:
            self.game_over = True
            self.draws += 1
            QMessageBox.information(self, "游戏结束", "平局！")
            self.updateScore()
            return
        
        self.current_player = 'O' if self.current_player == 'X' else 'X'
        self.updateTurnLabel()
    
    def aiMove(self):
        """AI下棋"""
        for i in range(9):
            if self.board[i] == '':
                self.board[i] = 'O'
                if self.checkWin('O'):
                    self.board[i] = ''
                    self.makeMove(i, 'O')
                    return
                self.board[i] = ''
        
        for i in range(9):
            if self.board[i] == '':
                self.board[i] = 'X'
                if self.checkWin('X'):
                    self.board[i] = ''
                    self.makeMove(i, 'O')
                    return
                self.board[i] = ''
        
        if self.board[4] == '':
            self.makeMove(4, 'O')
            return
        
        corners = [0, 2, 6, 8]
        available_corners = [c for c in corners if self.board[c] == '']
        if available_corners:
            self.makeMove(random.choice(available_corners), 'O')
            return
        
        available = [i for i in range(9) if self.board[i] == '']
        if available:
            self.makeMove(random.choice(available), 'O')
    
    def checkWin(self, player):
        """检查是否获胜"""
        win_patterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ]
        
        for pattern in win_patterns:
            if (self.board[pattern[0]] == player and
                self.board[pattern[1]] == player and
                self.board[pattern[2]] == player):
                return True
        return False
    
    def updateButtons(self):
        """更新按钮显示"""
        for i in range(9):
            button = self.buttons[i]
            if self.board[i] == 'X':
                button.setText("X")
                button.setStyleSheet("""
                    QPushButton {
                        background-color: #34495E;
                        border: 3px solid #1ABC9C;
                        font-size: 40px;
                        font-weight: bold;
                        color: #E74C3C;
                    }
                """)
            elif self.board[i] == 'O':
                button.setText("O")
                button.setStyleSheet("""
                    QPushButton {
                        background-color: #34495E;
                        border: 3px solid #1ABC9C;
                        font-size: 40px;
                        font-weight: bold;
                        color: #3498DB;
                    }
                """)
            else:
                button.setText("")
                button.setStyleSheet("""
                    QPushButton {
                        background-color: #34495E;
                        border: 3px solid #1ABC9C;
                        font-size: 40px;
                        font-weight: bold;
                    }
                    QPushButton:hover {
                        background-color: #3D566E;
                    }
                """)
    
    def updateTurnLabel(self):
        """更新回合标签"""
        if self.is_vs_ai:
            if self.current_player == 'X':
                self.turn_label.setText("当前: X (玩家)")
            else:
                self.turn_label.setText("当前: O (电脑)")
        else:
            self.turn_label.setText(f"当前: {self.current_player}")
    
    def updateScore(self):
        """更新分数显示"""
        self.score_label.setText(f"X: {self.x_score}  O: {self.o_score}  平局: {self.draws}")
    
    def restartGame(self):
        """重新开始游戏"""
        self.board = [''] * 9
        self.current_player = 'X'
        self.game_over = False
        self.updateButtons()
        self.updateTurnLabel()
    
    def resetScore(self):
        """重置分数"""
        self.x_score = 0
        self.o_score = 0
        self.draws = 0
        self.updateScore()
        self.restartGame()
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        if event.key() == Qt.Key_Escape:
            self.accept()
    
    def showEvent(self, event):
        """窗口显示时获取焦点"""
        super(TicTacToeGame, self).showEvent(event)
        self.setFocus()
