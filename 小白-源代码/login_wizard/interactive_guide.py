"""
交互式引导教程
"""

from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QLabel, 
                             QPushButton, QFrame)
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QFont


class InteractiveGuide(QFrame):
    """
    交互式引导组件
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.setWindowFlags(Qt.Tool | Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        self.current_step = 0
        self.guide_steps = [
            ("欢迎使用小白！", "这是您的智能桌面宠物。"),
            ("点击宠物可以交互", "试试点击小白看看会发生什么！"),
            ("右键打开菜单", "右键点击可以打开功能菜单。"),
            ("配置个性化设置", "可以在设置中调整小白的行为。"),
            ("完成！", "开始体验吧！")
        ]
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        self.setFixedSize(350, 180)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)
        
        self.setStyleSheet("""
            InteractiveGuide {
                background-color: white;
                border: 2px solid #FF69B4;
                border-radius: 12px;
            }
        """)
        
        # 标题
        self.title_label = QLabel()
        self.title_label.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        self.title_label.setStyleSheet("color: #FF69B4;")
        layout.addWidget(self.title_label)
        
        # 内容
        self.content_label = QLabel()
        self.content_label.setFont(QFont("Microsoft YaHei", 14))
        self.content_label.setWordWrap(True)
        self.content_label.setStyleSheet("color: #333333;")
        layout.addWidget(self.content_label)
        
        # 按钮
        btn_layout = QHBoxLayout()
        
        self.skip_btn = QPushButton("跳过")
        self.skip_btn.setMinimumSize(44, 44)
        self.skip_btn.setStyleSheet("""
            QPushButton {
                color: #999999;
                border: none;
                font-size: 14px;
            }
            QPushButton:hover {
                color: #666666;
            }
        """)
        self.skip_btn.clicked.connect(self.close)
        btn_layout.addWidget(self.skip_btn)
        
        btn_layout.addStretch()
        
        self.next_btn = QPushButton("下一步")
        self.next_btn.setMinimumSize(44, 44)
        self.next_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 20px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #FF85C2;
            }
        """)
        self.next_btn.clicked.connect(self._next_step)
        btn_layout.addWidget(self.next_btn)
        
        layout.addLayout(btn_layout)
        
        self._update_step()
    
    def _update_step(self):
        """更新引导步骤"""
        if self.current_step < len(self.guide_steps):
            title, content = self.guide_steps[self.current_step]
            self.title_label.setText(title)
            self.content_label.setText(content)
            
            if self.current_step == len(self.guide_steps) - 1:
                self.next_btn.setText("完成")
            else:
                self.next_btn.setText("下一步")
    
    def _next_step(self):
        """下一步"""
        self.current_step += 1
        
        if self.current_step >= len(self.guide_steps):
            self.close()
        else:
            self._update_step()
