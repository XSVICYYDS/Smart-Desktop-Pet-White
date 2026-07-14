from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel, 
                             QSlider, QSpinBox, QCheckBox, QPushButton, 
                             QGroupBox, QFormLayout, QApplication, QMessageBox,
                             QTabWidget, QWidget)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont
from system_integration import SystemIntegration
from feature_list_component import FeatureSelectionList
from my_center import MyCenterComponent
from login_wizard import LoginWizardDialog

class ConfigDialog(QDialog):
    """配置对话框
    
    用于显示和修改应用配置的对话框
    """
    def __init__(self, config, base_dir, parent=None):
        """初始化配置对话框
        
        Args:
            config: 配置对象
            base_dir: 应用基础目录
            parent: 父窗口对象
        """
        super(ConfigDialog, self).__init__(parent)
        self.setWindowTitle("宠物配置")
        # 允许调整大小，设置最小和最大尺寸
        self.setMinimumSize(1350, 1000)
        self.setMaximumSize(3840, 2160)  # 最大4K分辨率
        self.is_fullscreen = False
        self.config = config
        self.base_dir = base_dir
        self.initUI()
    
    def initUI(self):
        """初始化 UI
        
        创建配置对话框的界面元素
        """
        main_layout = QVBoxLayout(self)
        
        tabs = QTabWidget()
        tabs.setStyleSheet("""
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
        
        basic_tab = self.createBasicSettingsTab()
        features_tab = self.createFeaturesTab()
        my_center_tab = self.createMyCenterTab()
        login_tab = self.createLoginWizardTab()
        
        tabs.addTab(basic_tab, "基础设置")
        tabs.addTab(features_tab, "功能选择")
        tabs.addTab(my_center_tab, "我的")
        tabs.addTab(login_tab, "登录/设置")
        
        main_layout.addWidget(tabs)
        
        # 安装事件过滤器以捕获键盘事件
        self.installEventFilter(self)
    
    def eventFilter(self, obj, event):
        """事件过滤器，用于捕获键盘快捷键"""
        if event.type() == event.KeyPress:
            if event.key() == Qt.Key_F11:
                self.toggleFullscreen()
                return True
        return super().eventFilter(obj, event)
    
    def createBasicSettingsTab(self):
        """创建基础设置标签页
        
        Returns:
            QWidget: 基础设置标签页组件
        """
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(15)
        
        # 宠物大小设置
        size_group = QGroupBox("宠物大小")
        size_layout = QFormLayout()
        
        self.width_spin = QSpinBox()
        self.width_spin.setRange(100, 500)
        self.width_spin.setValue(self.config.get("pet_size.width"))
        size_layout.addRow("宽度:", self.width_spin)
        
        self.height_spin = QSpinBox()
        self.height_spin.setRange(100, 500)
        self.height_spin.setValue(self.config.get("pet_size.height"))
        size_layout.addRow("高度:", self.height_spin)
        
        size_group.setLayout(size_layout)
        layout.addWidget(size_group)
        
        # 行为频率设置
        behavior_group = QGroupBox("行为频率")
        behavior_layout = QFormLayout()
        
        self.bored_time_spin = QSpinBox()
        self.bored_time_spin.setRange(1, 360)
        self.bored_time_spin.setValue(int(self.config.get("behavior_frequency.bored_time") / 60000))  # 转换为分钟
        behavior_layout.addRow("无聊时间(分钟):", self.bored_time_spin)
        
        self.working_interval_spin = QSpinBox()
        self.working_interval_spin.setRange(1, 60)
        self.working_interval_spin.setValue(int(self.config.get("behavior_frequency.working_interval") / 60000))  # 转换为分钟
        behavior_layout.addRow("工作间隔(分钟):", self.working_interval_spin)
        
        self.hour_alert_check = QCheckBox("启用小时提醒")
        self.hour_alert_check.setChecked(self.config.get("behavior_frequency.hour_alert"))
        behavior_layout.addRow(self.hour_alert_check)
        
        behavior_group.setLayout(behavior_layout)
        layout.addWidget(behavior_group)
        
        # 外观设置
        appearance_group = QGroupBox("外观")
        appearance_layout = QFormLayout()
        
        self.stats_bar_check = QCheckBox("显示状态栏")
        self.stats_bar_check.setChecked(self.config.get("appearance.show_stats_bar"))
        appearance_layout.addRow(self.stats_bar_check)
        
        self.opacity_slider = QSlider(Qt.Horizontal)
        self.opacity_slider.setRange(10, 100)
        self.opacity_slider.setValue(int(self.config.get("appearance.window_opacity") * 100))
        opacity = int(self.config.get('appearance.window_opacity') * 100)
        self.opacity_label = QLabel(f"透明度: {opacity}%")
        self.opacity_slider.valueChanged.connect(lambda value: self.opacity_label.setText(f"透明度: {value}%"))
        appearance_layout.addRow("透明度:", self.opacity_slider)
        appearance_layout.addRow(self.opacity_label)
        
        appearance_group.setLayout(appearance_layout)
        layout.addWidget(appearance_group)
        
        # 菜单设置
        menu_group = QGroupBox("菜单设置")
        menu_layout = QFormLayout()
        
        self.menu_count_spin = QSpinBox()
        self.menu_count_spin.setRange(3, 5)
        self.menu_count_spin.setValue(self.config.getMenuMaxDisplayCount())
        self.menu_count_spin.valueChanged.connect(self.validateMenuCount)
        menu_layout.addRow("菜单显示数量(3-5):", self.menu_count_spin)
        
        self.menu_status_label = QLabel("")
        self.menu_status_label.setStyleSheet("color: #666;")
        menu_layout.addRow(self.menu_status_label)
        
        self.reset_menu_button = QPushButton("恢复默认")
        self.reset_menu_button.clicked.connect(self.resetMenuConfig)
        menu_layout.addRow(self.reset_menu_button)
        
        menu_group.setLayout(menu_layout)
        layout.addWidget(menu_group)
        
        # 系统设置
        system_group = QGroupBox("系统设置")
        system_layout = QFormLayout()
        
        self.auto_start_check = QCheckBox("开机自动启动小白")
        self.auto_start_check.setChecked(self.config.isAutoStartEnabled())
        system_layout.addRow(self.auto_start_check)
        
        system_group.setLayout(system_layout)
        layout.addWidget(system_group)
        
        # 全屏设置
        fullscreen_group = QGroupBox("窗口设置")
        fullscreen_layout = QHBoxLayout()
        
        self.fullscreen_button = QPushButton("全屏模式")
        self.fullscreen_button.setCheckable(True)
        self.fullscreen_button.clicked.connect(self.toggleFullscreen)
        self.fullscreen_button.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 5px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #FF1493;
            }
            QPushButton:pressed {
                background-color: #C71585;
            }
            QPushButton:checked {
                background-color: #C71585;
            }
        """)
        fullscreen_layout.addWidget(self.fullscreen_button)
        fullscreen_layout.addStretch()
        
        fullscreen_group.setLayout(fullscreen_layout)
        layout.addWidget(fullscreen_group)
        
        # 按钮布局
        button_layout = QHBoxLayout()
        self.ok_button = QPushButton("确定")
        self.ok_button.clicked.connect(self.saveConfig)
        self.cancel_button = QPushButton("取消")
        self.cancel_button.clicked.connect(self.reject)
        button_layout.addStretch()
        button_layout.addWidget(self.ok_button)
        button_layout.addWidget(self.cancel_button)
        layout.addLayout(button_layout)
        
        layout.addStretch()
        
        return widget
    
    def createFeaturesTab(self):
        """创建功能选择标签页
        
        Returns:
            QWidget: 功能选择标签页组件
        """
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(10, 10, 10, 10)
        
        info_label = QLabel("💡 提示: 点击功能项可选择或取消选择,使用智能推荐可以让系统根据您的使用习惯自动选择功能")
        info_label.setFont(QFont("Microsoft YaHei", 9))
        info_label.setStyleSheet("""
            color: #666;
            background-color: #f0f8ff;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #e0e0e0;
        """)
        layout.addWidget(info_label)
        
        self.feature_list = FeatureSelectionList(self.base_dir, self.config)
        layout.addWidget(self.feature_list)
        
        return widget
    
    def saveConfig(self):
        """保存配置
        
        将用户修改的配置保存到配置对象中
        """
        # 保存宠物大小
        self.config.set("pet_size.width", self.width_spin.value())
        self.config.set("pet_size.height", self.height_spin.value())
        
        # 保存行为频率
        self.config.set("behavior_frequency.bored_time", self.bored_time_spin.value() * 60000)  # 转换为毫秒
        self.config.set("behavior_frequency.working_interval", self.working_interval_spin.value() * 60000)  # 转换为毫秒
        self.config.set("behavior_frequency.hour_alert", self.hour_alert_check.isChecked())
        
        # 保存外观设置
        self.config.set("appearance.show_stats_bar", self.stats_bar_check.isChecked())
        self.config.set("appearance.window_opacity", self.opacity_slider.value() / 100)
        
        # 保存菜单设置
        self.config.setMenuMaxDisplayCount(self.menu_count_spin.value())
        
        # 保存系统设置
        auto_start_enabled = self.auto_start_check.isChecked()
        self.config.setAutoStart(auto_start_enabled)
        system_integration = SystemIntegration()
        system_integration.setAutoStart(auto_start_enabled)
        
        self.accept()
    
    def toggleFullscreen(self):
        """切换全屏模式"""
        if self.is_fullscreen:
            # 退出全屏
            self.showNormal()
            self.fullscreen_button.setText("全屏模式")
            self.fullscreen_button.setChecked(False)
        else:
            # 进入全屏
            self.showFullScreen()
            self.fullscreen_button.setText("退出全屏")
            self.fullscreen_button.setChecked(True)
        self.is_fullscreen = not self.is_fullscreen
    
    def validateMenuCount(self):
        """验证菜单显示数量
        
        实时验证用户输入的菜单显示数量是否有效
        """
        value = self.menu_count_spin.value()
        if value < 3 or value > 5:
            self.menu_status_label.setText("⚠️ 数量必须在3-5之间")
            self.menu_status_label.setStyleSheet("color: #ff0000;")
        else:
            self.menu_status_label.setText(f"✓ 当前设置: 显示 {value} 个项目")
            self.menu_status_label.setStyleSheet("color: #00aa00;")
    
    def resetMenuConfig(self):
        """重置菜单配置为默认值"""
        reply = QMessageBox.question(
            self, 
            "确认重置", 
            "确定要将菜单配置重置为默认值吗？",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            self.config.resetMenuConfig()
            self.menu_count_spin.setValue(3)
            self.menu_status_label.setText("✓ 已重置为默认值(3个项目)")
            self.menu_status_label.setStyleSheet("color: #00aa00;")
    
    def createMyCenterTab(self):
        """创建"我的"标签页
        
        Returns:
            QWidget: "我的"标签页组件
        """
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)
        
        my_center = MyCenterComponent(self.config)
        layout.addWidget(my_center)
        
        return widget
    
    def createLoginWizardTab(self):
        """创建登录/设置标签页
        
        Returns:
            QWidget: 登录/设置标签页组件
        """
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(10, 10, 10, 10)
        
        info_label = QLabel("🔐 登录/配置向导")
        info_label.setFont(QFont("Microsoft YaHei", 14, QFont.Bold))
        info_label.setStyleSheet("color: #333;")
        layout.addWidget(info_label)
        
        desc_label = QLabel("此模块提供用户登录、配置向导和快捷入口管理功能。")
        desc_label.setFont(QFont("Microsoft YaHei", 10))
        desc_label.setStyleSheet("color: #666;")
        layout.addWidget(desc_label)
        
        layout.addStretch()
        
        return widget
