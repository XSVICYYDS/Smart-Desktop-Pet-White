"""
Toast提示组件 - 3-5秒自动消失的通知提示
"""

from PyQt5.QtWidgets import QLabel, QWidget, QHBoxLayout, QVBoxLayout
from PyQt5.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve
from PyQt5.QtGui import QFont, QColor


class ToastNotification(QWidget):
    """
    Toast 提示组件
    """
    def __init__(self, message: str, parent=None):
        super().__init__(parent)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        self.message = message
        self.duration = 3000  # 默认3秒
        
        self.init_ui()
        self.setup_animation()
    
    def init_ui(self):
        """初始化UI"""
        self.setFixedWidth(400)
        self.setMinimumHeight(60)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 内容容器
        container = QLabel(self)
        container.setStyleSheet("""
            QLabel {
                background-color: #333333;
                color: #FFFFFF;
                border-radius: 8px;
                padding: 16px 24px;
            }
        """)
        
        content_layout = QHBoxLayout(container)
        content_layout.setContentsMargins(16, 16, 16, 16)
        
        # 消息文本
        msg_label = QLabel(self.message)
        msg_label.setFont(QFont("Microsoft YaHei", 14))
        msg_label.setStyleSheet("color: #FFFFFF;")
        msg_label.setWordWrap(True)
        content_layout.addWidget(msg_label)
        
        layout.addWidget(container)
    
    def setup_animation(self):
        """设置动画"""
        # 淡入淡出动画
        self.animation = QPropertyAnimation(self, b"windowOpacity")
        self.animation.setDuration(300)
        self.animation.setStartValue(0.0)
        self.animation.setEndValue(1.0)
        self.animation.setEasingCurve(QEasingCurve.InOutQuad)
    
    def show(self):
        """显示Toast"""
        super().show()
        self.animation.start()
        
        # 定时关闭
        QTimer.singleShot(self.duration, self.close)
    
    def set_duration(self, milliseconds: int):
        """设置显示时长（毫秒）"""
        self.duration = milliseconds


class ToastManager:
    """
    Toast管理器，用于在父窗口中显示Toast
    """
    @staticmethod
    def show_info(parent, message: str):
        """显示信息提示"""
        toast = ToastNotification(message, parent)
        toast.show()
    
    @staticmethod
    def show_success(parent, message: str):
        """显示成功提示"""
        toast = ToastNotification("✓ " + message, parent)
        toast.show()
    
    @staticmethod
    def show_error(parent, message: str):
        """显示错误提示"""
        toast = ToastNotification("✗ " + message, parent)
        toast.show()
