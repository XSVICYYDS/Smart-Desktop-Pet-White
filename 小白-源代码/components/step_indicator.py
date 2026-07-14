"""
步骤指示器 - 显示进度条和数字标签
"""

from PyQt5.QtWidgets import QWidget, QHBoxLayout, QVBoxLayout, QLabel, QFrame
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont, QColor, QPainter


class StepIndicator(QWidget):
    """
    步骤指示器组件
    """
    step_changed = pyqtSignal(int)

    def __init__(self, total_steps: int, parent=None):
        super().__init__(parent)
        self.total_steps = total_steps
        self.current_step = 1
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        self.layout = QHBoxLayout(self)
        self.layout.setContentsMargins(20, 20, 20, 20)
        self.layout.setSpacing(16)
        
        self.step_labels = []
        
        for i in range(self.total_steps):
            step_widget = self._create_step_widget(i + 1)
            self.layout.addWidget(step_widget)
            self.step_labels.append(step_widget)
            
            if i < self.total_steps - 1:
                # 添加连接线
                line = QFrame()
                line.setFrameShape(QFrame.HLine)
                line.setStyleSheet("background-color: #E0E0E0;")
                line.setFixedWidth(40)
                self.layout.addWidget(line)
        
        self._update_step_status()
    
    def _create_step_widget(self, step_num: int):
        """创建单个步骤小部件"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)
        
        # 数字圆圈
        circle = QLabel(str(step_num))
        circle.setAlignment(Qt.AlignCenter)
        circle.setFixedSize(44, 44)
        circle.setFont(QFont("Microsoft YaHei", 14, QFont.Bold))
        circle.setObjectName("step_circle")
        layout.addWidget(circle)
        
        # 步骤名称
        label = QLabel(f"步骤{step_num}")
        label.setAlignment(Qt.AlignCenter)
        label.setFont(QFont("Microsoft YaHei", 12))
        label.setStyleSheet("color: #666666;")
        label.setObjectName("step_label")
        layout.addWidget(label)
        
        return widget
    
    def set_step_name(self, step: int, name: str):
        """设置步骤名称"""
        if 1 <= step <= self.total_steps:
            label = self.step_labels[step - 1].findChild(QLabel, "step_label")
            if label:
                label.setText(name)
    
    def set_current_step(self, step: int):
        """设置当前步骤"""
        if 1 <= step <= self.total_steps:
            self.current_step = step
            self._update_step_status()
            self.step_changed.emit(step)
    
    def _update_step_status(self):
        """更新步骤状态显示"""
        for i in range(self.total_steps):
            step_widget = self.step_labels[i]
            circle = step_widget.findChild(QLabel, "step_circle")
            label = step_widget.findChild(QLabel, "step_label")
            
            if i + 1 < self.current_step:
                # 已完成
                circle.setStyleSheet("""
                    QLabel {
                        background-color: #FF69B4;
                        color: #FFFFFF;
                        border-radius: 22px;
                        border: 2px solid #FF69B4;
                    }
                """)
                circle.setText("✓")
                label.setStyleSheet("color: #333333; font-weight: bold;")
            elif i + 1 == self.current_step:
                # 当前步骤
                circle.setStyleSheet("""
                    QLabel {
                        background-color: #FF69B4;
                        color: #FFFFFF;
                        border-radius: 22px;
                        border: 2px solid #FF69B4;
                    }
                """)
                circle.setText(str(i + 1))
                label.setStyleSheet("color: #FF69B4; font-weight: bold;")
            else:
                # 未完成
                circle.setStyleSheet("""
                    QLabel {
                        background-color: #FFFFFF;
                        color: #999999;
                        border-radius: 22px;
                        border: 2px solid #E0E0E0;
                    }
                """)
                circle.setText(str(i + 1))
                label.setStyleSheet("color: #999999;")
