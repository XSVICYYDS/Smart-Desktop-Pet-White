import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QFrame)
from PyQt5.QtCore import Qt, QTimer, QRect
from PyQt5.QtGui import QPainter, QColor, QFont


class TetrisCanvas(QFrame):
    """俄罗斯方块画布"""
    
    def __init__(self, parent=None):
        super(TetrisCanvas, self).__init__(parent)
        self.setMinimumSize(250, 500)
        self.setStyleSheet("background-color: #34495E; border: 2px solid #1ABC9C;")
        self.grid = []
        self.current_piece = []
        self.current_pos = (0, 0)
        self.current_shape_idx = 0
        self.game_paused = False
        self.game_over = False
        self.score = 0
        self.cell_size = 25
    
    def updateGameState(self, grid, current_piece, current_pos, current_shape_idx,
                      game_paused, game_over, score):
        """更新游戏状态"""
        self.grid = grid
        self.current_piece = current_piece
        self.current_pos = current_pos
        self.current_shape_idx = current_shape_idx
        self.game_paused = game_paused
        self.game_over = game_over
        self.score = score
        self.update()
    
    def paintEvent(self, event):
        """绘制游戏画面"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        colors = [
            QColor(0, 255, 255), QColor(255, 255, 0), QColor(128, 0, 128),
            QColor(0, 255, 0), QColor(255, 0, 0), QColor(0, 0, 255), QColor(255, 128, 0)
        ]
        
        # 绘制已落下的方块
        for y in range(len(self.grid)):
            for x in range(len(self.grid[y])):
                if self.grid[y][x] is not None:
                    painter.fillRect(x * self.cell_size, y * self.cell_size,
                                   self.cell_size - 1, self.cell_size - 1,
                                   colors[self.grid[y][x]])
        
        # 绘制当前方块
        for y in range(len(self.current_piece)):
            for x in range(len(self.current_piece[y])):
                if self.current_piece[y][x]:
                    px = (self.current_pos[1] + x) * self.cell_size
                    py = (self.current_pos[0] + y) * self.cell_size
                    painter.fillRect(px, py, self.cell_size - 1, self.cell_size - 1,
                                   colors[self.current_shape_idx])
        
        # 绘制暂停或游戏结束文字
        if self.game_paused:
            painter.setPen(QColor(255, 255, 255))
            painter.setFont(QFont("Arial", 24, QFont.Bold))
            painter.drawText(QRect(0, 0, 250, 500), Qt.AlignCenter, "暂停")
        elif self.game_over:
            painter.setPen(QColor(231, 76, 60))
            painter.setFont(QFont("Arial", 20, QFont.Bold))
            painter.drawText(QRect(0, 0, 250, 500), Qt.AlignCenter, f"游戏结束\n分数: {self.score}")


class TetrisGame(QDialog):
    """俄罗斯方块游戏"""
    
    SHAPES = [
        [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]],
        [[0, 1, 1], [1, 1, 0]], [[1, 1, 0], [0, 1, 1]], [[1, 0, 0], [1, 1, 1]],
        [[0, 0, 1], [1, 1, 1]]
    ]
    
    def __init__(self, parent=None):
        super(TetrisGame, self).__init__(parent)
        self.setWindowTitle("俄罗斯方块 - 小白")
        self.setFixedSize(380, 560)
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        self.grid_width = 10
        self.grid_height = 20
        self.timer = QTimer()
        self.timer.timeout.connect(self.updateGame)
        
        self.initGame()
        self.initUI()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initGame(self):
        """初始化游戏状态"""
        self.grid = [[None for _ in range(self.grid_width)] for _ in range(self.grid_height)]
        self.current_shape_idx = random.randint(0, len(self.SHAPES) - 1)
        self.current_piece = [row[:] for row in self.SHAPES[self.current_shape_idx]]
        self.current_pos = (0, self.grid_width // 2 - len(self.current_piece[0]) // 2)
        self.next_shape_idx = random.randint(0, len(self.SHAPES) - 1)
        self.score = 0
        self.game_over = False
        self.game_paused = False
    
    def initUI(self):
        """初始化UI"""
        layout = QHBoxLayout()
        
        left_layout = QVBoxLayout()
        info_layout = QHBoxLayout()
        
        self.score_label = QLabel(f"分数: {self.score}")
        self.score_label.setStyleSheet("color: #ECF0F1; font-size: 16px; font-weight: bold;")
        info_layout.addWidget(self.score_label)
        info_layout.addStretch()
        
        self.start_button = QPushButton("开始")
        self.start_button.setStyleSheet("background-color: #3498DB; color: white; border: none; padding: 8px 16px; border-radius: 4px;")
        self.start_button.clicked.connect(self.startGame)
        info_layout.addWidget(self.start_button)
        
        left_layout.addLayout(info_layout)
        
        self.canvas = TetrisCanvas()
        self.canvas.setFixedSize(250, 500)
        left_layout.addWidget(self.canvas)
        
        help_label = QLabel("↑旋转 ↓加速 ←→移动\n空格暂停 ESC退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        left_layout.addWidget(help_label)
        
        layout.addLayout(left_layout)
        
        right_layout = QVBoxLayout()
        right_layout.addStretch()
        
        next_label = QLabel("下一个:")
        next_label.setStyleSheet("color: #ECF0F1; font-size: 16px; font-weight: bold;")
        right_layout.addWidget(next_label)
        
        self.next_canvas = QLabel()
        self.next_canvas.setFixedSize(100, 100)
        self.next_canvas.setStyleSheet("background-color: #34495E; border: 2px solid #1ABC9C;")
        right_layout.addWidget(self.next_canvas)
        
        right_layout.addStretch()
        layout.addLayout(right_layout)
        
        self.setLayout(layout)
        self.updateCanvas()
    
    def spawnPiece(self):
        """生成新方块"""
        self.current_shape_idx = self.next_shape_idx
        self.current_piece = [row[:] for row in self.SHAPES[self.current_shape_idx]]
        self.current_pos = (0, self.grid_width // 2 - len(self.current_piece[0]) // 2)
        self.next_shape_idx = random.randint(0, len(self.SHAPES) - 1)
        
        if self.checkCollision(self.current_pos[0], self.current_pos[1], self.current_piece):
            self.gameOver()
    
    def checkCollision(self, y, x, piece):
        """检查碰撞"""
        for py in range(len(piece)):
            for px in range(len(piece[py])):
                if piece[py][px]:
                    new_y = y + py
                    new_x = x + px
                    if new_y >= self.grid_height or new_x < 0 or new_x >= self.grid_width:
                        return True
                    if new_y >= 0 and self.grid[new_y][new_x] is not None:
                        return True
        return False
    
    def rotatePiece(self):
        """旋转方块"""
        if self.game_paused or self.game_over:
            return
        rotated = list(zip(*self.current_piece[::-1]))
        rotated = [list(row) for row in rotated]
        if not self.checkCollision(self.current_pos[0], self.current_pos[1], rotated):
            self.current_piece = rotated
            self.updateCanvas()
    
    def moveLeft(self):
        """左移"""
        if self.game_paused or self.game_over:
            return
        if not self.checkCollision(self.current_pos[0], self.current_pos[1] - 1, self.current_piece):
            self.current_pos = (self.current_pos[0], self.current_pos[1] - 1)
            self.updateCanvas()
    
    def moveRight(self):
        """右移"""
        if self.game_paused or self.game_over:
            return
        if not self.checkCollision(self.current_pos[0], self.current_pos[1] + 1, self.current_piece):
            self.current_pos = (self.current_pos[0], self.current_pos[1] + 1)
            self.updateCanvas()
    
    def moveDown(self):
        """下移"""
        if self.game_paused or self.game_over:
            return
        if not self.checkCollision(self.current_pos[0] + 1, self.current_pos[1], self.current_piece):
            self.current_pos = (self.current_pos[0] + 1, self.current_pos[1])
            self.updateCanvas()
        else:
            self.lockPiece()
    
    def lockPiece(self):
        """锁定方块"""
        for y in range(len(self.current_piece)):
            for x in range(len(self.current_piece[y])):
                if self.current_piece[y][x]:
                    gy = self.current_pos[0] + y
                    gx = self.current_pos[1] + x
                    if gy >= 0:
                        self.grid[gy][gx] = self.current_shape_idx
        
        self.clearLines()
        self.spawnPiece()
        self.updateCanvas()
    
    def clearLines(self):
        """清除满行"""
        new_grid = []
        lines_cleared = 0
        
        for row in self.grid:
            if all(cell is not None for cell in row):
                lines_cleared += 1
            else:
                new_grid.append(row)
        
        while len(new_grid) < self.grid_height:
            new_grid.insert(0, [None for _ in range(self.grid_width)])
        
        self.grid = new_grid
        
        if lines_cleared > 0:
            self.score += lines_cleared * 100
            self.score_label.setText(f"分数: {self.score}")
    
    def startGame(self):
        """开始游戏"""
        if self.game_over:
            self.initGame()
            self.updateCanvas()
        self.game_paused = False
        self.timer.start(500)
        self.start_button.setText("暂停")
        self.start_button.clicked.disconnect()
        self.start_button.clicked.connect(self.togglePause)
    
    def togglePause(self):
        """切换暂停"""
        self.game_paused = not self.game_paused
        if self.game_paused:
            self.timer.stop()
            self.start_button.setText("继续")
        else:
            self.timer.start(500)
            self.start_button.setText("暂停")
        self.updateCanvas()
    
    def updateGame(self):
        """更新游戏"""
        if self.game_paused or self.game_over:
            return
        self.moveDown()
    
    def gameOver(self):
        """游戏结束"""
        self.game_over = True
        self.timer.stop()
        self.start_button.setText("重新开始")
        self.start_button.clicked.disconnect()
        self.start_button.clicked.connect(self.startGame)
        self.updateCanvas()
        QMessageBox.information(self, "游戏结束", f"最终分数: {self.score}")
    
    def updateCanvas(self):
        """更新画布"""
        self.canvas.updateGameState(self.grid, self.current_piece, self.current_pos,
                                  self.current_shape_idx, self.game_paused, self.game_over, self.score)
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        key = event.key()
        
        if key == Qt.Key_Escape:
            self.accept()
        elif key == Qt.Key_Space:
            if not self.game_over:
                self.togglePause()
        elif not self.game_paused and not self.game_over:
            if key == Qt.Key_Up:
                self.rotatePiece()
            elif key == Qt.Key_Down:
                self.moveDown()
            elif key == Qt.Key_Left:
                self.moveLeft()
            elif key == Qt.Key_Right:
                self.moveRight()
    
    def showEvent(self, event):
        super(TetrisGame, self).showEvent(event)
        self.setFocus()
