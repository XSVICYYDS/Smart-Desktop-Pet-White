"""
可拖拽组件 - 支持拖拽重排序
"""

from PyQt5.QtWidgets import QWidget, QVBoxLayout, QLabel
from PyQt5.QtCore import Qt, QMimeData
from PyQt5.QtGui import QPixmap, QMouseEvent, QDrag
from PyQt5.QtWidgets import QDragEnterEvent, QDropEvent


class DraggableWidget(QWidget):
    """
    可拖拽的组件
    """
    def __init__(self, text: str, item_id: str, parent=None):
        super().__init__(parent)
        self.item_id = item_id
        self.text = text
        
        self.setAcceptDrops(True)
        self.setMinimumSize(44, 44)
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        self.setStyleSheet("""
            DraggableWidget {
                background-color: #FFFFFF;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                padding: 12px;
            }
            DraggableWidget:hover {
                border: 1px solid #FF69B4;
            }
        """)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        
        label = QLabel(self.text)
        from PyQt5.QtGui import QFont
        label.setFont(QFont("Microsoft YaHei", 14))
        label.setAlignment(Qt.AlignCenter)
        layout.addWidget(label)
    
    def mouseMoveEvent(self, event: QMouseEvent):
        if event.buttons() == Qt.LeftButton:
            drag = QDrag(self)
            mime_data = QMimeData()
            mime_data.setText(self.item_id)
            drag.setMimeData(mime_data)
            drag.exec_(Qt.CopyAction | Qt.MoveAction)
    
    def dragEnterEvent(self, event: QDragEnterEvent):
        if event.mimeData().hasText():
            event.acceptProposedAction()
    
    def dropEvent(self, event: QDropEvent):
        event.acceptProposedAction()
