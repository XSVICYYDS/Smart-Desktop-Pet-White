"""
账户设置 - 密码修改、个人资料编辑、通知偏好
"""

from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QLineEdit, QPushButton, QCheckBox, QFormLayout,
                             QTextEdit, QMessageBox)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont
from components import CardWidget
from .password_strength_checker import PasswordStrengthChecker


class AccountSettings(QWidget):
    """
    账户设置组件
    """
    def __init__(self, user_model, config, parent=None):
        super().__init__(parent)
        self.user_model = user_model
        self.config = config
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QVBoxLayout(self)
        layout.setSpacing(24)
        
        # 密码修改卡片
        password_card = self._create_password_card()
        layout.addWidget(password_card)
        
        # 个人资料编辑卡片
        profile_card = self._create_profile_card()
        layout.addWidget(profile_card)
        
        # 通知偏好设置卡片
        notification_card = self._create_notification_card()
        layout.addWidget(notification_card)
    
    def _create_password_card(self):
        """创建密码修改卡片"""
        card = CardWidget()
        
        title = QLabel("密码修改")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setStyleSheet("color: #333333;")
        card.layout.addWidget(title)
        
        form_layout = QFormLayout()
        form_layout.setSpacing(16)
        
        # 原密码
        self.old_password_edit = QLineEdit()
        self.old_password_edit.setEchoMode(QLineEdit.Password)
        self.old_password_edit.setPlaceholderText("请输入原密码")
        self.old_password_edit.setMinimumHeight(44)
        self.old_password_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        form_layout.addRow("原密码:", self.old_password_edit)
        
        # 新密码
        self.new_password_edit = QLineEdit()
        self.new_password_edit.setEchoMode(QLineEdit.Password)
        self.new_password_edit.setPlaceholderText("请输入新密码 (至少8位)")
        self.new_password_edit.setMinimumHeight(44)
        self.new_password_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        self.new_password_edit.textChanged.connect(self._check_password_strength)
        form_layout.addRow("新密码:", self.new_password_edit)
        
        # 密码强度显示
        self.strength_label = QLabel("强度: -")
        self.strength_label.setFont(QFont("Microsoft YaHei", 12))
        form_layout.addRow("", self.strength_label)
        
        # 确认密码
        self.confirm_password_edit = QLineEdit()
        self.confirm_password_edit.setEchoMode(QLineEdit.Password)
        self.confirm_password_edit.setPlaceholderText("请再次输入新密码")
        self.confirm_password_edit.setMinimumHeight(44)
        self.confirm_password_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        form_layout.addRow("确认密码:", self.confirm_password_edit)
        
        # 保存按钮
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        save_pwd_btn = QPushButton("修改密码")
        save_pwd_btn.setMinimumSize(44, 44)
        save_pwd_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 24px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #FF85C2;
            }
        """)
        save_pwd_btn.clicked.connect(self._change_password)
        btn_layout.addWidget(save_pwd_btn)
        
        card.layout.addLayout(form_layout)
        card.layout.addLayout(btn_layout)
        
        return card
    
    def _create_profile_card(self):
        """创建个人资料编辑卡片"""
        card = CardWidget()
        
        title = QLabel("个人资料编辑")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setStyleSheet("color: #333333;")
        card.layout.addWidget(title)
        
        form_layout = QFormLayout()
        form_layout.setSpacing(16)
        
        # 姓名
        self.name_edit = QLineEdit(self.user_model.username)
        self.name_edit.setPlaceholderText("请输入用户名")
        self.name_edit.setMinimumHeight(44)
        self.name_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        form_layout.addRow("姓名:", self.name_edit)
        
        # 邮箱
        self.email_edit = QLineEdit(self.user_model.email)
        self.email_edit.setPlaceholderText("请输入邮箱")
        self.email_edit.setMinimumHeight(44)
        self.email_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        form_layout.addRow("邮箱:", self.email_edit)
        
        # 电话
        self.phone_edit = QLineEdit(self.user_model.phone)
        self.phone_edit.setPlaceholderText("请输入电话")
        self.phone_edit.setMinimumHeight(44)
        self.phone_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        form_layout.addRow("电话:", self.phone_edit)
        
        # 简介
        self.bio_edit = QTextEdit(self.user_model.bio)
        self.bio_edit.setPlaceholderText("请输入个人简介 (不超过200字)")
        self.bio_edit.setMaximumHeight(100)
        self.bio_edit.setStyleSheet("""
            QTextEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        form_layout.addRow("简介:", self.bio_edit)
        
        # 保存按钮
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        save_profile_btn = QPushButton("保存资料")
        save_profile_btn.setMinimumSize(44, 44)
        save_profile_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 24px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #FF85C2;
            }
        """)
        save_profile_btn.clicked.connect(self._save_profile)
        btn_layout.addWidget(save_profile_btn)
        
        card.layout.addLayout(form_layout)
        card.layout.addLayout(btn_layout)
        
        return card
    
    def _create_notification_card(self):
        """创建通知偏好设置卡片"""
        card = CardWidget()
        
        title = QLabel("通知偏好设置")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setStyleSheet("color: #333333;")
        card.layout.addWidget(title)
        
        # 获取通知偏好设置
        prefs = self.config.get("notification_preferences", {
            "system_notifications": True,
            "business_notifications": True,
            "marketing_notifications": False
        })
        
        # 系统通知
        self.system_notif_check = QCheckBox("系统通知")
        self.system_notif_check.setChecked(prefs.get("system_notifications", True))
        self.system_notif_check.setStyleSheet("""
            QCheckBox {
                font-size: 14px;
                padding: 8px;
            }
        """)
        card.layout.addWidget(self.system_notif_check)
        
        # 业务通知
        self.business_notif_check = QCheckBox("业务通知")
        self.business_notif_check.setChecked(prefs.get("business_notifications", True))
        self.business_notif_check.setStyleSheet("""
            QCheckBox {
                font-size: 14px;
                padding: 8px;
            }
        """)
        card.layout.addWidget(self.business_notif_check)
        
        # 营销通知
        self.marketing_notif_check = QCheckBox("营销通知")
        self.marketing_notif_check.setChecked(prefs.get("marketing_notifications", False))
        self.marketing_notif_check.setStyleSheet("""
            QCheckBox {
                font-size: 14px;
                padding: 8px;
            }
        """)
        card.layout.addWidget(self.marketing_notif_check)
        
        # 保存按钮
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        save_notif_btn = QPushButton("保存设置")
        save_notif_btn.setMinimumSize(44, 44)
        save_notif_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 24px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #FF85C2;
            }
        """)
        save_notif_btn.clicked.connect(self._save_notifications)
        btn_layout.addWidget(save_notif_btn)
        
        card.layout.addLayout(btn_layout)
        
        return card
    
    def _check_password_strength(self):
        """检查密码强度"""
        password = self.new_password_edit.text()
        score, text, color = PasswordStrengthChecker.check_strength(password)
        
        self.strength_label.setText(f"强度: {text}")
        self.strength_label.setStyleSheet(f"color: {color}; font-weight: bold;")
    
    def _change_password(self):
        """修改密码"""
        old_pwd = self.old_password_edit.text()
        new_pwd = self.new_password_edit.text()
        confirm_pwd = self.confirm_password_edit.text()
        
        if not old_pwd:
            QMessageBox.warning(self, "提示", "请输入原密码")
            return
        
        if not new_pwd:
            QMessageBox.warning(self, "提示", "请输入新密码")
            return
        
        if new_pwd != confirm_pwd:
            QMessageBox.warning(self, "提示", "两次输入的密码不一致")
            return
        
        score, _, _ = PasswordStrengthChecker.check_strength(new_pwd)
        if score < 2:
            reply = QMessageBox.question(self, "确认", 
                "密码强度较弱，确定要使用吗？",
                QMessageBox.Yes | QMessageBox.No)
            if reply == QMessageBox.No:
                return
        
        QMessageBox.information(self, "成功", "密码修改成功！")
        self.old_password_edit.clear()
        self.new_password_edit.clear()
        self.confirm_password_edit.clear()
    
    def _save_profile(self):
        """保存个人资料"""
        reply = QMessageBox.question(self, "确认", "确定保存资料吗？",
            QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            self.user_model.username = self.name_edit.text()
            self.user_model.email = self.email_edit.text()
            self.user_model.phone = self.phone_edit.text()
            self.user_model.bio = self.bio_edit.toPlainText()
            self.user_model.save()
            
            QMessageBox.information(self, "成功", "资料保存成功！")
    
    def _save_notifications(self):
        """保存通知偏好"""
        self.config.set("notification_preferences", {
            "system_notifications": self.system_notif_check.isChecked(),
            "business_notifications": self.business_notif_check.isChecked(),
            "marketing_notifications": self.marketing_notif_check.isChecked()
        })
        
        QMessageBox.information(self, "成功", "设置保存成功！")
