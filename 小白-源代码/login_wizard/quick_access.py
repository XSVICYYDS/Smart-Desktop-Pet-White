"""
快捷入口区域
"""

from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QScrollArea)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont
from components import CardWidget
from data_models import ShortcutConfig


class QuickAccessWidget(QWidget):
    """
    快捷入口组件
    """
    def __init__(self, config, parent=None):
        super().__init__(parent)
        self.config = config
        self.shortcut_config = ShortcutConfig(config)
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        card = CardWidget()
        
        title_layout = QHBoxLayout()
        
        title = QLabel("快捷入口")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setStyleSheet("color: #333333;")
        title_layout.addWidget(title)
        
        title_layout.addStretch()
        
        edit_btn = QPushButton("编辑")
        edit_btn.setMinimumSize(44, 44)
        edit_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                color: #FF69B4;
                border: 1px solid #FF69B4;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #FFF0F5;
            }
        """)
        title_layout.addWidget(edit_btn)
        
        card.layout.addLayout(title_layout)
        
        # 快捷入口按钮区
        self.buttons_layout = QHBoxLayout()
        self.buttons_layout.setSpacing(12)
        self._refresh_buttons()
        
        card.layout.addLayout(self.buttons_layout)
        card.layout.addStretch()
        
        layout.addWidget(card)
    
    def _refresh_buttons(self):
        """刷新快捷入口按钮"""
        # 清除现有按钮
        while self.buttons_layout.count():
            child = self.buttons_layout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()
        
        shortcuts = self.shortcut_config.get_visible_shortcuts()
        
        for shortcut in shortcuts:
            btn = QPushButton(shortcut["name"])
            btn.setMinimumSize(100, 60)
            btn.setStyleSheet("""
                QPushButton {
                    background-color: #F9F9F9;
                    border: 1px solid #E0E0E0;
                    border-radius: 8px;
                    padding: 8px;
                    font-size: 14px;
                }
                QPushButton:hover {
                    background-color: #FFF0F5;
                    border-color: #FF69B4;
                }
            """)
            self.buttons_layout.addWidget(btn)
        
        self.buttons_layout.addStretch()
