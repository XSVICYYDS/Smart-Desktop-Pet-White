"""
我的个人中心主组件
"""

from PyQt5.QtWidgets import QWidget, QVBoxLayout
from PyQt5.QtCore import Qt
from .user_profile_widget import UserProfileWidget
from .account_settings import AccountSettings
from .usage_history import UsageHistory
from .smooth_scroll import SmoothScrollArea
from data_models import UserModel, UsageLogger


class MyCenterComponent(QWidget):
    """
    我的个人中心主组件
    """
    def __init__(self, config, parent=None):
        super().__init__(parent)
        self.config = config
        
        # 初始化数据模型
        self.user_model = UserModel(config)
        self.usage_logger = UsageLogger(config)
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(24)
        
        # 平滑滚动区域
        scroll = SmoothScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        
        # 设置滚动条样式
        scroll.setStyleSheet("""
            QScrollArea {
                border: none;
                background-color: transparent;
            }
            
            QScrollBar:vertical {
                background-color: #f0f0f0;
                width: 12px;
                border-radius: 6px;
                margin: 0px;
            }
            
            QScrollBar::handle:vertical {
                background-color: #FF69B4;
                min-height: 40px;
                border-radius: 6px;
            }
            
            QScrollBar::handle:vertical:hover {
                background-color: #FF1493;
            }
            
            QScrollBar::handle:vertical:pressed {
                background-color: #C71585;
            }
            
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                height: 0px;
            }
            
            QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {
                background: none;
            }
        """)
        
        content_widget = QWidget()
        content_layout = QVBoxLayout(content_widget)
        content_layout.setSpacing(24)
        
        # 用户信息展示
        self.profile_widget = UserProfileWidget(self.user_model)
        content_layout.addWidget(self.profile_widget)
        
        # 账户设置
        self.account_settings = AccountSettings(self.user_model, self.config)
        content_layout.addWidget(self.account_settings)
        
        # 使用记录
        self.usage_history = UsageHistory(self.usage_logger)
        content_layout.addWidget(self.usage_history)
        
        content_layout.addStretch()
        scroll.setWidget(content_widget)
        main_layout.addWidget(scroll)
    
    def refresh(self):
        """刷新界面"""
        self.profile_widget.refresh()
