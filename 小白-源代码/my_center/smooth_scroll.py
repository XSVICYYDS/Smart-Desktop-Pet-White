"""
自定义平滑滚动区域
"""

from PyQt5.QtWidgets import QScrollArea
from PyQt5.QtCore import Qt, QPropertyAnimation, QEasingCurve, pyqtProperty, QAbstractAnimation


class SmoothScrollArea(QScrollArea):
    """
    平滑滚动区域，支持平滑滚动动画
    """
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.scroll_animation = QPropertyAnimation(self.verticalScrollBar(), b"value")
        self.scroll_animation.setEasingCurve(QEasingCurve.OutCubic)
        self.scroll_animation.setDuration(300)  # 300ms动画时间
        self.target_scroll_value = 0
    
    def wheelEvent(self, event):
        """
        重写滚轮事件，实现平滑滚动
        """
        # 获取当前滚动值
        current_value = self.verticalScrollBar().value()
        
        # 计算目标滚动值
        scroll_delta = event.angleDelta().y()
        step_size = self.verticalScrollBar().singleStep() * 5  # 每次滚动5步
        self.target_scroll_value = current_value - (scroll_delta // 120) * step_size
        
        # 限制滚动范围
        min_value = self.verticalScrollBar().minimum()
        max_value = self.verticalScrollBar().maximum()
        self.target_scroll_value = max(min_value, min(max_value, self.target_scroll_value))
        
        # 停止当前动画
        if self.scroll_animation.state() == QAbstractAnimation.Running:
            self.scroll_animation.stop()
        
        # 设置动画目标并开始
        self.scroll_animation.setStartValue(current_value)
        self.scroll_animation.setEndValue(self.target_scroll_value)
        self.scroll_animation.start()
        
        event.accept()
