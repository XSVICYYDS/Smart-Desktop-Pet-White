from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QFrame)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QPainter, QColor


class SokobanCanvas(QFrame):
    """推箱子画布"""
    
    def __init__(self, parent=None):
        super(SokobanCanvas, self).__init__(parent)
        self.setMinimumSize(400, 400)
        self.setStyleSheet("background-color: #2C3E50;")
        self.board = []
        self.cell_size = 40
    
    def updateBoard(self, board):
        """更新棋盘"""
        self.board = board
        self.update()
    
    def paintEvent(self, event):
        """绘制"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        if not self.board:
            return
        
        rows = len(self.board)
        cols = len(self.board[0]) if rows > 0 else 0
        
        # 计算偏移量使画面居中
        offset_x = (self.width() - cols * self.cell_size) // 2
        offset_y = (self.height() - rows * self.cell_size) // 2
        
        for row in range(rows):
            for col in range(cols):
                cell = self.board[row][col]
                x = offset_x + col * self.cell_size
                y = offset_y + row * self.cell_size
                
                # 绘制地板
                if cell in ['#', '@', '$', '.', '+', '*']:
                    painter.fillRect(x, y, self.cell_size, self.cell_size, QColor(52, 73, 94))
                else:
                    painter.fillRect(x, y, self.cell_size, self.cell_size, QColor(44, 62, 80))
                
                # 绘制墙
                if cell == '#':
                    painter.fillRect(x + 2, y + 2, self.cell_size - 4, self.cell_size - 4, QColor(149, 165, 166))
                
                # 绘制目标点
                if cell in ['.', '+', '*']:
                    painter.setBrush(QColor(241, 196, 15))
                    painter.setPen(Qt.NoPen)
                    painter.drawEllipse(x + 10, y + 10, self.cell_size - 20, self.cell_size - 20)
                
                # 绘制箱子
                if cell in ['$', '*']:
                    if cell == '*':
                        color = QColor(46, 204, 113)
                    else:
                        color = QColor(230, 126, 34)
                    painter.fillRect(x + 5, y + 5, self.cell_size - 10, self.cell_size - 10, color)
                    painter.setPen(QColor(0, 0, 0, 50))
                    painter.drawLine(x + 5, y + 5, x + self.cell_size - 5, y + self.cell_size - 5)
                    painter.drawLine(x + self.cell_size - 5, y + 5, x + 5, y + self.cell_size - 5)
                
                # 绘制玩家
                if cell in ['@', '+']:
                    painter.setBrush(QColor(52, 152, 219))
                    painter.setPen(Qt.NoPen)
                    painter.drawEllipse(x + 8, y + 8, self.cell_size - 16, self.cell_size - 16)
                    painter.setBrush(QColor(255, 255, 255))
                    painter.drawEllipse(x + 14, y + 14, 5, 5)
                    painter.drawEllipse(x + 21, y + 14, 5, 5)


class SokobanGame(QDialog):
    """推箱子游戏"""
    
    LEVELS = [
        [
            "  #####  ",
            "###   #  ",
            "#.@$  #  ",
            "### $.#  ",
            "#.##$ #  ",
            "# # . ## ",
            "#$ *$$.# ",
            "#   .  # ",
            "######## "
        ],
        [
            "  #####  ",
            "  #   #  ",
            "  #$  #  ",
            "###  $###",
            "#  $@.  #",
            "#  ##   #",
            "#    # ##",
            "######## "
        ],
        [
            "  #####  ",
            " ##   #  ",
            "## $ $ # ",
            "#  .#. # ",
            "# $.@$.# ",
            "##  # ## ",
            " #####   "
        ]
    ]
    
    def __init__(self, parent=None):
        super(SokobanGame, self).__init__(parent)
        self.setWindowTitle("推箱子 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        self.current_level = 0
        self.board = []
        self.original_board = []
        self.moves = 0
        self.history = []
        
        self.initUI()
        self.initGame()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initGame(self):
        """初始化游戏"""
        self.loadLevel(self.current_level)
    
    def loadLevel(self, level_index):
        """加载关卡"""
        if level_index < 0 or level_index >= len(self.LEVELS):
            return
        
        self.current_level = level_index
        level = self.LEVELS[level_index]
        self.board = [list(row) for row in level]
        self.original_board = [list(row) for row in level]
        self.moves = 0
        self.history = []
        self.updateUI()
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        # 顶部信息
        info_layout = QHBoxLayout()
        
        self.level_label = QLabel(f"关卡: {self.current_level + 1}")
        self.level_label.setStyleSheet("color: #ECF0F1; font-size: 16px; font-weight: bold;")
        info_layout.addWidget(self.level_label)
        
        info_layout.addStretch()
        
        self.moves_label = QLabel(f"步数: {self.moves}")
        self.moves_label.setStyleSheet("color: #ECF0F1; font-size: 16px; font-weight: bold;")
        info_layout.addWidget(self.moves_label)
        
        layout.addLayout(info_layout)
        
        # 画布
        self.canvas = SokobanCanvas()
        self.canvas.setFixedSize(400, 400)
        layout.addWidget(self.canvas)
        
        # 控制按钮
        button_layout1 = QHBoxLayout()
        
        self.prev_button = QPushButton("上一关")
        self.prev_button.setStyleSheet("""
            QPushButton {
                background-color: #9B59B6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
        """)
        self.prev_button.clicked.connect(self.prevLevel)
        button_layout1.addWidget(self.prev_button)
        
        self.next_button = QPushButton("下一关")
        self.next_button.setStyleSheet("""
            QPushButton {
                background-color: #9B59B6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
        """)
        self.next_button.clicked.connect(self.nextLevel)
        button_layout1.addWidget(self.next_button)
        
        layout.addLayout(button_layout1)
        
        button_layout2 = QHBoxLayout()
        
        self.undo_button = QPushButton("撤销")
        self.undo_button.setStyleSheet("""
            QPushButton {
                background-color: #F39C12;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
        """)
        self.undo_button.clicked.connect(self.undo)
        button_layout2.addWidget(self.undo_button)
        
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
        self.restart_button.clicked.connect(self.restartLevel)
        button_layout2.addWidget(self.restart_button)
        
        layout.addLayout(button_layout2)
        
        help_label = QLabel("方向键: 移动  R: 重开  Z: 撤销  ESC: 退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
        self.updateUI()
    
    def findPlayer(self):
        """找到玩家位置"""
        for row in range(len(self.board)):
            for col in range(len(self.board[row])):
                if self.board[row][col] in ['@', '+']:
                    return (row, col)
        return None
    
    def move(self, dx, dy):
        """移动玩家"""
        player_pos = self.findPlayer()
        if not player_pos:
            return
        
        row, col = player_pos
        new_row, new_col = row + dx, col + dy
        
        if new_row < 0 or new_row >= len(self.board):
            return
        if new_col < 0 or new_col >= len(self.board[new_row]):
            return
        
        target = self.board[new_row][new_col]
        
        if target == '#':
            return
        
        if target in ['$', '*']:
            box_new_row, box_new_col = new_row + dx, new_col + dy
            
            if box_new_row < 0 or box_new_row >= len(self.board):
                return
            if box_new_col < 0 or box_new_col >= len(self.board[box_new_row]):
                return
            
            box_target = self.board[box_new_row][box_new_col]
            
            if box_target in ['#', '$', '*']:
                return
            
            self.saveHistory()
            
            if box_target == '.':
                self.board[box_new_row][box_new_col] = '*'
            else:
                self.board[box_new_row][box_new_col] = '$'
            
            if target == '*':
                self.board[new_row][new_col] = '+'
            else:
                self.board[new_row][new_col] = '@'
            
            if self.board[row][col] == '+':
                self.board[row][col] = '.'
            else:
                self.board[row][col] = ' '
        
        else:
            self.saveHistory()
            
            if target == '.':
                self.board[new_row][new_col] = '+'
            else:
                self.board[new_row][new_col] = '@'
            
            if self.board[row][col] == '+':
                self.board[row][col] = '.'
            else:
                self.board[row][col] = ' '
        
        self.moves += 1
        self.updateUI()
        self.checkWin()
    
    def saveHistory(self):
        """保存历史"""
        self.history.append([list(row) for row in self.board])
    
    def undo(self):
        """撤销"""
        if not self.history:
            return
        
        self.board = self.history.pop()
        self.moves = max(0, self.moves - 1)
        self.updateUI()
    
    def checkWin(self):
        """检查是否获胜"""
        for row in self.board:
            for cell in row:
                if cell in ['$', '.']:
                    return
        
        QMessageBox.information(self, "恭喜！", f"你用了 {self.moves} 步完成了关卡！")
    
    def restartLevel(self):
        """重新开始当前关卡"""
        self.loadLevel(self.current_level)
    
    def prevLevel(self):
        """上一关"""
        if self.current_level > 0:
            self.loadLevel(self.current_level - 1)
    
    def nextLevel(self):
        """下一关"""
        if self.current_level < len(self.LEVELS) - 1:
            self.loadLevel(self.current_level + 1)
    
    def updateUI(self):
        """更新UI"""
        self.level_label.setText(f"关卡: {self.current_level + 1}")
        self.moves_label.setText(f"步数: {self.moves}")
        self.canvas.updateBoard(self.board)
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        key = event.key()
        
        if key == Qt.Key_Escape:
            self.accept()
        elif key == Qt.Key_Up:
            self.move(-1, 0)
        elif key == Qt.Key_Down:
            self.move(1, 0)
        elif key == Qt.Key_Left:
            self.move(0, -1)
        elif key == Qt.Key_Right:
            self.move(0, 1)
        elif key == Qt.Key_R:
            self.restartLevel()
        elif key == Qt.Key_Z:
            self.undo()
    
    def showEvent(self, event):
        """窗口显示时获取焦点"""
        super(SokobanGame, self).showEvent(event)
        self.setFocus()
