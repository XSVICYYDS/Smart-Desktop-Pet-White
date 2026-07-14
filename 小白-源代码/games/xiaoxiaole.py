import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QGridLayout)
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QFont


class XiaoxiaoleGame(QDialog):
    """消消乐游戏"""
    
    def __init__(self, parent=None):
        super(XiaoxiaoleGame, self).__init__(parent)
        self.setWindowTitle("消消乐 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        self.gems = ['🔴', '🟡', '🟢', '🔵', '🟣', '🟤']
        self.rows = 8
        self.cols = 8
        self.board = [[None for _ in range(self.cols)] for _ in range(self.rows)]
        self.score = 0
        self.moves = 0
        self.game_over = False
        self.selected = None
        self.target_score = 1000
        
        self.initUI()
        self.initBoard()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        title_label = QLabel("💎 消消乐")
        title_label.setStyleSheet("color: #FF69B4; font-size: 24px; font-weight: bold;")
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)
        
        info_layout = QHBoxLayout()
        
        score_label = QLabel("分数:")
        score_label.setStyleSheet("color: #ECF0F1; font-size: 16px;")
        info_layout.addWidget(score_label)
        
        self.score_display = QLabel("0")
        self.score_display.setStyleSheet("color: #F1C40F; font-size: 20px; font-weight: bold;")
        info_layout.addWidget(self.score_display)
        
        info_layout.addStretch()
        
        target_label = QLabel("目标:")
        target_label.setStyleSheet("color: #ECF0F1; font-size: 16px;")
        info_layout.addWidget(target_label)
        
        self.target_display = QLabel(str(self.target_score))
        self.target_display.setStyleSheet("color: #E74C3C; font-size: 20px; font-weight: bold;")
        info_layout.addWidget(self.target_display)
        
        info_layout.addStretch()
        
        moves_label = QLabel("步数:")
        moves_label.setStyleSheet("color: #ECF0F1; font-size: 16px;")
        info_layout.addWidget(moves_label)
        
        self.moves_display = QLabel("0")
        self.moves_display.setStyleSheet("color: #3498DB; font-size: 20px; font-weight: bold;")
        info_layout.addWidget(self.moves_display)
        
        layout.addLayout(info_layout)
        
        self.grid_layout = QGridLayout()
        self.grid_layout.setSpacing(4)
        self.buttons = []
        
        for row in range(self.rows):
            row_buttons = []
            for col in range(self.cols):
                button = QPushButton()
                button.setFixedSize(50, 50)
                button.setCheckable(True)
                button.clicked.connect(lambda checked, r=row, c=col: self.onCellClick(r, c))
                self.applyCellStyle(button)
                self.grid_layout.addWidget(button, row, col)
                row_buttons.append(button)
            self.buttons.append(row_buttons)
        
        layout.addLayout(self.grid_layout)
        
        button_layout = QHBoxLayout()
        
        self.new_game_button = QPushButton("新游戏")
        self.new_game_button.setStyleSheet("""
            QPushButton {
                background-color: #2ECC71;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #27AE60;
            }
        """)
        self.new_game_button.clicked.connect(self.newGame)
        button_layout.addWidget(self.new_game_button)
        
        self.hint_button = QPushButton("提示")
        self.hint_button.setStyleSheet("""
            QPushButton {
                background-color: #F39C12;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #E67E22;
            }
        """)
        self.hint_button.clicked.connect(self.showHint)
        button_layout.addWidget(self.hint_button)
        
        layout.addLayout(button_layout)
        
        help_label = QLabel("交换相邻的宝石，三个或更多相同宝石连成直线消除 | ESC: 退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
    
    def applyCellStyle(self, button):
        """应用单元格样式"""
        button.setStyleSheet("""
            QPushButton {
                background-color: #34495E;
                border: 2px solid #4A6572;
                font-size: 32px;
                border-radius: 8px;
            }
            QPushButton:hover {
                background-color: #3D566E;
            }
            QPushButton:checked {
                background-color: #1ABC9C;
                border: 2px solid #16A085;
            }
        """)
    
    def initBoard(self):
        """初始化棋盘"""
        self.board = [[random.choice(self.gems) for _ in range(self.cols)] for _ in range(self.rows)]
        
        while self.findMatches():
            self.board = [[random.choice(self.gems) for _ in range(self.cols)] for _ in range(self.rows)]
        
        self.updateDisplay()
    
    def updateDisplay(self):
        """更新显示"""
        for row in range(self.rows):
            for col in range(self.cols):
                button = self.buttons[row][col]
                if self.board[row][col]:
                    button.setText(self.board[row][col])
                    button.setEnabled(True)
                else:
                    button.setText("")
                    button.setEnabled(False)
    
    def onCellClick(self, row, col):
        """点击格子"""
        if self.game_over:
            return
        
        if self.selected is None:
            self.selected = (row, col)
            self.buttons[row][col].setChecked(True)
        else:
            r1, c1 = self.selected
            
            if abs(r1 - row) + abs(c1 - col) == 1:
                self.swapAndCheck(r1, c1, row, col)
            else:
                self.buttons[r1][c1].setChecked(False)
                if (r1, c1) == (row, col):
                    self.buttons[row][col].setChecked(False)
                else:
                    self.selected = (row, col)
                    self.buttons[row][col].setChecked(True)
                return
            
            self.selected = None
    
    def swapAndCheck(self, r1, c1, r2, c2):
        """交换并检查"""
        self.buttons[r1][c1].setChecked(False)
        
        self.board[r1][c1], self.board[r2][c2] = self.board[r2][c2], self.board[r1][c1]
        self.updateDisplay()
        
        matches = self.findMatches()
        
        if matches:
            self.moves += 1
            self.removeMatches(matches)
            self.applyGravity()
            self.fillEmptySpaces()
            
            while self.findMatches():
                matches = self.findMatches()
                self.removeMatches(matches)
                self.applyGravity()
                self.fillEmptySpaces()
            
            self.updateScore()
            
            if self.score >= self.target_score:
                self.game_over = True
                QMessageBox.information(self, "恭喜", f"🎉 恭喜达到目标！\n得分: {self.score}\n步数: {self.moves}")
        else:
            self.board[r1][c1], self.board[r2][c2] = self.board[r2][c2], self.board[r1][c1]
            self.updateDisplay()
    
    def findMatches(self):
        """寻找匹配"""
        matches = set()
        
        for row in range(self.rows):
            for col in range(self.cols - 2):
                if self.board[row][col] and self.board[row][col] == self.board[row][col + 1] == self.board[row][col + 2]:
                    matches.add((row, col))
                    matches.add((row, col + 1))
                    matches.add((row, col + 2))
        
        for col in range(self.cols):
            for row in range(self.rows - 2):
                if self.board[row][col] and self.board[row][col] == self.board[row + 1][col] == self.board[row + 2][col]:
                    matches.add((row, col))
                    matches.add((row + 1, col))
                    matches.add((row + 2, col))
        
        return matches
    
    def removeMatches(self, matches):
        """移除匹配"""
        for row, col in matches:
            self.board[row][col] = None
            self.score += 10
        self.updateDisplay()
    
    def applyGravity(self):
        """应用重力"""
        for col in range(self.cols):
            write_row = self.rows - 1
            for row in range(self.rows - 1, -1, -1):
                if self.board[row][col]:
                    self.board[write_row][col] = self.board[row][col]
                    if write_row != row:
                        self.board[row][col] = None
                    write_row -= 1
        self.updateDisplay()
    
    def fillEmptySpaces(self):
        """填充空白"""
        for row in range(self.rows):
            for col in range(self.cols):
                if not self.board[row][col]:
                    self.board[row][col] = random.choice(self.gems)
        self.updateDisplay()
    
    def updateScore(self):
        """更新分数"""
        self.score_display.setText(str(self.score))
        self.moves_display.setText(str(self.moves))
    
    def showHint(self):
        """显示提示"""
        for row in range(self.rows):
            for col in range(self.cols):
                if col < self.cols - 1:
                    self.board[row][col], self.board[row][col + 1] = self.board[row][col + 1], self.board[row][col]
                    matches = self.findMatches()
                    self.board[row][col], self.board[row][col + 1] = self.board[row][col + 1], self.board[row][col]
                    if matches:
                        self.highlightCells(row, col, row, col + 1)
                        return
                
                if row < self.rows - 1:
                    self.board[row][col], self.board[row + 1][col] = self.board[row + 1][col], self.board[row][col]
                    matches = self.findMatches()
                    self.board[row][col], self.board[row + 1][col] = self.board[row + 1][col], self.board[row][col]
                    if matches:
                        self.highlightCells(row, col, row + 1, col)
                        return
    
    def highlightCells(self, r1, c1, r2, c2):
        """高亮提示格子"""
        self.buttons[r1][c1].setStyleSheet("""
            QPushButton {
                background-color: #E74C3C;
                border: 2px solid #C0392B;
                font-size: 32px;
                border-radius: 8px;
            }
        """)
        self.buttons[r2][c2].setStyleSheet("""
            QPushButton {
                background-color: #E74C3C;
                border: 2px solid #C0392B;
                font-size: 32px;
                border-radius: 8px;
            }
        """)
        
        QTimer.singleShot(800, lambda: self.applyCellStyle(self.buttons[r1][c1]))
        QTimer.singleShot(800, lambda: self.applyCellStyle(self.buttons[r2][c2]))
    
    def newGame(self):
        """新游戏"""
        self.score = 0
        self.moves = 0
        self.game_over = False
        self.selected = None
        self.updateScore()
        self.initBoard()
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        if event.key() == Qt.Key_Escape:
            self.accept()
    
    def showEvent(self, event):
        """窗口显示时获取焦点"""
        super(XiaoxiaoleGame, self).showEvent(event)
        self.setFocus()