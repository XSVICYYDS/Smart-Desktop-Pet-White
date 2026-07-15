from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel,
                             QTextEdit, QPushButton, QTabWidget)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont
import webbrowser

from update_checker import check_update


class HelpDialog(QDialog):
    """帮助对话框

    显示应用的帮助信息和使用说明，采用粉色主题设计
    """

    def __init__(self, parent=None):
        """初始化帮助对话框

        Args:
            parent: 父窗口对象
        """
        super(HelpDialog, self).__init__(parent)
        self.setWindowTitle("帮助信息")
        self.setMinimumSize(800, 600)
        self.setStyleSheet(self._get_stylesheet())
        self.initUI()

    def _get_stylesheet(self):
        """获取粉色主题样式表"""
        return """
        QDialog {
            background-color: #FFF9F5;
        }
        QTabWidget::pane {
            border: 2px solid #FFB6C1;
            border-radius: 12px;
            background-color: white;
            padding: 10px;
        }
        QTabBar::tab {
            background-color: #FFE4E1;
            color: #666;
            border: 1px solid #FFB6C1;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
            padding: 10px 25px;
            margin-right: 4px;
            font-size: 13px;
            font-weight: bold;
        }
        QTabBar::tab:selected {
            background-color: #FF69B4;
            color: white;
            border-bottom: none;
        }
        QTabBar::tab:hover:!selected {
            background-color: #FFC0CB;
            color: #333;
        }
        QTextEdit {
            border: 1px solid #FFD1DC;
            border-radius: 10px;
            padding: 15px;
            background-color: white;
            font-size: 13px;
            line-height: 1.6;
            color: #333;
        }
        QPushButton {
            background-color: #FF69B4;
            color: white;
            border: none;
            border-radius: 20px;
            padding: 10px 25px;
            font-size: 13px;
            font-weight: bold;
        }
        QPushButton:hover {
            background-color: #FF1493;
        }
        QPushButton:pressed {
            background-color: #DB7093;
        }
        """

    def initUI(self):
        """初始化 UI

        创建帮助对话框的界面元素
        """
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(15)
        main_layout.setContentsMargins(20, 20, 20, 20)

        # 创建选项卡
        tab_widget = QTabWidget()

        # 使用说明选项卡
        usage_tab = QTextEdit()
        usage_tab.setReadOnly(True)
        usage_tab.setPlainText(
            "◉ 使用说明\n\n"
            "■ 基本操作\n"
            "- 左键拖动：移动小白的位置\n"
            "- 右键点击：打开操作菜单\n"
            "- 双击小白：小白自由落体到屏幕底部（会减少能量值）\n"
            "\n"
            "■ 互动功能\n"
            "- 贴贴：增加小白的快乐值，减少能量值\n"
            "- 拍一拍：短暂的互动，增加小白的快乐值\n"
            "- 锻炼：增加少量快乐值，减少较多能量值\n"
            "- 充电：同时增加快乐值和能量值\n"
            "- 投喂小白：如果小白不饱，增加快乐值和能量值\n"
            "- 吧唧：增加快乐值，不影响能量值\n"
            "- 鸡毛丸子：增加快乐值，减少能量值\n"
            "- 随机出现：小白随机出现在屏幕的某个位置\n"
            "- 遛小鸡毛：增加快乐值，减少能量值\n"
            "\n"
            "■ 状态栏\n"
            "- 快乐值：表示小白的快乐程度\n"
            "- 能量值：表示小白的能量程度\n"
            "- 可以通过右键菜单中的「显示/隐藏状态栏」选项来显示或隐藏状态栏\n"
            "\n"
            "■ 系统托盘\n"
            "- 退出：退出应用\n"
            "- 显示：显示小白\n"
            "- 隐藏：隐藏小白\n"
            "- 显示/隐藏状态栏：显示或隐藏状态栏\n"
            "\n"
            "■ 功能模块\n"
            "- AI工具箱：翻译、天气查询、名言、词典、笑话、文本分析\n"
            "- 桌面管理器：文件浏览、搜索、预览、系统控制\n"
            "- 文件格式转换：PDF、Word、图片等多格式互转\n"
            "- 智能画板：多种绘图模式、图层管理、AI OCR识别\n"
            "- 截屏工具：快速截图、编辑、保存\n"
            "- 休闲小游戏：羊了个羊、2048、俄罗斯方块等15款游戏\n"
            "- 系统工具：计算器、记事本、画图、磁盘清理、放大镜、便签、闹钟\n"
        )
        tab_widget.addTab(usage_tab, "📖 使用说明")

        # 常见问题选项卡
        faq_tab = QTextEdit()
        faq_tab.setReadOnly(True)
        faq_tab.setPlainText(
            "◉ 常见问题\n\n"
            "■ 小白为什么会死亡？\n"
            "- 当小白的快乐值和能量值都为 0 时，小白会死亡\n"
            "- 死亡后，小白会在 30 分钟后自动复活\n"
            "\n"
            "■ 如何让小白保持快乐？\n"
            "- 经常与小白互动，如贴贴、拍一拍等\n"
            "- 定期给小白充电和投喂\n"
            "\n"
            "■ 如何修改小白的大小和行为？\n"
            "- 通过右键菜单中的「配置」选项打开配置对话框\n"
            "- 在配置对话框中可以调整小白的大小、行为频率和外观\n"
            "\n"
            "■ 小白会在什么时间工作？\n"
            "- 周一至周五的 10:00-18:00 是小白的工作时间\n"
            "- 工作时间内，小白会显示工作动画\n"
            "\n"
            "■ 如何关闭小时提醒？\n"
            "- 通过配置对话框中的「行为频率」选项卡，取消勾选「启用小时提醒」\n"
            "\n"
            "■ 如何检查软件更新？\n"
            "- 右键菜单 → 帮助 → 检查更新\n"
            "- 或系统托盘菜单 → 检查更新\n"
            "- 软件会连接 GitHub 检查是否有新版本发布\n"
            "\n"
            "■ 游戏卡顿或无法启动怎么办？\n"
            "- 确保电脑有足够的内存和显卡资源\n"
            "- 关闭其他占用资源较多的程序\n"
            "- 如问题持续，请通过 GitHub Issues 反馈\n"
        )
        tab_widget.addTab(faq_tab, "❓ 常见问题")

        # 关于选项卡
        about_tab = QTextEdit()
        about_tab.setReadOnly(True)
        about_tab.setPlainText(
            "◉ 关于小白\n\n"
            "小白是一个可爱的桌面宠物，它会陪伴你度过每一天。\n\n"
            "■ 版本信息\n"
            "- 版本：0.4.43\n"
            "- 开发语言：Python\n"
            "- GUI 框架：PyQt5\n\n"
            "■ 功能特点\n"
            "- 26+ 种可爱动画效果\n"
            "- 9 种互动方式\n"
            "- 15 款休闲小游戏\n"
            "- 十余款实用工具\n"
            "- AI 智能助手\n"
            "- 智能的行为系统\n"
            "- 个性化的配置选项\n"
            "- 系统通知集成\n"
            "- 双击自由落体\n\n"
            "■ 资源声明\n"
            "- 使用了来自 Bing 图片搜索的线条小狗动图\n"
            "- 链接：https://cn.bing.com/images/search?q=%e7%ba%bf%e6%9d%a1%e5%b0%8f%e7%8b%97%e5%8a%a8%e5%9b%be\n\n"
            "■ 官方网站\n"
            "- https://xsvicyyds.github.io/Smart-Desktop-Pet-White/\n\n"
            "■ GitHub 仓库\n"
            "- https://github.com/XSVICYYDS/Smart-Desktop-Pet-White\n\n"
            "■ 开发者\n"
            "- 开发者：XSVICYYDS\n"
            "- 联系方式：XSVICYYDS@outlook.com\n"
        )
        tab_widget.addTab(about_tab, "ℹ️ 关于")

        main_layout.addWidget(tab_widget)

        # 按钮布局
        button_layout = QHBoxLayout()

        # 检查更新按钮
        self.update_btn = QPushButton("🔄 检查更新")
        self.update_btn.setToolTip("检查是否有新版本发布")
        self.update_btn.clicked.connect(self.onCheckUpdate)
        button_layout.addWidget(self.update_btn)

        button_layout.addStretch()

        # 打开官网按钮
        self.open_website_btn = QPushButton("🌐 官方网站")
        self.open_website_btn.setToolTip("打开小白官方网站")
        self.open_website_btn.clicked.connect(self.openWebsite)
        button_layout.addWidget(self.open_website_btn)

        # 打开GitHub按钮
        self.open_github_btn = QPushButton("🐙 GitHub")
        self.open_github_btn.setToolTip("打开 GitHub 仓库页面")
        self.open_github_btn.clicked.connect(self.openGithub)
        button_layout.addWidget(self.open_github_btn)

        button_layout.addStretch()

        self.ok_button = QPushButton("✅ 确定")
        self.ok_button.clicked.connect(self.accept)
        button_layout.addWidget(self.ok_button)

        main_layout.addLayout(button_layout)

    def onCheckUpdate(self):
        """点击检查更新按钮"""
        try:
            check_update(parent=self)
        except Exception as e:
            from PyQt5.QtWidgets import QMessageBox
            QMessageBox.warning(self, "错误", f"检查更新时发生错误: {e}")

    def openWebsite(self):
        """打开官方网站"""
        webbrowser.open("https://xsvicyyds.github.io/Smart-Desktop-Pet-White/")

    def openGithub(self):
        """打开 GitHub 仓库"""
        webbrowser.open("https://github.com/XSVICYYDS/Smart-Desktop-Pet-White")
