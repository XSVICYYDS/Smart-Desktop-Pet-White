import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QGridLayout)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont


class GomokuGame(QDialog):
    """五子棋游戏"""
    
    def __init__(self, parent=None):
        super(GomokuGame, self).__init__(parent)
        self.setWindowTitle("五子棋 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        self.board_size = 15
        self.board = [['' for _ in range(self.board_size)] for _ in range(self.board_size)]
        self.current_player = '黑'
        self.game_over = False
        self.is_vs_ai = True
        self.black_score = 0
        self.white_score = 0
        self.draws = 0
        
        self.initUI()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        score_layout = QHBoxLayout()
        self.score_label = QLabel(f"黑方: {self.black_score}  白方: {self.white_score}  平局: {self.draws}")
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
        
        self.turn_label = QLabel("当前: 黑方 (玩家)")
        self.turn_label.setStyleSheet("color: #ECF0F1; font-size: 18px; font-weight: bold;")
        self.turn_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.turn_label)
        
        self.grid_layout = QGridLayout()
        self.grid_layout.setSpacing(2)
        self.buttons = []
        
        for row in range(self.board_size):
            row_buttons = []
            for col in range(self.board_size):
                button = QPushButton()
                button.setFixedSize(32, 32)
                button.clicked.connect(lambda checked, r=row, c=col: self.onButtonClicked(r, c))
                button.setStyleSheet("""
                    QPushButton {
                        background-color: #D4A76A;
                        border: 1px solid #8B7355;
                    }
                    QPushButton:hover {
                        background-color: #E8C487;
                    }
                """)
                self.grid_layout.addWidget(button, row, col)
                row_buttons.append(button)
            self.buttons.append(row_buttons)
        
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
        
        help_label = QLabel("点击棋盘落子 | ESC: 退出")
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
    
    def onButtonClicked(self, row, col):
        """点击格子"""
        if self.game_over or self.board[row][col] != '':
            return
        
        self.makeMove(row, col, self.current_player)
        
        if not self.game_over and self.is_vs_ai and self.current_player == '白':
            self.aiMove()
    
    def makeMove(self, row, col, player):
        """落子"""
        self.board[row][col] = player
        self.updateButtons()
        
        if self.checkWin(row, col, player):
            self.game_over = True
            if player == '黑':
                self.black_score += 1
                winner = "黑方"
            else:
                self.white_score += 1
                winner = "白方"
            QMessageBox.information(self, "游戏结束", f"{winner} 获胜！🎉")
            self.updateScore()
            return
        
        if self.isBoardFull():
            self.game_over = True
            self.draws += 1
            QMessageBox.information(self, "游戏结束", "平局！")
            self.updateScore()
            return
        
        self.current_player = '白' if self.current_player == '黑' else '黑'
        self.updateTurnLabel()
    
    def aiMove(self):
        """AI下棋"""
        best_score = -1
        best_move = None
        
        for row in range(self.board_size):
            for col in range(self.board_size):
                if self.board[row][col] == '':
                    score = self.evaluatePosition(row, col)
                    if score > best_score:
                        best_score = score
                        best_move = (row, col)
        
        if best_move:
            self.makeMove(best_move[0], best_move[1], '白')
    
    def evaluatePosition(self, row, col):
        """评估位置分数"""
        score = 0
        
        temp = self.board[row][col]
        self.board[row][col] = '白'
        if self.checkWin(row, col, '白'):
            self.board[row][col] = temp
            return 10000
        self.board[row][col] = temp
        
        self.board[row][col] = '黑'
        if self.checkWin(row, col, '黑'):
            self.board[row][col] = temp
            return 9000
        self.board[row][col] = temp
        
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        for dr, dc in directions:
            white_count = self.countInDirection(row, col, dr, dc, '白')
            black_count = self.countInDirection(row, col, dr, dc, '黑')
            
            if white_count == 4:
                score += 1000
            elif white_count == 3:
                score += 100
            elif white_count == 2:
                score += 10
            
            if black_count == 4:
                score += 800
            elif black_count == 3:
                score += 80
            elif black_count == 2:
                score += 8
        
        center_dist = abs(row - 7) + abs(col - 7)
        score += (14 - center_dist) * 2
        
        return score
    
    def countInDirection(self, row, col, dr, dc, player):
        """计算某个方向上连续棋子数量"""
        count = 0
        
        r, c = row + dr, col + dc
        while 0 <= r < self.board_size and 0 <= c < self.board_size and self.board[r][c] == player:
            count += 1
            r += dr
            c += dc
        
        r, c = row - dr, col - dc
        while 0 <= r < self.board_size and 0 <= c < self.board_size and self.board[r][c] == player:
            count += 1
            r -= dr
            c -= dc
        
        return count
    
    def checkWin(self, row, col, player):
        """检查是否获胜"""
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]
        
        for dr, dc in directions:
            count = 1
            
            r, c = row + dr, col + dc
            while 0 <= r < self.board_size and 0 <= c < self.board_size and self.board[r][c] == player:
                count += 1
                r += dr
                c += dc
            
            r, c = row - dr, col - dc
            while 0 <= r < self.board_size and 0 <= c < self.board_size and self.board[r][c] == player:
                count += 1
                r -= dr
                c -= dc
            
            if count >= 5:
                return True
        
        return False
    
    def isBoardFull(self):
        """检查棋盘是否已满"""
        for row in range(self.board_size):
            for col in range(self.board_size):
                if self.board[row][col] == '':
                    return False
        return True
    
    def updateButtons(self):
        """更新按钮显示"""
        for row in range(self.board_size):
            for col in range(self.board_size):
                button = self.buttons[row][col]
                if self.board[row][col] == '黑':
                    button.setText("⚫")
                    button.setStyleSheet("""
                        QPushButton {
                            background-color: #D4A76A;
                            border: 1px solid #8B7355;
                            font-size: 24px;
                        }
                    """)
                elif self.board[row][col] == '白':
                    button.setText("⚪")
                    button.setStyleSheet("""
                        QPushButton {
                            background-color: #D4A76A;
                            border: 1px solid #8B7355;
                            font-size: 24px;
                        }
                    """)
                else:
                    button.setText("")
                    button.setStyleSheet("""
                        QPushButton {
                            background-color: #D4A76A;
                            border: 1px solid #8B7355;
                        }
                        QPushButton:hover {
                            background-color: #E8C487;
                        }
                    """)
    
    def updateTurnLabel(self):
        """更新回合标签"""
        if self.is_vs_ai:
            if self.current_player == '黑':
                self.turn_label.setText("当前: 黑方 (玩家)")
            else:
                self.turn_label.setText("当前: 白方 (电脑)")
        else:
            self.turn_label.setText(f"当前: {self.current_player}方")
    
    def updateScore(self):
        """更新分数显示"""
        self.score_label.setText(f"黑方: {self.black_score}  白方: {self.white_score}  平局: {self.draws}")
    
    def restartGame(self):
        """重新开始游戏"""
        self.board = [['' for _ in range(self.board_size)] for _ in range(self.board_size)]
        self.current_player = '黑'
        self.game_over = False
        self.updateButtons()
        self.updateTurnLabel()
    
    def resetScore(self):
        """重置分数"""
        self.black_score = 0
        self.white_score = 0
        self.draws = 0
        self.updateScore()
        self.restartGame()
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        if event.key() == Qt.Key_Escape:
            self.accept()
    
    def showEvent(self, event):
        """窗口显示时获取焦点"""
        super(GomokuGame, self).showEvent(event)
        self.setFocus()