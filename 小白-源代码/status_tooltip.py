from PyQt5.QtWidgets import QToolTip, QLabel
from PyQt5.QtCore import Qt

class StatusTooltip:
    """状态提示类
    
    负责显示宠物状态的详细说明和提示
    """
    def __init__(self, parent):
        """初始化状态提示
        
        Args:
            parent: 父窗口对象
        """
        self.parent = parent
        self.initTooltips()
    
    def initTooltips(self):
        """初始化工具提示
        
        为状态栏添加工具提示
        """
        # 为快乐值图标添加工具提示
        if hasattr(self.parent.ui, 'happiness_icon'):
            self.parent.ui.happiness_icon.setToolTip("快乐值：表示小白的快乐程度\n\n" +
                                                "- 0-20: 不开心\n" +
                                                "- 21-60: 一般\n" +
                                                "- 61-100: 开心\n\n" +
                                                "通过互动可以增加快乐值")
        
        # 为能量值图标添加工具提示
        if hasattr(self.parent.ui, 'energy_label'):
            self.parent.ui.energy_label.setToolTip("能量值：表示小白的能量程度\n\n" +
                                               "- 0-20: 疲惫\n" +
                                               "- 21-60: 一般\n" +
                                               "- 61-100: 精力充沛\n\n" +
                                               "通过充电和休息可以增加能量值")
    
    def showStatusMessage(self, message, duration=3000):
        """显示状态消息
        
        Args:
            message: 状态消息
            duration: 显示时间（毫秒）
        """
        # 创建临时标签显示状态消息
        if not hasattr(self, 'status_label'):
            self.status_label = QLabel(self.parent)
            self.status_label.setWindowFlags(Qt.ToolTip | Qt.FramelessWindowHint)
            self.status_label.setStyleSheet("""
                background-color: rgba(0, 0, 0, 200);
                color: white;
                border-radius: 5px;
                padding: 8px;
                font-size: 12px;
            """)
        
        self.status_label.setText(message)
        self.status_label.adjustSize()
        
        # 计算位置，显示在宠物窗口的顶部
        pet_pos = self.parent.pos()
        pet_width = self.parent.width()
        label_width = self.status_label.width()
        x = pet_pos.x() + (pet_width - label_width) // 2
        y = pet_pos.y() - 30
        
        self.status_label.move(x, y)
        self.status_label.show()
        
        # 设置定时器，自动隐藏
        from PyQt5.QtCore import QTimer
        if hasattr(self, 'status_timer'):
            self.status_timer.stop()
        self.status_timer = QTimer(self.parent)
        self.status_timer.setSingleShot(True)
        self.status_timer.timeout.connect(self.status_label.hide)
        self.status_timer.start(duration)
    
    def updateStatusTips(self):
        """更新状态提示
        
        根据宠物的当前状态更新提示信息
        """
        happiness = self.parent.ui.happiness_bar.value()
        energy = self.parent.ui.energy_bar.value()
        
        # 根据快乐值和能量值显示不同的提示
        if happiness <= 20 and energy <= 20:
            self.showStatusMessage("小白又饿又不开心，需要你的关心！")
        elif happiness <= 20:
            self.showStatusMessage("小白不开心，快来陪它玩！")
        elif energy <= 20:
            self.showStatusMessage("小白好累，需要休息！")
        elif happiness >= 80 and energy >= 80:
            self.showStatusMessage("小白现在很开心，精力充沛！")
        elif happiness >= 80:
            self.showStatusMessage("小白很开心！")
        elif energy >= 80:
            self.showStatusMessage("小白精力充沛！")
