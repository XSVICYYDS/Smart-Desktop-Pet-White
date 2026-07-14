"""
登录向导主对话框
"""

from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QTabWidget)
from PyQt5.QtCore import Qt
from .login_page import LoginPage
from .config_wizard import ConfigWizard
from .quick_access import QuickAccessWidget


class LoginWizardDialog(QDialog):
    """
    登录向导主对话框
    """
    def __init__(self, config, parent=None):
        super().__init__(parent)
        self.config = config
        
        self.setWindowTitle("登录/设置")
        self.setFixedSize(900, 700)
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QVBoxLayout(self)
        
        # 使用TabWidget
        self.tab_widget = QTabWidget()
        self.tab_widget.setStyleSheet("""
            QTabWidget::pane {
                border: 1px solid #e0e0e0;
                border-radius: 5px;
                padding: 10px;
            }
            QTabBar::tab {
                background: #f0f0f0;
                padding: 8px 20px;
                margin-right: 2px;
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
            }
            QTabBar::tab:selected {
                background: #FF69B4;
                color: white;
                font-weight: bold;
            }
            QTabBar::tab:hover:!selected {
                background: #e8e8e8;
            }
        """)
        
        # 登录标签
        self.tab_widget.addTab(LoginPage(), "登录")
        
        # 配置向导标签
        config_container = QWidget()
        config_layout = QVBoxLayout(config_container)
        self.config_wizard = ConfigWizard(self.config)
        config_layout.addWidget(self.config_wizard)
        self.tab_widget.addTab(config_container, "配置向导")
        
        # 快捷入口标签
        self.tab_widget.addTab(QuickAccessWidget(self.config), "快捷入口")
        
        layout.addWidget(self.tab_widget)
