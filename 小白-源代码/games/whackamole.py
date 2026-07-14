import random
from PyQt5.QtWidgets import (QDialog, QLabel, QVBoxLayout, QHBoxLayout,
                             QPushButton, QMessageBox, QFrame)
from PyQt5.QtCore import Qt, QTimer, QRect, QPoint
from PyQt5.QtGui import QPainter, QColor, QFont, QBrush


class WhackAMoleCanvas(QFrame):
    """打地鼠游戏画布"""
    
    def __init__(self, parent=None):
        super(WhackAMoleCanvas, self).__init__(parent)
        self.setMinimumSize(480, 480)
        self.setStyleSheet("background-color: #8FBC8F; border: 2px solid #228B22; border-radius: 10px;")
        self.current_mole = -1
        self.hole_size = 120
        self.hole_spacing = 30
        self.setMouseTracking(True)
    
    def updateGameState(self, current_mole):
        """更新游戏状态"""
        self.current_mole = current_mole
        self.update()
    
    def paintEvent(self, event):
        """绘制游戏画面"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        for y in range(3):
            for x in range(3):
                px = x * (self.hole_size + self.hole_spacing) + self.hole_spacing
                py = y * (self.hole_size + self.hole_spacing) + self.hole_spacing
                
                # 绘制地洞
                painter.setBrush(QBrush(QColor(65, 105, 225)))
                painter.setPen(Qt.NoPen)
                painter.drawEllipse(px, py, self.hole_size, self.hole_size // 2)
        
        # 绘制地鼠
        if self.current_mole != -1:
            mole_y = self.current_mole // 3
            mole_x = self.current_mole % 3
            
            px = mole_x * (self.hole_size + self.hole_spacing) + self.hole_spacing + 20
            py = mole_y * (self.hole_size + self.hole_spacing) + self.hole_spacing
            
            # 身体
            painter.setBrush(QBrush(QColor(139, 69, 19)))
            painter.drawEllipse(px, py + 40, self.hole_size - 40, self.hole_size - 60)
            
            # 头
            painter.setBrush(QBrush(QColor(205, 133, 63)))
            painter.drawEllipse(px + 5, py, self.hole_size - 50, self.hole_size - 50)
            
            # 眼睛
            painter.setBrush(QBrush(QColor(255, 255, 255)))
            painter.drawEllipse(px + 20, py + 15, 10, 10)
            painter.drawEllipse(px + 50, py + 15, 10, 10)
            
            painter.setBrush(QBrush(QColor(0, 0, 0)))
            painter.drawEllipse(px + 23, py + 18, 5, 5)
            painter.drawEllipse(px + 53, py + 18, 5, 5)
            
            # 鼻子
            painter.setBrush(QBrush(QColor(255, 127, 80)))
            painter.drawEllipse(px + 35, py + 35, 10, 10)
            
            # 耳朵
            painter.setBrush(QBrush(QColor(139, 69, 19)))
            painter.drawEllipse(px + 5, py + 5, 15, 15)
            painter.drawEllipse(px + 60, py + 5, 15, 15)


class WhackAMole(QDialog):
    """打地鼠游戏"""
    
    def __init__(self, parent=None):
        super(WhackAMole, self).__init__(parent)
        self.setWindowTitle("打地鼠 - 小白")
        self.setFixedSize(500, 580)
        self.setStyleSheet("background-color: #F0F8FF;")
        self.setWindowModality(Qt.NonModal)
        
        self.hole_size = 120
        self.hole_spacing = 30
        
        self.initGame()
        self.initUI()
        self.setFocusPolicy(Qt.StrongFocus)
    
    def initGame(self):
        """初始化游戏状态"""
        self.score = 0
        self.time_left = 60
        self.game_over = False
        self.current_mole = -1
        self.mole_timer = QTimer()
        self.mole_timer.timeout.connect(self.moveMole)
        self.game_timer = QTimer()
        self.game_timer.timeout.connect(self.updateTime)
    
    def initUI(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        info_layout = QHBoxLayout()
        
        self.score_label = QLabel(f"分数: {self.score}")
        self.score_label.setStyleSheet("color: #2C3E50; font-size: 24px; font-weight: bold;")
        info_layout.addWidget(self.score_label)
        
        info_layout.addStretch()
        
        self.time_label = QLabel(f"时间: {self.time_left}s")
        self.time_label.setStyleSheet("color: #E74C3C; font-size: 24px; font-weight: bold;")
        info_layout.addWidget(self.time_label)
        
        info_layout.addStretch()
        
        self.start_button = QPushButton("开始游戏")
        self.start_button.setStyleSheet("""
            QPushButton {
                background-color: #27AE60; color: white; border: none; padding: 10px 20px;
                border-radius: 5px; font-size: 16px; font-weight: bold;
            }
        """)
        self.start_button.clicked.connect(self.startGame)
        info_layout.addWidget(self.start_button)
        
        layout.addLayout(info_layout)
        
        self.canvas = WhackAMoleCanvas()
        self.canvas.setFixedSize(480, 480)
        self.canvas.mousePressEvent = self.canvasMousePressEvent
        layout.addWidget(self.canvas)
        
        help_label = QLabel("点击地鼠得分！")
        help_label.setStyleSheet("color: #2C3E50; font-size: 16px;")
        help_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(help_label)
        
        self.setLayout(layout)
        self.updateCanvas()
    
    def startGame(self):
        """开始游戏"""
        if self.game_over:
            self.initGame()
            self.updateCanvas()
        
        self.game_over = False
        self.current_mole = -1
        self.mole_timer.start(800)
        self.game_timer.start(1000)
        self.start_button.setText("游戏中...")
        self.start_button.setEnabled(False)
        self.updateCanvas()
    
    def moveMole(self):
        """移动地鼠"""
        if self.game_over:
            return
        
        new_mole = random.randint(0, 8)
        while new_mole == self.current_mole:
            new_mole = random.randint(0, 8)
        
        self.current_mole = new_mole
        self.updateCanvas()
    
    def updateTime(self):
        """更新时间"""
        if self.game_over:
            return
        
        self.time_left -= 1
        self.time_label.setText(f"时间: {self.time_left}s")
        
        if self.time_left <= 0:
            self.endGame()
    
    def endGame(self):
        """游戏结束"""
        self.game_over = True
        self.mole_timer.stop()
        self.game_timer.stop()
        self.current_mole = -1
        self.start_button.setEnabled(True)
        self.start_button.setText("再来一局")
        self.updateCanvas()
        QMessageBox.information(self, "游戏结束", f"游戏结束！\n最终分数: {self.score}")
    
    def canvasMousePressEvent(self, event):
        """处理画布点击事件"""
        if self.game_over or self.current_mole == -1:
            return
        
        # 获取鼠标位置
        x = event.x()
        y = event.y()
        
        # 计算点击位置
        mole_row = self.current_mole // 3
        mole_col = self.current_mole % 3
        
        mole_x = mole_col * (self.hole_size + self.hole_spacing) + self.hole_spacing + 20
        mole_y = mole_row * (self.hole_size + self.hole_spacing) + self.hole_spacing
        
        # 检查是否点击了地鼠
        if (mole_x <= x <= mole_x + self.hole_size - 40 and
            mole_y <= y <= mole_y + self.hole_size - 40):
            self.score += 10
            self.score_label.setText(f"分数: {self.score}")
            self.current_mole = -1
            self.updateCanvas()
    
    def updateCanvas(self):
        """更新画布"""
        self.canvas.updateGameState(self.current_mole)
    
    def keyPressEvent(self, event):
        """处理键盘事件"""
        key = event.key()
        
        if key == Qt.Key_Escape:
            self.accept()
    
    def showEvent(self, event):
        super(WhackAMole, self).showEvent(event)
        self.setFocus()
