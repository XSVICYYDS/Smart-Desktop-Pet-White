import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QFrame)
from PyQt5.QtCore import Qt, QRect
from PyQt5.QtGui import QPainter, QColor, QFont


class Game2048Canvas(QFrame):
    """2048游戏画布"""
    
    COLORS = {
        0: QColor(204, 192, 179), 2: QColor(238, 228, 218), 4: QColor(237, 224, 200),
        8: QColor(242, 177, 121), 16: QColor(245, 149, 99), 32: QColor(246, 124, 95),
        64: QColor(246, 94, 59), 128: QColor(237, 207, 114), 256: QColor(237, 204, 97),
        512: QColor(237, 200, 80), 1024: QColor(237, 197, 63), 2048: QColor(237, 194, 46),
    }
    
    TEXT_COLORS = {
        0: QColor(204, 192, 179), 2: QColor(119, 110, 101), 4: QColor(119, 110, 101),
        8: QColor(249, 246, 242), 16: QColor(249, 246, 242), 32: QColor(249, 246, 242),
        64: QColor(249, 246, 242), 128: QColor(249, 246, 242), 256: QColor(249, 246, 242),
        512: QColor(249, 246, 242), 1024: QColor(249, 246, 242), 2048: QColor(249, 246, 242),
    }
    
    def __init__(self, parent=None):
        super(Game2048Canvas, self).__init__(parent)
        self.setMinimumSize(400, 400)
        self.setStyleSheet("background-color: #BBADA0; border-radius: 10px;")
        self.grid = []
        self.score = 0
        self.game_over = False
        self.cell_size = 95
        self.cell_spacing = 10
    
    def updateGameState(self, grid, score, game_over):
        """更新游戏状态"""
        self.grid = grid
        self.score = score
        self.game_over = game_over
        self.update()
    
    def paintEvent(self, event):
        """绘制游戏画面"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        for y in range(4):
            for x in range(4):
                px = x * (self.cell_size + self.cell_spacing) + self.cell_spacing
                py = y * (self.cell_size + self.cell_spacing) + self.cell_spacing
                
                value = self.grid[y][x]
                
                painter.fillRect(px, py, self.cell_size, self.cell_size,
                               self.COLORS.get(value, QColor(60, 58, 50)))
                
                if value != 0:
                    painter.setPen(self.TEXT_COLORS.get(value, QColor(249, 246, 242)))
                    font_size = 36 if value < 100 else 28 if value < 1000 else 24
                    painter.setFont(QFont("Arial", font_size, QFont.Bold))
                    painter.drawText(QRect(px, py, self.cell_size, self.cell_size),
                                   Qt.AlignCenter, str(value))
        
        if self.game_over:
            painter.setPen(QColor(231, 76, 60))
            painter.setFont(QFont("Arial", 24, QFont.Bold))
            painter.drawText(QRect(0, 0, 400, 400), Qt.AlignCenter,
                          f"游戏结束\n分数: {self.score}")


class Game2048(QDialog):
    """2048游戏"""
    
    def __init__(self, parent=None):
        super(Game2048, self).__init__(parent)
        self.setWindowTitle("2048 - 小白")
        self.setFixedSize(420, 530)
        self.setStyleSheet("background-color: #FAF8EF;")
        self.setWindowModality(Qt.NonModal)
        
        self.initGame()
        self.initUI()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initGame(self):
        """初始化游戏状态"""
        self.grid = [[0 for _ in range(4)] for _ in range(4)]
        self.score = 0
        self.game_over = False
        self.game_won = False
        self.addNewTile()
        self.addNewTile()
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        info_layout = QHBoxLayout()
        
        title_label = QLabel("2048")
        title_label.setStyleSheet("color: #776E65; font-size: 40px; font-weight: bold;")
        info_layout.addWidget(title_label)
        
        info_layout.addStretch()
        
        self.score_label = QLabel(f"分数: {self.score}")
        self.score_label.setStyleSheet("""
            background-color: #BBADA0; color: white; padding: 10px 20px; border-radius: 5px;
            font-size: 18px; font-weight: bold;
        """)
        info_layout.addWidget(self.score_label)
        
        self.restart_button = QPushButton("重新开始")
        self.restart_button.setStyleSheet("""
            QPushButton {
                background-color: #8F7A66; color: white; border: none; padding: 10px 20px;
                border-radius: 5px; font-size: 16px; font-weight: bold;
            }
        """)
        self.restart_button.clicked.connect(self.restartGame)
        info_layout.addWidget(self.restart_button)
        
        layout.addLayout(info_layout)
        
        self.canvas = Game2048Canvas()
        self.canvas.setFixedSize(400, 400)
        layout.addWidget(self.canvas)
        
        help_label = QLabel("方向键: 移动  ESC: 退出")
        help_label.setStyleSheet("color: #776E65; font-size: 14px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
        self.updateCanvas()
    
    def addNewTile(self):
        """添加新方块"""
        empty_cells = []
        for y in range(4):
            for x in range(4):
                if self.grid[y][x] == 0:
                    empty_cells.append((y, x))
        
        if empty_cells:
            y, x = random.choice(empty_cells)
            self.grid[y][x] = 2 if random.random() < 0.9 else 4
    
    def moveLeft(self):
        """左移"""
        moved = False
        for y in range(4):
            row = [num for num in self.grid[y] if num != 0]
            new_row = []
            skip = False
            for i in range(len(row)):
                if skip:
                    skip = False
                    continue
                if i + 1 < len(row) and row[i] == row[i + 1]:
                    new_row.append(row[i] * 2)
                    self.score += row[i] * 2
                    skip = True
                else:
                    new_row.append(row[i])
            
            new_row += [0] * (4 - len(new_row))
            if new_row != self.grid[y]:
                moved = True
                self.grid[y] = new_row
        
        if moved:
            self.addNewTile()
            self.checkGameState()
            self.updateCanvas()
    
    def moveRight(self):
        """右移"""
        moved = False
        for y in range(4):
            row = [num for num in self.grid[y] if num != 0]
            new_row = []
            skip = False
            for i in range(len(row) - 1, -1, -1):
                if skip:
                    skip = False
                    continue
                if i - 1 >= 0 and row[i] == row[i - 1]:
                    new_row.insert(0, row[i] * 2)
                    self.score += row[i] * 2
                    skip = True
                else:
                    new_row.insert(0, row[i])
            
            new_row = [0] * (4 - len(new_row)) + new_row
            if new_row != self.grid[y]:
                moved = True
                self.grid[y] = new_row
        
        if moved:
            self.addNewTile()
            self.checkGameState()
            self.updateCanvas()
    
    def moveUp(self):
        """上移"""
        moved = False
        for x in range(4):
            col = [self.grid[y][x] for y in range(4) if self.grid[y][x] != 0]
            new_col = []
            skip = False
            for i in range(len(col)):
                if skip:
                    skip = False
                    continue
                if i + 1 < len(col) and col[i] == col[i + 1]:
                    new_col.append(col[i] * 2)
                    self.score += col[i] * 2
                    skip = True
                else:
                    new_col.append(col[i])
            
            new_col += [0] * (4 - len(new_col))
            for y in range(4):
                if self.grid[y][x] != new_col[y]:
                    moved = True
                self.grid[y][x] = new_col[y]
        
        if moved:
            self.addNewTile()
            self.checkGameState()
            self.updateCanvas()
    
    def moveDown(self):
        """下移"""
        moved = False
        for x in range(4):
            col = [self.grid[y][x] for y in range(4) if self.grid[y][x] != 0]
            new_col = []
            skip = False
            for i in range(len(col) - 1, -1, -1):
                if skip:
                    skip = False
                    continue
                if i - 1 >= 0 and col[i] == col[i - 1]:
                    new_col.insert(0, col[i] * 2)
                    self.score += col[i] * 2
                    skip = True
                else:
                    new_col.insert(0, col[i])
            
            new_col = [0] * (4 - len(new_col)) + new_col
            for y in range(4):
                if self.grid[y][x] != new_col[y]:
                    moved = True
                self.grid[y][x] = new_col[y]
        
        if moved:
            self.addNewTile()
            self.checkGameState()
            self.updateCanvas()
    
    def checkGameState(self):
        """检查游戏状态"""
        self.score_label.setText(f"分数: {self.score}")
        
        # 检查是否获胜
        if not self.game_won:
            for y in range(4):
                for x in range(4):
                    if self.grid[y][x] == 2048:
                        self.game_won = True
                        QMessageBox.information(self, "恭喜", "你合成了2048！")
                        return
        
        # 检查是否还有空格
        if any(0 in row for row in self.grid):
            return
        
        # 检查是否还有可合并的
        for y in range(4):
            for x in range(4):
                if x + 1 < 4 and self.grid[y][x] == self.grid[y][x + 1]:
                    return
                if y + 1 < 4 and self.grid[y][x] == self.grid[y + 1][x]:
                    return
        
        self.game_over = True
        QMessageBox.information(self, "游戏结束", f"游戏结束！\n最终分数: {self.score}")
    
    def restartGame(self):
        """重新开始"""
        self.initGame()
        self.updateCanvas()
    
    def updateCanvas(self):
        """更新画布"""
        self.canvas.updateGameState(self.grid, self.score, self.game_over)
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        key = event.key()
        
        if key == Qt.Key_Escape:
            self.accept()
        elif not self.game_over:
            if key == Qt.Key_Up:
                self.moveUp()
            elif key == Qt.Key_Down:
                self.moveDown()
            elif key == Qt.Key_Left:
                self.moveLeft()
            elif key == Qt.Key_Right:
                self.moveRight()
    
    def showEvent(self, event):
        super(Game2048, self).showEvent(event)
        self.setFocus()
