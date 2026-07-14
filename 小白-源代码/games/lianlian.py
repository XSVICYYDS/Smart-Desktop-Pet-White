import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QGridLayout, QButtonGroup)
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QFont


class LianlianGame(QDialog):
    """连连看游戏"""
    
    def __init__(self, parent=None):
        super(LianlianGame, self).__init__(parent)
        self.setWindowTitle("连连看 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        self.icons = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🥝', '🍌', '🥭', '🍍', '🥥']
        self.rows = 8
        self.cols = 10
        self.board = [[None for _ in range(self.cols + 2)] for _ in range(self.rows + 2)]
        self.selected = None
        self.score = 0
        self.moves = 0
        self.game_over = False
        
        self.initUI()
        self.initBoard()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        title_label = QLabel("🎮 连连看")
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
        self.cell_group = QButtonGroup(self)
        
        for row in range(self.rows):
            row_buttons = []
            for col in range(self.cols):
                button = QPushButton()
                button.setFixedSize(50, 50)
                button.setCheckable(True)
                button.clicked.connect(lambda checked, r=row, c=col: self.onCellClick(r, c))
                self.cell_group.addButton(button)
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
        
        self.shuffle_button = QPushButton("重排")
        self.shuffle_button.setStyleSheet("""
            QPushButton {
                background-color: #9B59B6;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #8E44AD;
            }
        """)
        self.shuffle_button.clicked.connect(self.shuffleBoard)
        button_layout.addWidget(self.shuffle_button)
        
        layout.addLayout(button_layout)
        
        help_label = QLabel("选择两个相同的图案消除 | 连接不能超过两个折点 | ESC: 退出")
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
                font-size: 28px;
                border-radius: 5px;
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
        self.board = [[None for _ in range(self.cols + 2)] for _ in range(self.rows + 2)]
        
        num_pairs = (self.rows * self.cols) // 2
        pairs_needed = num_pairs // len(self.icons) + 1
        
        all_icons = []
        for icon in self.icons:
            all_icons.extend([icon] * pairs_needed * 2)
        
        random.shuffle(all_icons)
        
        icon_idx = 0
        for row in range(self.rows):
            for col in range(self.cols):
                self.board[row + 1][col + 1] = all_icons[icon_idx]
                icon_idx += 1
        
        self.updateDisplay()
    
    def updateDisplay(self):
        """更新显示"""
        for row in range(self.rows):
            for col in range(self.cols):
                button = self.buttons[row][col]
                icon = self.board[row + 1][col + 1]
                if icon:
                    button.setText(icon)
                    button.setEnabled(True)
                    button.setVisible(True)
                else:
                    button.setText("")
                    button.setEnabled(False)
                    button.setVisible(False)
    
    def onCellClick(self, row, col):
        """点击格子"""
        if self.game_over:
            return
        
        actual_row = row + 1
        actual_col = col + 1
        
        if not self.board[actual_row][actual_col]:
            return
        
        if self.selected is None:
            self.selected = (actual_row, actual_col)
            self.buttons[row][col].setChecked(True)
        else:
            if self.selected == (actual_row, actual_col):
                self.buttons[row][col].setChecked(False)
                self.selected = None
                return
            
            r1, c1 = self.selected
            r2, c2 = actual_row, actual_col
            
            if self.board[r1][c1] == self.board[r2][c2]:
                if self.canConnect(r1, c1, r2, c2):
                    self.board[r1][c1] = None
                    self.board[r2][c2] = None
                    self.score += 100
                    self.moves += 1
                    self.updateScore()
                    self.updateDisplay()
                    
                    if self.isWin():
                        self.game_over = True
                        QMessageBox.information(self, "恭喜", f"🎉 恭喜通关！\n得分: {self.score}\n步数: {self.moves}")
                else:
                    self.buttons[r1 - 1][c1 - 1].setChecked(False)
            else:
                self.buttons[r1 - 1][c1 - 1].setChecked(False)
            
            self.selected = None
    
    def canConnect(self, r1, c1, r2, c2):
        """检查是否可以连接"""
        if r1 == r2 and c1 == c2:
            return False
        
        if self.lineConnect(r1, c1, r2, c2):
            return True
        
        if self.oneCornerConnect(r1, c1, r2, c2):
            return True
        
        if self.twoCornerConnect(r1, c1, r2, c2):
            return True
        
        return False
    
    def lineConnect(self, r1, c1, r2, c2):
        """直线连接"""
        if r1 == r2:
            min_col = min(c1, c2)
            max_col = max(c1, c2)
            for col in range(min_col + 1, max_col):
                if self.board[r1][col]:
                    return False
            return True
        
        if c1 == c2:
            min_row = min(r1, r2)
            max_row = max(r1, r2)
            for row in range(min_row + 1, max_row):
                if self.board[row][c1]:
                    return False
            return True
        
        return False
    
    def oneCornerConnect(self, r1, c1, r2, c2):
        """一个折点连接"""
        if not self.board[r1][c2]:
            if self.lineConnect(r1, c1, r1, c2) and self.lineConnect(r1, c2, r2, c2):
                return True
        
        if not self.board[r2][c1]:
            if self.lineConnect(r1, c1, r2, c1) and self.lineConnect(r2, c1, r2, c2):
                return True
        
        return False
    
    def twoCornerConnect(self, r1, c1, r2, c2):
        """两个折点连接"""
        for col in range(self.cols + 2):
            if col != c1 and col != c2:
                if not self.board[r1][col] and not self.board[r2][col]:
                    if self.lineConnect(r1, c1, r1, col) and self.lineConnect(r1, col, r2, col) and self.lineConnect(r2, col, r2, c2):
                        return True
        
        for row in range(self.rows + 2):
            if row != r1 and row != r2:
                if not self.board[row][c1] and not self.board[row][c2]:
                    if self.lineConnect(r1, c1, row, c1) and self.lineConnect(row, c1, row, c2) and self.lineConnect(row, c2, r2, c2):
                        return True
        
        return False
    
    def isWin(self):
        """检查是否获胜"""
        for row in range(1, self.rows + 1):
            for col in range(1, self.cols + 1):
                if self.board[row][col]:
                    return False
        return True
    
    def updateScore(self):
        """更新分数"""
        self.score_display.setText(str(self.score))
        self.moves_display.setText(str(self.moves))
    
    def showHint(self):
        """显示提示"""
        for r1 in range(1, self.rows + 1):
            for c1 in range(1, self.cols + 1):
                if not self.board[r1][c1]:
                    continue
                
                for r2 in range(1, self.rows + 1):
                    for c2 in range(1, self.cols + 1):
                        if not self.board[r2][c2]:
                            continue
                        
                        if r1 == r2 and c1 == c2:
                            continue
                        
                        if self.board[r1][c1] == self.board[r2][c2]:
                            if self.canConnect(r1, c1, r2, c2):
                                self.buttons[r1 - 1][c1 - 1].setStyleSheet("""
                                    QPushButton {
                                        background-color: #E74C3C;
                                        border: 2px solid #C0392B;
                                        font-size: 28px;
                                        border-radius: 5px;
                                    }
                                """)
                                self.buttons[r2 - 1][c2 - 1].setStyleSheet("""
                                    QPushButton {
                                        background-color: #E74C3C;
                                        border: 2px solid #C0392B;
                                        font-size: 28px;
                                        border-radius: 5px;
                                    }
                                """)
                                
                                QTimer.singleShot(500, lambda: self.applyCellStyle(self.buttons[r1 - 1][c1 - 1]))
                                QTimer.singleShot(500, lambda: self.applyCellStyle(self.buttons[r2 - 1][c2 - 1]))
                                return
    
    def shuffleBoard(self):
        """重排棋盘"""
        icons = []
        for row in range(1, self.rows + 1):
            for col in range(1, self.cols + 1):
                if self.board[row][col]:
                    icons.append(self.board[row][col])
        
        random.shuffle(icons)
        
        idx = 0
        for row in range(1, self.rows + 1):
            for col in range(1, self.cols + 1):
                if self.board[row][col]:
                    self.board[row][col] = icons[idx]
                    idx += 1
        
        self.updateDisplay()
    
    def newGame(self):
        """新游戏"""
        self.selected = None
        self.score = 0
        self.moves = 0
        self.game_over = False
        self.updateScore()
        self.initBoard()
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        if event.key() == Qt.Key_Escape:
            self.accept()
    
    def showEvent(self, event):
        """窗口显示时获取焦点"""
        super(LianlianGame, self).showEvent(event)
        self.setFocus()