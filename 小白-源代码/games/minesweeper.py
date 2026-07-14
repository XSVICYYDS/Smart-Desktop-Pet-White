import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QGridLayout, QFrame)
from PyQt5.QtCore import Qt, QSize, QRect
from PyQt5.QtGui import QPainter, QColor, QFont, QIcon, QPixmap


class MineCell(QPushButton):
    """扫雷单元格"""
    
    def __init__(self, row, col, parent=None):
        super(MineCell, self).__init__(parent)
        self.row = row
        self.col = col
        self.is_mine = False
        self.is_revealed = False
        self.is_flagged = False
        self.adjacent_mines = 0
        self.setFixedSize(30, 30)
        self.setStyleSheet("""
            QPushButton {
                background-color: #95A5A6;
                border: 2px solid #7F8C8D;
                font-weight: bold;
                font-size: 16px;
            }
            QPushButton:hover {
                background-color: #BDC3C7;
            }
        """)


class MinesweeperGame(QDialog):
    """扫雷游戏"""
    
    def __init__(self, parent=None):
        super(MinesweeperGame, self).__init__(parent)
        self.setWindowTitle("扫雷 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        # 游戏参数
        self.rows = 10
        self.cols = 10
        self.mines_count = 15
        self.cells = []
        self.game_over = False
        self.game_won = False
        self.revealed_count = 0
        self.flagged_count = 0
        
        # 初始化游戏
        self.initGame()
        self.initUI()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initGame(self):
        """初始化游戏"""
        self.cells = []
        self.game_over = False
        self.game_won = False
        self.revealed_count = 0
        self.flagged_count = 0
        
        # 创建空网格
        for row in range(self.rows):
            row_cells = []
            for col in range(self.cols):
                row_cells.append({
                    'is_mine': False,
                    'is_revealed': False,
                    'is_flagged': False,
                    'adjacent_mines': 0
                })
            self.cells.append(row_cells)
        
        # 放置地雷
        mines_placed = 0
        while mines_placed < self.mines_count:
            row = random.randint(0, self.rows - 1)
            col = random.randint(0, self.cols - 1)
            if not self.cells[row][col]['is_mine']:
                self.cells[row][col]['is_mine'] = True
                mines_placed += 1
        
        # 计算相邻地雷数
        for row in range(self.rows):
            for col in range(self.cols):
                if not self.cells[row][col]['is_mine']:
                    self.cells[row][col]['adjacent_mines'] = self.countAdjacentMines(row, col)
    
    def countAdjacentMines(self, row, col):
        """计算相邻地雷数"""
        count = 0
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = row + dr, col + dc
                if 0 <= nr < self.rows and 0 <= nc < self.cols:
                    if self.cells[nr][nc]['is_mine']:
                        count += 1
        return count
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        # 顶部信息栏
        info_layout = QHBoxLayout()
        
        self.mines_label = QLabel(f"地雷: {self.mines_count - self.flagged_count}")
        self.mines_label.setStyleSheet("color: #ECF0F1; font-size: 16px; font-weight: bold;")
        info_layout.addWidget(self.mines_label)
        
        info_layout.addStretch()
        
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
        info_layout.addWidget(self.restart_button)
        
        layout.addLayout(info_layout)
        
        # 游戏网格
        self.grid_layout = QGridLayout()
        self.grid_layout.setSpacing(2)
        self.cell_buttons = []
        
        for row in range(self.rows):
            row_buttons = []
            for col in range(self.cols):
                button = QPushButton()
                button.setFixedSize(30, 30)
                button.setProperty('row', row)
                button.setProperty('col', col)
                button.clicked.connect(lambda checked, r=row, c=col: self.onCellClicked(r, c))
                button.setContextMenuPolicy(Qt.CustomContextMenu)
                button.customContextMenuRequested.connect(lambda pos, r=row, c=col: self.onCellRightClicked(r, c))
                self.grid_layout.addWidget(button, row, col)
                row_buttons.append(button)
            self.cell_buttons.append(row_buttons)
        
        layout.addLayout(self.grid_layout)
        
        # 帮助信息
        help_label = QLabel("左键: 揭开  右键: 标记  ESC: 退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
        self.updateCells()
    
    def getNumberColor(self, num):
        """根据数字获取颜色"""
        colors = [
            QColor(0, 0, 255),      # 1 - 蓝色
            QColor(0, 128, 0),      # 2 - 绿色
            QColor(255, 0, 0),      # 3 - 红色
            QColor(0, 0, 128),      # 4 - 深蓝
            QColor(128, 0, 0),      # 5 - 深红
            QColor(0, 128, 128),    # 6 - 青色
            QColor(0, 0, 0),        # 7 - 黑色
            QColor(128, 128, 128),  # 8 - 灰色
        ]
        if 1 <= num <= 8:
            return colors[num - 1]
        return QColor(0, 0, 0)
    
    def updateCells(self):
        """更新所有单元格显示"""
        for row in range(self.rows):
            for col in range(self.cols):
                button = self.cell_buttons[row][col]
                cell = self.cells[row][col]
                
                if cell['is_revealed']:
                    if cell['is_mine']:
                        button.setText("💣")
                        button.setStyleSheet("""
                            QPushButton {
                                background-color: #E74C3C;
                                border: 2px solid #C0392B;
                                font-size: 18px;
                            }
                        """)
                    else:
                        if cell['adjacent_mines'] > 0:
                            button.setText(str(cell['adjacent_mines']))
                            color = self.getNumberColor(cell['adjacent_mines'])
                            button.setStyleSheet(f"""
                                QPushButton {{
                                    background-color: #ECF0F1;
                                    border: 1px solid #BDC3C7;
                                    font-weight: bold;
                                    font-size: 16px;
                                    color: {color.name()};
                                }}
                            """)
                        else:
                            button.setText("")
                            button.setStyleSheet("""
                                QPushButton {
                                    background-color: #ECF0F1;
                                    border: 1px solid #BDC3C7;
                                }
                            """)
                elif cell['is_flagged']:
                    button.setText("🚩")
                    button.setStyleSheet("""
                        QPushButton {
                            background-color: #F39C12;
                            border: 2px solid #D68910;
                            font-size: 16px;
                        }
                    """)
                else:
                    button.setText("")
                    button.setStyleSheet("""
                        QPushButton {
                            background-color: #95A5A6;
                            border: 2px solid #7F8C8D;
                        }
                        QPushButton:hover {
                            background-color: #BDC3C7;
                        }
                    """)
        
        self.mines_label.setText(f"地雷: {self.mines_count - self.flagged_count}")
    
    def onCellClicked(self, row, col):
        """左键点击单元格"""
        if self.game_over or self.game_won:
            return
        
        cell = self.cells[row][col]
        if cell['is_flagged'] or cell['is_revealed']:
            return
        
        self.revealCell(row, col)
        self.updateCells()
        self.checkWin()
    
    def onCellRightClicked(self, row, col):
        """右键点击单元格（标记）"""
        if self.game_over or self.game_won:
            return
        
        cell = self.cells[row][col]
        if cell['is_revealed']:
            return
        
        cell['is_flagged'] = not cell['is_flagged']
        if cell['is_flagged']:
            self.flagged_count += 1
        else:
            self.flagged_count -= 1
        
        self.updateCells()
    
    def revealCell(self, row, col):
        """揭开单元格"""
        if row < 0 or row >= self.rows or col < 0 or col >= self.cols:
            return
        
        cell = self.cells[row][col]
        if cell['is_revealed'] or cell['is_flagged']:
            return
        
        cell['is_revealed'] = True
        self.revealed_count += 1
        
        if cell['is_mine']:
            self.gameOver()
            return
        
        if cell['adjacent_mines'] == 0:
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr != 0 or dc != 0:
                        self.revealCell(row + dr, col + dc)
    
    def gameOver(self):
        """游戏结束"""
        self.game_over = True
        
        # 揭开所有地雷
        for row in range(self.rows):
            for col in range(self.cols):
                if self.cells[row][col]['is_mine']:
                    self.cells[row][col]['is_revealed'] = True
        
        self.updateCells()
        QMessageBox.information(self, "游戏结束", "你踩到地雷了！")
    
    def checkWin(self):
        """检查是否获胜"""
        total_cells = self.rows * self.cols
        safe_cells = total_cells - self.mines_count
        
        if self.revealed_count == safe_cells:
            self.game_won = True
            QMessageBox.information(self, "恭喜！", "你赢了！")
    
    def restartGame(self):
        """重新开始游戏"""
        self.initGame()
        self.updateCells()
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        if event.key() == Qt.Key_Escape:
            self.accept()
    
    def showEvent(self, event):
        """窗口显示时获取焦点"""
        super(MinesweeperGame, self).showEvent(event)
        self.setFocus()
