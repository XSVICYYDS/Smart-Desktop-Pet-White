import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QPushButton
from config import Config
from config_ui import ConfigDialog

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class TestConfigWindow(QMainWindow):
    """测试配置对话框"""
    def __init__(self):
        super().__init__()
        self.setWindowTitle("配置对话框测试")
        self.setFixedSize(400, 200)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        
        self.button = QPushButton("打开配置对话框")
        self.button.setFixedHeight(60)
        self.button.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #FF1493;
            }
        """)
        self.button.clicked.connect(self.openConfig)
        layout.addWidget(self.button)
        
        self.config = Config(BASE_DIR)
    
    def openConfig(self):
        """打开配置对话框"""
        try:
            dialog = ConfigDialog(self.config, BASE_DIR, self)
            dialog.exec_()
        except Exception as e:
            from PyQt5.QtWidgets import QMessageBox
            QMessageBox.warning(self, "错误", f"打开配置对话框错误: {e}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = TestConfigWindow()
    window.show()
    sys.exit(app.exec_())