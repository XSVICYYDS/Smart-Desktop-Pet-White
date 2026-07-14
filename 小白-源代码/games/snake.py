import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QFrame)
from PyQt5.QtCore import Qt, QTimer, QRect
from PyQt5.QtGui import QPainter, QColor, QFont


class SnakeCanvas(QFrame):
    """蛇游戏画布"""
    
    def __init__(self, parent=None):
        super(SnakeCanvas, self).__init__(parent)
        self.setMinimumSize(400, 400)
        self.setStyleSheet("background-color: #34495E; border: 2px solid #1ABC9C;")
        self.snake = []
        self.food = (0, 0)
        self.game_paused = False
        self.game_over = False
        self.score = 0
        self.cell_size = 20
        self.grid_width = 20
        self.grid_height = 20
    
    def updateGameState(self, snake, food, game_paused, game_over, score):
        """更新游戏状态"""
        self.snake = snake
        self.food = food
        self.game_paused = game_paused
        self.game_over = game_over
        self.score = score
        self.update()
    
    def paintEvent(self, event):
        """绘制游戏画面"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        # 绘制蛇
        for i, (x, y) in enumerate(self.snake):
            color = QColor(46, 204, 113) if i == 0 else QColor(39, 174, 96)
            painter.fillRect(x * self.cell_size, y * self.cell_size,
                           self.cell_size - 1, self.cell_size - 1, color)
        
        # 绘制食物
        painter.fillRect(self.food[0] * self.cell_size, self.food[1] * self.cell_size,
                        self.cell_size - 1, self.cell_size - 1, QColor(231, 76, 60))
        
        # 绘制暂停或游戏结束文字
        if self.game_paused:
            painter.setPen(QColor(255, 255, 255))
            painter.setFont(QFont("Arial", 30, QFont.Bold))
            painter.drawText(QRect(0, 0, 400, 400), Qt.AlignCenter, "暂停")
        elif self.game_over:
            painter.setPen(QColor(231, 76, 60))
            painter.setFont(QFont("Arial", 24, QFont.Bold))
            painter.drawText(QRect(0, 0, 400, 400), Qt.AlignCenter, f"游戏结束\n分数: {self.score}")


class SnakeGame(QDialog):
    """贪吃蛇游戏"""
    
    def __init__(self, parent=None):
        super(SnakeGame, self).__init__(parent)
        self.setWindowTitle("贪吃蛇 - 小白")
        self.setFixedSize(420, 530)
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        # 游戏参数
        self.cell_size = 20
        self.grid_width = 20
        self.grid_height = 20
        self.timer = QTimer()
        self.timer.timeout.connect(self.updateGame)
        
        # 初始化游戏
        self.initGame()
        self.initUI()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initGame(self):
        """初始化游戏状态"""
        self.snake = [(10, 10), (9, 10), (8, 10)]
        self.direction = (1, 0)
        self.next_direction = (1, 0)
        self.food = self.generateFood()
        self.score = 0
        self.game_over = False
        self.game_paused = False
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        info_layout = QHBoxLayout()
        self.score_label = QLabel(f"分数: {self.score}")
        self.score_label.setStyleSheet("color: #ECF0F1; font-size: 16px; font-weight: bold;")
        info_layout.addWidget(self.score_label)
        info_layout.addStretch()
        
        self.start_button = QPushButton("开始")
        self.start_button.setStyleSheet("""
            QPushButton {
                background-color: #3498DB;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
        """)
        self.start_button.clicked.connect(self.startGame)
        info_layout.addWidget(self.start_button)
        
        layout.addLayout(info_layout)
        
        self.canvas = SnakeCanvas()
        self.canvas.setFixedSize(400, 400)
        layout.addWidget(self.canvas)
        
        help_label = QLabel("方向键: 移动  空格: 暂停/继续  ESC: 退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
        self.updateCanvas()
    
    def generateFood(self):
        """生成食物"""
        while True:
            food = (random.randint(0, self.grid_width - 1), 
                   random.randint(0, self.grid_height - 1))
            if food not in self.snake:
                return food
    
    def startGame(self):
        """开始游戏"""
        if self.game_over:
            self.initGame()
            self.updateCanvas()
        self.game_paused = False
        self.timer.start(150)
        self.start_button.setText("暂停")
        self.start_button.clicked.disconnect()
        self.start_button.clicked.connect(self.togglePause)
    
    def togglePause(self):
        """切换暂停状态"""
        self.game_paused = not self.game_paused
        if self.game_paused:
            self.timer.stop()
            self.start_button.setText("继续")
        else:
            self.timer.start(150)
            self.start_button.setText("暂停")
        self.updateCanvas()
    
    def updateGame(self):
        """更新游戏状态"""
        if self.game_paused or self.game_over:
            return
        
        self.direction = self.next_direction
        head = self.snake[0]
        new_head = (head[0] + self.direction[0], head[1] + self.direction[1])
        
        if (new_head[0] < 0 or new_head[0] >= self.grid_width or
            new_head[1] < 0 or new_head[1] >= self.grid_height or
            new_head in self.snake):
            self.gameOver()
            return
        
        self.snake.insert(0, new_head)
        
        if new_head == self.food:
            self.score += 10
            self.score_label.setText(f"分数: {self.score}")
            self.food = self.generateFood()
        else:
            self.snake.pop()
        
        self.updateCanvas()
    
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
        self.canvas.updateGameState(self.snake, self.food, self.game_paused, self.game_over, self.score)
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        key = event.key()
        
        if key == Qt.Key_Escape:
            self.accept()
        elif key == Qt.Key_Space:
            if not self.game_over:
                self.togglePause()
        elif not self.game_paused and not self.game_over:
            if key == Qt.Key_Up and self.direction != (0, 1):
                self.next_direction = (0, -1)
            elif key == Qt.Key_Down and self.direction != (0, -1):
                self.next_direction = (0, 1)
            elif key == Qt.Key_Left and self.direction != (1, 0):
                self.next_direction = (-1, 0)
            elif key == Qt.Key_Right and self.direction != (-1, 0):
                self.next_direction = (1, 0)
    
    def showEvent(self, event):
        """窗口显示时获取焦点"""
        super(SnakeGame, self).showEvent(event)
        self.setFocus()
