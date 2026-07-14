import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QPushButton, QLabel
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont
from config import Config
from feature_list_component import FeatureSelectionList

class TestWindow(QMainWindow):
    """测试窗口"""
    def __init__(self):
        super().__init__()
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.setWindowTitle("功能选择列表测试")
        self.setFixedSize(800, 600)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        
        title = QLabel("✨ 小白功能选择组件测试")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setStyleSheet("color: #FF69B4; padding: 20px;")
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)
        
        info = QLabel("功能说明:\n• 点击功能项可选择或取消选择\n• 支持全选和取消全选\n• 智能推荐根据使用习惯自动选择\n• 选择状态自动保存")
        info.setFont(QFont("Microsoft YaHei", 10))
        info.setStyleSheet("""
            background-color: #f0f8ff;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            color: #333;
        """)
        layout.addWidget(info)
        
        self.config = Config(self.base_dir)
        self.feature_list = FeatureSelectionList(self.base_dir, self.config)
        layout.addWidget(self.feature_list)
        
        button_layout = QVBoxLayout()
        self.test_button = QPushButton("测试选择状态")
        self.test_button.setFixedHeight(40)
        self.test_button.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        self.test_button.clicked.connect(self.testSelections)
        button_layout.addWidget(self.test_button)
        
        layout.addLayout(button_layout)
    
    def testSelections(self):
        """测试选择状态"""
        selections = self.feature_list.getSelections()
        selected_count = sum(1 for v in selections.values() if v)
        
        from PyQt5.QtWidgets import QMessageBox
        QMessageBox.information(
            self,
            "选择状态",
            f"当前选择: {selected_count}/{len(selections)} 个功能\n\n" +
            f"已选择的功能:\n" +
            "\n".join([f"✓ {k}" for k, v in selections.items() if v][:10]) +
            (f"\n... 还有 {selected_count - 10} 个" if selected_count > 10 else "")
        )

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = TestWindow()
    window.show()
    sys.exit(app.exec_())
