from PyQt5.QtWidgets import (QWizard, QWizardPage, QVBoxLayout, QHBoxLayout, 
                             QLabel, QRadioButton, QGroupBox, QPushButton,
                             QLineEdit, QComboBox, QSpinBox, QCheckBox)
from PyQt5.QtCore import Qt
from system_integration import SystemIntegration

class SetupWizard(QWizard):
    """初始设置向导
    
    首次启动时的设置向导，引导用户进行基本配置
    """
    def __init__(self, config, parent=None):
        """初始化设置向导
        
        Args:
            config: 配置对象
            parent: 父窗口对象
        """
        super(SetupWizard, self).__init__(parent)
        self.setWindowTitle("小白设置向导")
        self.setFixedSize(800, 700)
        self.config = config
        self.addPage(WelcomePage())
        self.addPage(PetSizePage(config))
        self.addPage(BehaviorPage(config))
        self.addPage(AppearancePage(config))
        self.addPage(FinishPage())
        
        self.currentIdChanged.connect(self.onCurrentIdChanged)
    
    def onCurrentIdChanged(self, id):
        """当前页面变化时的处理
        
        Args:
            id: 当前页面的 ID
        """
        pass

class WelcomePage(QWizardPage):
    """欢迎页面
    
    设置向导的欢迎页面
    """
    def __init__(self, parent=None):
        """初始化欢迎页面
        
        Args:
            parent: 父窗口对象
        """
        super(WelcomePage, self).__init__(parent)
        self.setTitle("欢迎使用小白")
        self.setSubTitle("让我们为你设置一个可爱的桌面宠物吧！")
        
        layout = QVBoxLayout()
        self.label = QLabel("小白是一个可爱的桌面宠物，它会陪伴你度过每一天。\n\n在这个设置向导中，你可以配置小白的大小、行为和外观。\n\n点击「下一步」开始设置。")
        self.label.setWordWrap(True)
        layout.addWidget(self.label)
        self.setLayout(layout)

class PetSizePage(QWizardPage):
    """宠物大小设置页面
    
    用于设置宠物的大小
    """
    def __init__(self, config, parent=None):
        """初始化宠物大小设置页面
        
        Args:
            config: 配置对象
            parent: 父窗口对象
        """
        super(PetSizePage, self).__init__(parent)
        self.setTitle("宠物大小")
        self.setSubTitle("选择小白的大小")
        self.config = config
        
        layout = QVBoxLayout()
        
        size_group = QGroupBox("选择大小")
        size_layout = QVBoxLayout()
        
        self.small_radio = QRadioButton("小 (150x150)")
        self.medium_radio = QRadioButton("中 (200x200)")
        self.large_radio = QRadioButton("大 (250x250)")
        
        # 默认选择中等大小
        self.medium_radio.setChecked(True)
        
        size_layout.addWidget(self.small_radio)
        size_layout.addWidget(self.medium_radio)
        size_layout.addWidget(self.large_radio)
        size_group.setLayout(size_layout)
        
        layout.addWidget(size_group)
        self.setLayout(layout)
    
    def validatePage(self):
        """验证页面
        
        保存用户选择的宠物大小
        
        Returns:
            bool: 是否通过验证
        """
        if self.small_radio.isChecked():
            self.config.set("pet_size.width", 150)
            self.config.set("pet_size.height", 150)
        elif self.medium_radio.isChecked():
            self.config.set("pet_size.width", 200)
            self.config.set("pet_size.height", 200)
        elif self.large_radio.isChecked():
            self.config.set("pet_size.width", 250)
            self.config.set("pet_size.height", 250)
        return True

class BehaviorPage(QWizardPage):
    """行为设置页面
    
    用于设置宠物的行为频率
    """
    def __init__(self, config, parent=None):
        """初始化行为设置页面
        
        Args:
            config: 配置对象
            parent: 父窗口对象
        """
        super(BehaviorPage, self).__init__(parent)
        self.setTitle("行为设置")
        self.setSubTitle("设置小白的行为频率")
        self.config = config
        
        layout = QVBoxLayout()
        
        # 无聊时间设置
        self.bored_time_label = QLabel("无聊时间（分钟）：")
        self.bored_time_spin = QSpinBox()
        self.bored_time_spin.setRange(1, 360)
        self.bored_time_spin.setValue(60)  # 默认 60 分钟
        
        bored_time_layout = QHBoxLayout()
        bored_time_layout.addWidget(self.bored_time_label)
        bored_time_layout.addWidget(self.bored_time_spin)
        
        # 工作间隔设置
        self.working_interval_label = QLabel("工作间隔（分钟）：")
        self.working_interval_spin = QSpinBox()
        self.working_interval_spin.setRange(1, 60)
        self.working_interval_spin.setValue(3)  # 默认 3 分钟
        
        working_interval_layout = QHBoxLayout()
        working_interval_layout.addWidget(self.working_interval_label)
        working_interval_layout.addWidget(self.working_interval_spin)
        
        # 小时提醒设置
        self.hour_alert_check = QCheckBox("启用小时提醒")
        self.hour_alert_check.setChecked(True)  # 默认启用
        
        layout.addLayout(bored_time_layout)
        layout.addLayout(working_interval_layout)
        layout.addWidget(self.hour_alert_check)
        self.setLayout(layout)
    
    def validatePage(self):
        """验证页面
        
        保存用户选择的行为设置
        
        Returns:
            bool: 是否通过验证
        """
        self.config.set("behavior_frequency.bored_time", self.bored_time_spin.value() * 60000)  # 转换为毫秒
        self.config.set("behavior_frequency.working_interval", self.working_interval_spin.value() * 60000)  # 转换为毫秒
        self.config.set("behavior_frequency.hour_alert", self.hour_alert_check.isChecked())
        return True

class AppearancePage(QWizardPage):
    """外观设置页面
    
    用于设置宠物的外观
    """
    def __init__(self, config, parent=None):
        """初始化外观设置页面
        
        Args:
            config: 配置对象
            parent: 父窗口对象
        """
        super(AppearancePage, self).__init__(parent)
        self.setTitle("外观设置")
        self.setSubTitle("设置小白的外观")
        self.config = config
        
        layout = QVBoxLayout()
        
        # 状态栏显示设置
        self.stats_bar_check = QCheckBox("显示状态栏")
        self.stats_bar_check.setChecked(True)  # 默认显示
        
        # 透明度设置
        self.opacity_label = QLabel("透明度：")
        self.opacity_spin = QSpinBox()
        self.opacity_spin.setRange(10, 100)
        self.opacity_spin.setValue(100)  # 默认 100% 不透明
        
        opacity_layout = QHBoxLayout()
        opacity_layout.addWidget(self.opacity_label)
        opacity_layout.addWidget(self.opacity_spin)
        
        layout.addWidget(self.stats_bar_check)
        layout.addLayout(opacity_layout)
        self.setLayout(layout)
    
    def validatePage(self):
        """验证页面
        
        保存用户选择的外观设置
        
        Returns:
            bool: 是否通过验证
        """
        self.config.set("appearance.show_stats_bar", self.stats_bar_check.isChecked())
        self.config.set("appearance.window_opacity", self.opacity_spin.value() / 100)
        return True

class FinishPage(QWizardPage):
    """完成页面
    
    设置向导的完成页面
    """
    def __init__(self, parent=None):
        """初始化完成页面
        
        Args:
            parent: 父窗口对象
        """
        super(FinishPage, self).__init__(parent)
        self.setTitle("设置完成")
        self.setSubTitle("小白已经准备好陪伴你了！")
        
        layout = QVBoxLayout()
        self.label = QLabel("设置已完成，点击「完成」按钮开始使用小白。\n\n你可以随时通过右键菜单中的「配置」选项修改这些设置。")
        self.label.setWordWrap(True)
        
        self.auto_start_check = QCheckBox("开机自动启动小白")
        self.auto_start_check.setChecked(False)
        
        layout.addWidget(self.label)
        layout.addWidget(self.auto_start_check)
        self.setLayout(layout)
    
    def initializePage(self):
        """初始化页面
        
        设置完成按钮的文本
        """
        self.wizard().setButtonText(QWizard.FinishButton, "完成")
    
    def validatePage(self):
        """验证页面
        
        保存用户选择的开机自启动设置
        
        Returns:
            bool: 是否通过验证
        """
        auto_start_enabled = self.auto_start_check.isChecked()
        system_integration = SystemIntegration()
        system_integration.setAutoStart(auto_start_enabled)
        return True
