"""
登录页面 - 用户身份验证
"""

from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QLineEdit, QPushButton, QCheckBox, QComboBox)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont, QIcon
from components import CardWidget


class LoginPage(QWidget):
    """
    登录页面组件
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        main_layout = QVBoxLayout(self)
        main_layout.setAlignment(Qt.AlignCenter)
        
        # 登录卡片
        login_card = CardWidget()
        login_card.setMinimumWidth(400)
        
        card_layout = QVBoxLayout()
        card_layout.setSpacing(20)
        
        # 标题
        title = QLabel("用户登录")
        title.setFont(QFont("Microsoft YaHei", 20, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("color: #333333;")
        card_layout.addWidget(title)
        
        # 用户名输入
        self.username_edit = QLineEdit()
        self.username_edit.setPlaceholderText("请输入用户名")
        self.username_edit.setMinimumHeight(44)
        self.username_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        card_layout.addWidget(self.username_edit)
        
        # 密码输入
        self.password_edit = QLineEdit()
        self.password_edit.setEchoMode(QLineEdit.Password)
        self.password_edit.setPlaceholderText("请输入密码")
        self.password_edit.setMinimumHeight(44)
        self.password_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        card_layout.addWidget(self.password_edit)
        
        # 记住密码选项
        remember_layout = QHBoxLayout()
        
        self.remember_check = QCheckBox("记住密码")
        self.remember_check.setStyleSheet("""
            QCheckBox {
                font-size: 14px;
            }
        """)
        remember_layout.addWidget(self.remember_check)
        
        self.duration_combo = QComboBox()
        self.duration_combo.addItems(["7天", "15天", "30天"])
        self.duration_combo.setMinimumHeight(44)
        self.duration_combo.setStyleSheet("""
            QComboBox {
                padding: 6px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        remember_layout.addWidget(self.duration_combo)
        
        remember_layout.addStretch()
        card_layout.addLayout(remember_layout)
        
        # 登录按钮
        self.login_btn = QPushButton("登录")
        self.login_btn.setMinimumHeight(44)
        self.login_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px;
                font-size: 16px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #FF85C2;
            }
        """)
        card_layout.addWidget(self.login_btn)
        
        # 分割线
        line = QWidget()
        line.setFixedHeight(1)
        line.setStyleSheet("background-color: #E0E0E0;")
        card_layout.addWidget(line)
        
        # 第三方登录
        third_party_label = QLabel("第三方登录")
        third_party_label.setAlignment(Qt.AlignCenter)
        third_party_label.setStyleSheet("color: #999999; font-size: 12px;")
        card_layout.addWidget(third_party_label)
        
        third_layout = QHBoxLayout()
        
        self.wechat_btn = QPushButton("微信")
        self.wechat_btn.setMinimumSize(120, 44)
        self.wechat_btn.setStyleSheet("""
            QPushButton {
                background-color: #07C160;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #06AD56;
            }
        """)
        third_layout.addWidget(self.wechat_btn)
        
        self.qq_btn = QPushButton("QQ")
        self.qq_btn.setMinimumSize(120, 44)
        self.qq_btn.setStyleSheet("""
            QPushButton {
                background-color: #12B7F5;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #0F99CC;
            }
        """)
        third_layout.addWidget(self.qq_btn)
        
        card_layout.addLayout(third_layout)
        
        # 忘记密码
        forgot_btn = QPushButton("忘记密码?")
        forgot_btn.setStyleSheet("""
            QPushButton {
                border: none;
                color: #FF69B4;
                font-size: 12px;
                padding: 4px;
            }
            QPushButton:hover {
                text-decoration: underline;
            }
        """)
        card_layout.addWidget(forgot_btn, alignment=Qt.AlignCenter)
        
        login_card.layout.addLayout(card_layout)
        main_layout.addWidget(login_card, alignment=Qt.AlignCenter)
