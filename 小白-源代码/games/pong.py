import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QFrame)
from PyQt5.QtCore import Qt, QTimer, QRect
from PyQt5.QtGui import QPainter, QColor, QFont


class PongCanvas(QFrame):
    """乒乓球画布"""
    
    def __init__(self, parent=None):
        super(PongCanvas, self).__init__(parent)
        self.setMinimumSize(500, 350)
        self.setStyleSheet("background-color: #2C3E50;")
        
        # 游戏对象
        self.paddle_y = 150
        self.ball_x = 250
        self.ball_y = 175
        self.ball_dx = 4
        self.ball_dy = 4
        self.paddle_height = 70
        self.paddle_width = 10
        self.ball_size = 12
        self.score = 0
        self.game_over = False
        self.game_paused = True
    
    def updateState(self, paddle_y, ball_x, ball_y, ball_dx, ball_dy, score, game_over, game_paused):
        """更新状态"""
        self.paddle_y = paddle_y
        self.ball_x = ball_x
        self.ball_y = ball_y
        self.ball_dx = ball_dx
        self.ball_dy = ball_dy
        self.score = score
        self.game_over = game_over
        self.game_paused = game_paused
        self.update()
    
    def paintEvent(self, event):
        """绘制"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        width = self.width()
        height = self.height()
        
        # 绘制中线
        painter.setPen(QColor(52, 73, 94))
        painter.setBrush(Qt.NoBrush)
        for i in range(0, height, 30):
            painter.drawLine(width // 2, i, width // 2, i + 15)
        
        # 绘制AI paddle
        painter.setBrush(QColor(231, 76, 60))
        painter.setPen(Qt.NoPen)
        painter.drawRect(width - 20, self.paddle_y, self.paddle_width, self.paddle_height)
        
        # 绘制玩家paddle
        painter.setBrush(QColor(52, 152, 219))
        painter.drawRect(10, self.paddle_y, self.paddle_width, self.paddle_height)
        
        # 绘制球
        painter.setBrush(QColor(46, 204, 113))
        painter.drawEllipse(int(self.ball_x - self.ball_size // 2), 
                           int(self.ball_y - self.ball_size // 2), 
                           self.ball_size, self.ball_size)
        
        # 绘制暂停或游戏结束
        if self.game_paused and not self.game_over:
            painter.setPen(QColor(255, 255, 255))
            painter.setFont(QFont("Arial", 30, QFont.Bold))
            painter.drawText(QRect(0, 0, width, height), Qt.AlignCenter, "按空格开始")
        elif self.game_over:
            painter.setPen(QColor(231, 76, 60))
            painter.setFont(QFont("Arial", 24, QFont.Bold))
            painter.drawText(QRect(0, 0, width, height), Qt.AlignCenter, f"游戏结束\n分数: {self.score}")


class PongGame(QDialog):
    """乒乓球游戏"""
    
    def __init__(self, parent=None):
        super(PongGame, self).__init__(parent)
        self.setWindowTitle("单人乒乓球 - 小白")
        self.setStyleSheet("background-color: #2C3E50;")
        self.setWindowModality(Qt.NonModal)
        
        # 游戏参数
        self.canvas_width = 500
        self.canvas_height = 350
        self.paddle_y = 150
        self.paddle_height = 70
        self.paddle_speed = 8
        self.ball_x = 250
        self.ball_y = 175
        self.ball_dx = 4
        self.ball_dy = 4
        self.ball_size = 12
        self.score = 0
        self.game_over = False
        self.game_paused = True
        self.ai_speed = 3
        
        # 键盘状态
        self.keys_pressed = set()
        
        # 定时器
        self.timer = QTimer()
        self.timer.timeout.connect(self.updateGame)
        
        self.initUI()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        # 分数
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
        self.start_button.clicked.connect(self.toggleGame)
        info_layout.addWidget(self.start_button)
        
        layout.addLayout(info_layout)
        
        # 画布
        self.canvas = PongCanvas()
        self.canvas.setFixedSize(self.canvas_width, self.canvas_height)
        layout.addWidget(self.canvas)
        
        # 帮助
        help_label = QLabel("W/S或方向键: 移动  空格: 暂停/继续  ESC: 退出")
        help_label.setStyleSheet("color: #BDC3C7; font-size: 12px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
        self.updateCanvas()
    
    def toggleGame(self):
        """切换游戏状态"""
        if self.game_over:
            self.restartGame()
            return
        
        self.game_paused = not self.game_paused
        if self.game_paused:
            self.timer.stop()
            self.start_button.setText("继续")
        else:
            self.timer.start(16)  # ~60fps
            self.start_button.setText("暂停")
        self.updateCanvas()
    
    def restartGame(self):
        """重新开始"""
        self.paddle_y = 150
        self.ball_x = 250
        self.ball_y = 175
        self.ball_dx = 4 if random.random() > 0.5 else -4
        self.ball_dy = 4 if random.random() > 0.5 else -4
        self.score = 0
        self.game_over = False
        self.game_paused = True
        self.timer.stop()
        self.start_button.setText("开始")
        self.updateCanvas()
    
    def updateGame(self):
        """更新游戏"""
        if self.game_paused or self.game_over:
            return
        
        # 移动paddle
        if Qt.Key_Up in self.keys_pressed or Qt.Key_W in self.keys_pressed:
            self.paddle_y = max(0, self.paddle_y - self.paddle_speed)
        if Qt.Key_Down in self.keys_pressed or Qt.Key_S in self.keys_pressed:
            self.paddle_y = min(self.canvas_height - self.paddle_height, self.paddle_y + self.paddle_speed)
        
        # 移动球
        self.ball_x += self.ball_dx
        self.ball_y += self.ball_dy
        
        # 球撞上下墙
        if self.ball_y - self.ball_size // 2 <= 0 or self.ball_y + self.ball_size // 2 >= self.canvas_height:
            self.ball_dy = -self.ball_dy
        
        # 玩家paddle碰撞
        if (self.ball_x - self.ball_size // 2 <= 20 and
            self.paddle_y <= self.ball_y <= self.paddle_y + self.paddle_height):
            self.ball_dx = -self.ball_dx
            self.ball_x = 20 + self.ball_size // 2
            # 增加速度
            self.ball_dx *= 1.05
            self.ball_dy *= 1.05
            self.score += 1
        
        # AI paddle
        ai_target = self.ball_y - self.paddle_height // 2
        if ai_target > self.paddle_y + self.paddle_height // 2:
            self.paddle_y = min(self.canvas_height - self.paddle_height, self.paddle_y + self.ai_speed)
        elif ai_target < self.paddle_y + self.paddle_height // 2:
            self.paddle_y = max(0, self.paddle_y - self.ai_speed)
        
        # AI paddle碰撞（右侧）
        if (self.ball_x + self.ball_size // 2 >= self.canvas_width - 20 and
            self.paddle_y <= self.ball_y <= self.paddle_y + self.paddle_height):
            self.ball_dx = -self.ball_dx
            self.ball_x = self.canvas_width - 20 - self.ball_size // 2
        
        # 球出界
        if self.ball_x < 0:
            self.gameOver()
        elif self.ball_x > self.canvas_width:
            # 玩家得分，重置球
            self.score += 5
            self.ball_x = 250
            self.ball_y = 175
            self.ball_dx = -abs(self.ball_dx)
            self.ball_dy = 4 if random.random() > 0.5 else -4
        
        self.updateCanvas()
    
    def gameOver(self):
        """游戏结束"""
        self.game_over = True
        self.timer.stop()
        self.start_button.setText("重新开始")
        self.updateCanvas()
        QMessageBox.information(self, "游戏结束", f"最终分数: {self.score}")
    
    def updateCanvas(self):
        """更新画布"""
        self.score_label.setText(f"分数: {self.score}")
        self.canvas.updateState(self.paddle_y, self.ball_x, self.ball_y, 
                               self.ball_dx, self.ball_dy, self.score, 
                               self.game_over, self.game_paused)
    
    def keyPressEvent(self, event):
        """按键"""
        key = event.key()
        self.keys_pressed.add(key)
        
        if key == Qt.Key_Escape:
            self.accept()
        elif key == Qt.Key_Space:
            self.toggleGame()
    
    def keyReleaseEvent(self, event):
        """释放按键"""
        key = event.key()
        if key in self.keys_pressed:
            self.keys_pressed.remove(key)
    
    def showEvent(self, event):
        """显示"""
        super(PongGame, self).showEvent(event)
        self.setFocus()
    
    def closeEvent(self, event):
        """关闭"""
        self.timer.stop()
        event.accept()
