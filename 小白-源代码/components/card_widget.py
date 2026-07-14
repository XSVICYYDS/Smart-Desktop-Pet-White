"""
卡片组件 - 用于创建卡片式布局，支持阴影、边框、悬停效果
"""

from PyQt5.QtWidgets import QWidget, QVBoxLayout, QFrame
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QPainter, QColor, QPalette


class CardWidget(QFrame):
    """
    卡片组件，提供统一的视觉样式
    """
    clicked = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.setFrameShape(QFrame.StyledPanel)
        self.setMinimumSize(44, 44)  # 确保可点击区域 ≥44x44
        
        self._hovered = False
        self._has_clickable = False
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        self.setStyleSheet("""
            CardWidget {
                background-color: #FFFFFF;
                border: 1px solid #E0E0E0;
                border-radius: 8px;
                padding: 16px;
            }
            CardWidget:hover {
                border: 1px solid #FF69B4;
                background-color: #FFF5F8;
            }
        """)
        
        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(20, 20, 20, 20)
        self.layout.setSpacing(16)
    
    def set_content_widget(self, widget):
        """设置卡片内容"""
        self.layout.addWidget(widget)
    
    def set_clickable(self, clickable: bool):
        """设置是否可点击"""
        self._has_clickable = clickable
        if clickable:
            self.setCursor(Qt.PointingHandCursor)
    
    def mousePressEvent(self, event):
        if self._has_clickable:
            self.clicked.emit()
        super().mousePressEvent(event)
    
    def enterEvent(self, event):
        self._hovered = True
        self.update()
        super().enterEvent(event)
    
    def leaveEvent(self, event):
        self._hovered = False
        self.update()
        super().leaveEvent(event)
