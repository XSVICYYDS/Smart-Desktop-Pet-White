"""
三步式配置引导
"""

from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QLineEdit, QFormLayout, QSpinBox,
                             QCheckBox, QWizard, QWizardPage)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont
from components import StepIndicator


class ConfigWizard(QWizard):
    """
    配置向导
    """
    def __init__(self, config, parent=None):
        super().__init__(parent)
        self.config = config
        
        self.setWindowTitle("系统配置向导")
        self.setFixedSize(600, 500)
        
        # 添加页面
        self.addPage(Step1Page(config))
        self.addPage(Step2Page(config))
        self.addPage(Step3Page(config))
        
        # 设置按钮样式
        self.setButtonText(QWizard.NextButton, "下一步")
        self.setButtonText(QWizard.BackButton, "上一步")
        self.setButtonText(QWizard.FinishButton, "完成")
        self.setButtonText(QWizard.CancelButton, "跳过")
        
        self.setStyleSheet("""
            QWizard {
                background-color: #F9F9F9;
            }
            QPushButton {
                min-height: 44px;
                padding: 8px 20px;
                border-radius: 6px;
                font-size: 14px;
            }
            QPushButton[text="下一步"], QPushButton[text="完成"] {
                background-color: #FF69B4;
                color: white;
                border: none;
            }
            QPushButton[text="下一步"]:hover, QPushButton[text="完成"]:hover {
                background-color: #FF85C2;
            }
            QPushButton[text="上一步"], QPushButton[text="跳过"] {
                background-color: #E0E0E0;
                color: #333;
                border: none;
            }
        """)


class Step1Page(QWizardPage):
    """
    第一步：基础信息设置
    """
    def __init__(self, config, parent=None):
        super().__init__(parent)
        self.config = config
        self.setTitle("第一步：基础信息设置")
        self.setSubTitle("请设置您的基本信息")
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QFormLayout(self)
        layout.setSpacing(16)
        
        # 用户名
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
        layout.addRow("用户名:", self.username_edit)
        
        # 邮箱
        self.email_edit = QLineEdit()
        self.email_edit.setPlaceholderText("请输入邮箱 (可选)")
        self.email_edit.setMinimumHeight(44)
        self.email_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        layout.addRow("邮箱:", self.email_edit)
        
        # 简介
        self.bio_edit = QLineEdit()
        self.bio_edit.setPlaceholderText("请输入个人简介 (可选)")
        self.bio_edit.setMinimumHeight(44)
        self.bio_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        layout.addRow("简介:", self.bio_edit)


class Step2Page(QWizardPage):
    """
    第二步：核心功能配置
    """
    def __init__(self, config, parent=None):
        super().__init__(parent)
        self.config = config
        self.setTitle("第二步：核心功能配置")
        self.setSubTitle("设置宠物的基本行为")
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QFormLayout(self)
        layout.setSpacing(16)
        
        # 宠物大小
        size_layout = QHBoxLayout()
        
        self.width_spin = QSpinBox()
        self.width_spin.setRange(100, 500)
        self.width_spin.setValue(self.config.get("pet_size.width", 200))
        size_layout.addWidget(self.width_spin)
        
        size_layout.addWidget(QLabel("x"))
        
        self.height_spin = QSpinBox()
        self.height_spin.setRange(100, 500)
        self.height_spin.setValue(self.config.get("pet_size.height", 200))
        size_layout.addWidget(self.height_spin)
        
        layout.addRow("宠物大小:", size_layout)
        
        # 无聊时间
        self.bored_spin = QSpinBox()
        self.bored_spin.setRange(1, 360)
        self.bored_spin.setValue(int(self.config.get("behavior_frequency.bored_time", 3600000) / 60000))
        self.bored_spin.setSuffix(" 分钟")
        layout.addRow("无聊时间:", self.bored_spin)
        
        # 小时提醒
        self.hour_alert_check = QCheckBox("启用小时提醒")
        self.hour_alert_check.setChecked(self.config.get("behavior_frequency.hour_alert", True))
        layout.addRow("", self.hour_alert_check)


class Step3Page(QWizardPage):
    """
    第三步：个性化偏好
    """
    def __init__(self, config, parent=None):
        super().__init__(parent)
        self.config = config
        self.setTitle("第三步：个性化偏好")
        self.setSubTitle("完成最后的设置")
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QVBoxLayout(self)
        
        info = QLabel("恭喜！您已完成主要配置。")
        info.setFont(QFont("Microsoft YaHei", 14))
        info.setStyleSheet("color: #333;")
        layout.addWidget(info)
        
        finish_label = QLabel("点击完成按钮开始使用小白！")
        finish_label.setStyleSheet("color: #666;")
        layout.addWidget(finish_label)
        
        layout.addStretch()
