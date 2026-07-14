import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QGridLayout, QComboBox, QFrame, QButtonGroup)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont, QIntValidator


class SudokuGame(QDialog):
    """数独游戏"""
    
    def __init__(self, parent=None):
        super(SudokuGame, self).__init__(parent)
        self.setWindowTitle("数独 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        self.board = [[0 for _ in range(9)] for _ in range(9)]
        self.initial_board = [[0 for _ in range(9)] for _ in range(9)]
        self.solution = [[0 for _ in range(9)] for _ in range(9)]
        self.difficulty = 'medium'
        self.mistakes = 0
        self.max_mistakes = 3
        self.hints_used = 0
        self.max_hints = 10  # 最大提示次数
        self.game_over = False
        self.selected_row = None
        self.selected_col = None
        
        self.initUI()
        self.generateSudoku()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        title_label = QLabel("🎯 数独游戏")
        title_label.setStyleSheet("color: #FF69B4; font-size: 24px; font-weight: bold;")
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)
        
        info_layout = QHBoxLayout()
        
        difficulty_layout = QHBoxLayout()
        diff_label = QLabel("难度:")
        diff_label.setStyleSheet("color: #ECF0F1; font-size: 14px;")
        difficulty_layout.addWidget(diff_label)
        
        self.difficulty_combo = QComboBox()
        self.difficulty_combo.addItems(['简单', '中等', '困难'])
        self.difficulty_combo.currentTextChanged.connect(self.changeDifficulty)
        difficulty_layout.addWidget(self.difficulty_combo)
        
        info_layout.addLayout(difficulty_layout)
        info_layout.addStretch()
        
        self.mistakes_label = QLabel(f"错误: 0/{self.max_mistakes}")
        self.mistakes_label.setStyleSheet("color: #ECF0F1; font-size: 14px; font-weight: bold;")
        info_layout.addWidget(self.mistakes_label)
        
        info_layout.addSpacing(20)
        
        self.hints_label = QLabel(f"提示: 0/{self.max_hints}")
        self.hints_label.setStyleSheet("color: #F39C12; font-size: 14px; font-weight: bold;")
        info_layout.addWidget(self.hints_label)
        
        layout.addLayout(info_layout)
        
        self.grid_frame = QFrame()
        self.grid_frame.setStyleSheet("background-color: #1A2530;")
        grid_layout = QGridLayout(self.grid_frame)
        grid_layout.setSpacing(2)
        self.buttons = []
        self.cell_group = QButtonGroup(self)
        
        for row in range(9):
            row_buttons = []
            for col in range(9):
                button = QPushButton()
                button.setFixedSize(50, 50)
                button.setCheckable(True)
                button.clicked.connect(lambda checked, r=row, c=col: self.selectCell(r, c))
                self.cell_group.addButton(button)
                self.applyCellStyle(button, row, col)
                grid_layout.addWidget(button, row, col)
                row_buttons.append(button)
            self.buttons.append(row_buttons)
        
        layout.addWidget(self.grid_frame)
        
        num_layout = QHBoxLayout()
        num_label = QLabel("数字:")
        num_label.setStyleSheet("color: #ECF0F1; font-size: 14px;")
        num_layout.addWidget(num_label)
        
        self.num_buttons = []
        self.num_group = QButtonGroup(self)
        for i in range(1, 10):
            num_btn = QPushButton(str(i))
            num_btn.setFixedSize(40, 40)
            num_btn.setStyleSheet("""
                QPushButton {
                    background-color: #3498DB;
                    color: white;
                    border: none;
                    font-size: 18px;
                    font-weight: bold;
                    border-radius: 5px;
                }
                QPushButton:hover {
                    background-color: #2980B9;
                }
            """)
            num_btn.clicked.connect(lambda checked, n=i: self.placeNumber(n))
            self.num_group.addButton(num_btn)
            self.num_buttons.append(num_btn)
            num_layout.addWidget(num_btn)
        
        layout.addLayout(num_layout)
        
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
        self.new_game_button.clicked.connect(self.generateSudoku)
        button_layout.addWidget(self.new_game_button)
        
        self.delete_button = QPushButton("删除")
        self.delete_button.setStyleSheet("""
            QPushButton {
                background-color: #E74C3C;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #C0392B;
            }
        """)
        self.delete_button.clicked.connect(self.deleteNumber)
        button_layout.addWidget(self.delete_button)
        
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
        self.hint_button.clicked.connect(self.giveHint)
        button_layout.addWidget(self.hint_button)
        
        self.solve_button = QPushButton("解答")
        self.solve_button.setStyleSheet("""
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
        self.solve_button.clicked.connect(self.solveSudoku)
        button_layout.addWidget(self.solve_button)
        
        layout.addLayout(button_layout)
        
        help_label = QLabel("选择格子，再选择数字 | ESC: 退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
    
    def applyCellStyle(self, button, row, col):
        """应用单元格样式"""
        border_style = ""
        if col % 3 == 2 and col != 8:
            border_style += "border-right: 3px solid #1A2530;"
        if row % 3 == 2 and row != 8:
            border_style += "border-bottom: 3px solid #1A2530;"
        
        button.setStyleSheet(f"""
            QPushButton {{
                background-color: #34495E;
                border: 1px solid #4A6572;
                font-size: 24px;
                font-weight: bold;
                color: #ECF0F1;
                {border_style}
            }}
            QPushButton:hover {{
                background-color: #3D566E;
            }}
            QPushButton:checked {{
                background-color: #1ABC9C;
            }}
        """)
    
    def changeDifficulty(self):
        """改变难度"""
        difficulty_text = self.difficulty_combo.currentText()
        if difficulty_text == '简单':
            self.difficulty = 'easy'
        elif difficulty_text == '中等':
            self.difficulty = 'medium'
        else:
            self.difficulty = 'hard'
        self.generateSudoku()
    
    def generateSudoku(self):
        """生成数独"""
        self.board = [[0 for _ in range(9)] for _ in range(9)]
        self.fillBoard()
        self.solution = [row.copy() for row in self.board]
        self.removeNumbers()
        self.initial_board = [row.copy() for row in self.board]
        self.mistakes = 0
        self.hints_used = 0
        self.game_over = False
        self.selected_row = None
        self.selected_col = None
        self.updateMistakesLabel()
        self.updateHintsLabel()
        self.updateDisplay()
    
    def fillBoard(self):
        """填充数独"""
        numbers = list(range(1, 10))
        for row in range(9):
            for col in range(9):
                if self.board[row][col] == 0:
                    random.shuffle(numbers)
                    for num in numbers:
                        if self.isValid(row, col, num):
                            self.board[row][col] = num
                            if self.fillBoard():
                                return True
                            self.board[row][col] = 0
                    return False
        return True
    
    def isValid(self, row, col, num):
        """检查数字是否有效"""
        if num in self.board[row]:
            return False
        
        for r in range(9):
            if self.board[r][col] == num:
                return False
        
        start_row = (row // 3) * 3
        start_col = (col // 3) * 3
        for r in range(start_row, start_row + 3):
            for c in range(start_col, start_col + 3):
                if self.board[r][c] == num:
                    return False
        
        return True
    
    def removeNumbers(self):
        """移除数字"""
        if self.difficulty == 'easy':
            remove_count = 35
        elif self.difficulty == 'medium':
            remove_count = 45
        else:
            remove_count = 55
        
        positions = [(r, c) for r in range(9) for c in range(9)]
        random.shuffle(positions)
        
        for i in range(remove_count):
            row, col = positions[i]
            self.board[row][col] = 0
    
    def selectCell(self, row, col):
        """选择单元格"""
        self.selected_row = row
        self.selected_col = col
    
    def placeNumber(self, num):
        """放置数字"""
        if self.game_over:
            return
        
        if self.selected_row is None:
            QMessageBox.information(self, "提示", "请先选择一个格子！")
            return
        
        row = self.selected_row
        col = self.selected_col
        
        if self.initial_board[row][col] != 0:
            QMessageBox.information(self, "提示", "初始数字不能修改！")
            return
        
        if self.solution[row][col] == num:
            self.board[row][col] = num
            self.updateDisplay()
            if self.isComplete():
                self.game_over = True
                QMessageBox.information(self, "恭喜", "🎉 你完成了数独！")
        else:
            self.mistakes += 1
            self.updateMistakesLabel()
            if self.mistakes >= self.max_mistakes:
                self.game_over = True
                QMessageBox.information(self, "游戏结束", "错误次数过多！游戏结束！")
            else:
                QMessageBox.warning(self, "错误", f"错误！还有 {self.max_mistakes - self.mistakes} 次机会")
    
    def deleteNumber(self):
        """删除数字"""
        if self.game_over:
            return
        
        if self.selected_row is None:
            QMessageBox.information(self, "提示", "请先选择一个格子！")
            return
        
        row = self.selected_row
        col = self.selected_col
        
        if self.initial_board[row][col] != 0:
            QMessageBox.information(self, "提示", "初始数字不能删除！")
            return
        
        self.board[row][col] = 0
        self.updateDisplay()
    
    def giveHint(self):
        """给出提示"""
        if self.game_over:
            return
        
        if self.hints_used >= self.max_hints:
            QMessageBox.information(self, "提示", "提示次数已用完！")
            return
        
        # 如果选中了格子且该格子为空，优先提示该位置
        if self.selected_row is not None and self.selected_col is not None:
            row = self.selected_row
            col = self.selected_col
            if self.board[row][col] == 0:
                self.board[row][col] = self.solution[row][col]
                self.hints_used += 1
                self.updateHintsLabel()
                self.updateDisplay()
                if self.isComplete():
                    self.game_over = True
                    QMessageBox.information(self, "恭喜", "🎉 你完成了数独！")
                return
        
        # 否则随机找一个空位提示
        empty_positions = []
        for row in range(9):
            for col in range(9):
                if self.board[row][col] == 0:
                    empty_positions.append((row, col))
        
        if empty_positions:
            row, col = random.choice(empty_positions)
            self.board[row][col] = self.solution[row][col]
            self.hints_used += 1
            self.updateHintsLabel()
            self.updateDisplay()
            if self.isComplete():
                self.game_over = True
                QMessageBox.information(self, "恭喜", "🎉 你完成了数独！")
    
    def solveSudoku(self):
        """解答数独"""
        self.board = [row.copy() for row in self.solution]
        self.game_over = True
        self.updateDisplay()
    
    def isComplete(self):
        """检查是否完成"""
        for row in range(9):
            for col in range(9):
                if self.board[row][col] != self.solution[row][col]:
                    return False
        return True
    
    def updateDisplay(self):
        """更新显示"""
        for row in range(9):
            for col in range(9):
                button = self.buttons[row][col]
                if self.board[row][col] != 0:
                    button.setText(str(self.board[row][col]))
                    if self.initial_board[row][col] != 0:
                        border_style = ""
                        if col % 3 == 2 and col != 8:
                            border_style += "border-right: 3px solid #1A2530;"
                        if row % 3 == 2 and row != 8:
                            border_style += "border-bottom: 3px solid #1A2530;"
                        
                        button.setStyleSheet(f"""
                            QPushButton {{
                                background-color: #2C3E50;
                                border: 1px solid #4A6572;
                                font-size: 24px;
                                font-weight: bold;
                                color: #FF69B4;
                                {border_style}
                            }}
                        """)
                    else:
                        self.applyCellStyle(button, row, col)
                else:
                    button.setText("")
                    self.applyCellStyle(button, row, col)
    
    def updateMistakesLabel(self):
        """更新错误标签"""
        self.mistakes_label.setText(f"错误: {self.mistakes}/{self.max_mistakes}")
    
    def updateHintsLabel(self):
        """更新提示标签"""
        remaining = self.max_hints - self.hints_used
        self.hints_label.setText(f"提示: {self.hints_used}/{self.max_hints}")
        if remaining == 0:
            self.hints_label.setStyleSheet("color: #E74C3C; font-size: 14px; font-weight: bold;")
        else:
            self.hints_label.setStyleSheet("color: #F39C12; font-size: 14px; font-weight: bold;")
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        if event.key() == Qt.Key_Escape:
            self.accept()
        elif Qt.Key_0 <= event.key() <= Qt.Key_9:
            num = event.key() - Qt.Key_0
            if num > 0:
                self.placeNumber(num)
        elif event.key() == Qt.Key_Backspace or event.key() == Qt.Key_Delete:
            self.deleteNumber()
    
    def showEvent(self, event):
        """窗口显示时获取焦点"""
        super(SudokuGame, self).showEvent(event)
        self.setFocus()
