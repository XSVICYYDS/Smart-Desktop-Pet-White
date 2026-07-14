from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel, 
                             QTextEdit, QPushButton, QTabWidget)
from PyQt5.QtCore import Qt
import webbrowser

class HelpDialog(QDialog):
    """帮助对话框
    
    显示应用的帮助信息和使用说明
    """
    def __init__(self, parent=None):
        """初始化帮助对话框
        
        Args:
            parent: 父窗口对象
        """
        super(HelpDialog, self).__init__(parent)
        self.setWindowTitle("帮助信息")
        self.setFixedSize(600, 400)
        self.initUI()
    
    def initUI(self):
        """初始化 UI
        
        创建帮助对话框的界面元素
        """
        main_layout = QVBoxLayout(self)
        
        # 创建选项卡
        tab_widget = QTabWidget()
        
        # 使用说明选项卡
        usage_tab = QTextEdit()
        usage_tab.setReadOnly(True)
        usage_tab.setPlainText("◉ 使用说明\n\n" +
                              "■ 基本操作\n" +
                              "- 左键拖动：移动小白的位置\n" +
                              "- 右键点击：打开操作菜单\n" +
                              "- 双击小白：小白自由落体到屏幕底部（会减少能量值）\n" +
                              "\n" +
                              "■ 互动功能\n" +
                              "- 贴贴：增加小白的快乐值，减少能量值\n" +
                              "- 拍一拍：短暂的互动，增加小白的快乐值\n" +
                              "- 锻炼：增加少量快乐值，减少较多能量值\n" +
                              "- 充电：同时增加快乐值和能量值\n" +
                              "- 投喂小白：如果小白不饱，增加快乐值和能量值\n" +
                              "- 吧唧：增加快乐值，不影响能量值\n" +
                              "- 鸡毛丸子：增加快乐值，减少能量值\n" +
                              "- 随机出现：小白随机出现在屏幕的某个位置\n" +
                              "- 遛小鸡毛：增加快乐值，减少能量值\n" +
                              "\n" +
                              "■ 状态栏\n" +
                              "- 快乐值：表示小白的快乐程度（整合了原饱食度）\n" +
                              "- 能量值：表示小白的能量程度（整合了原好感度）\n" +
                              "- 可以通过右键菜单中的「显示/隐藏状态栏」选项来显示或隐藏状态栏\n" +
                              "\n" +
                              "■ 系统托盘\n" +
                              "- 退出：退出应用\n" +
                              "- 显示：显示小白\n" +
                              "- 隐藏：隐藏小白\n" +
                              "- 显示/隐藏状态栏：显示或隐藏状态栏\n")
        tab_widget.addTab(usage_tab, "使用说明")
        
        # 常见问题选项卡
        faq_tab = QTextEdit()
        faq_tab.setReadOnly(True)
        faq_tab.setPlainText("◉ 常见问题\n\n" +
                            "■ 小白为什么会死亡？\n" +
                            "- 当小白的快乐值和能量值都为 0 时，小白会死亡\n" +
                            "- 死亡后，小白会在 30 分钟后自动复活\n" +
                            "\n" +
                            "■ 如何让小白保持快乐？\n" +
                            "- 经常与小白互动，如贴贴、拍一拍等\n" +
                            "- 定期给小白充电和投喂\n" +
                            "\n" +
                            "■ 如何修改小白的大小和行为？\n" +
                            "- 通过右键菜单中的「配置」选项打开配置对话框\n" +
                            "- 在配置对话框中可以调整小白的大小、行为频率和外观\n" +
                            "\n" +
                            "■ 小白会在什么时间工作？\n" +
                            "- 周一至周五的 10:00-18:00 是小白的工作时间\n" +
                            "- 工作时间内，小白会显示工作动画\n" +
                            "\n" +
                            "■ 如何关闭小时提醒？\n" +
                            "- 通过配置对话框中的「行为频率」选项卡，取消勾选「启用小时提醒」\n")
        tab_widget.addTab(faq_tab, "常见问题")
        
        # 关于选项卡
        about_tab = QTextEdit()
        about_tab.setReadOnly(True)
        about_tab.setPlainText("◉ 关于小白\n\n" +
                              "小白是一个可爱的桌面宠物，它会陪伴你度过每一天。\n\n" +
                              "■ 版本信息\n" +
                              "- 版本：0.4.28\n" +
                              "- 开发语言：Python\n" +
                              "- GUI 框架：PyQt5\n\n" +
                              "■ 功能特点\n" +
                              "- 可爱的动画效果\n" +
                              "- 丰富的互动功能\n" +
                              "- 智能的行为系统\n" +
                              "- 个性化的配置选项\n" +
                              "- 系统通知集成\n" +
                              "- 双击自由落体\n\n" +
                              "■ 资源声明\n" +
                              "- 使用了来自 Bing 图片搜索的动图\n" +
                              "- 链接：https://cn.bing.com/images/search?q=%e7%ba%bf%e6%9d%a1%e5%b0%8f%e7%8b%97%e5%8a%a8%e5%9b%be&form=HDRSC2&first=1\n\n" +
                              "■ 开发者\n" +
                              "- 开发者:XSVICYYDS\n" +
                              "- 联系方式：XSVICYYDS@outlook.com\n")
        tab_widget.addTab(about_tab, "关于")
        
        main_layout.addWidget(tab_widget)
        
        # 按钮布局
        button_layout = QHBoxLayout()
        self.open_link_button = QPushButton("打开链接")
        self.open_link_button.clicked.connect(self.openLink)
        self.ok_button = QPushButton("确定")
        self.ok_button.clicked.connect(self.accept)
        button_layout.addStretch()
        button_layout.addWidget(self.open_link_button)
        button_layout.addWidget(self.ok_button)
        main_layout.addLayout(button_layout)
    
    def openLink(self):
        """打开资源链接
        
        打开 Bing 图片搜索链接，查看使用的动图来源
        """
        url = "https://cn.bing.com/images/search?q=%e7%ba%bf%e6%9d%a1%e5%b0%8f%e7%8b%97%e5%8a%a8%e5%9b%be&form=HDRSC2&first=1"
        webbrowser.open(url)
