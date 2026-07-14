import os
import datetime
from PyQt5.QtGui import QIcon, QPixmap, QCursor
from PyQt5.QtWidgets import (QWidget, QSystemTrayIcon, QMenu, QAction, 
                             QLabel, QProgressBar, QVBoxLayout, QHBoxLayout,
                             QDialog, QDesktopWidget, QMessageBox)
from PyQt5.QtCore import Qt, QSize, QPoint, QTimer, QUrl
from PyQt5.QtGui import QDesktopServices

# 导入游戏模块
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from games import (
    SnakeGame, TetrisGame, Game2048, WhackAMole,
    MinesweeperGame, TicTacToeGame, SokobanGame, PongGame, TankBattleGame,
    GomokuGame, SudokuGame, LianlianGame, XiaoxiaoleGame, HuarongGame, SheepGame
)
from games.sheep import ModeSelectDialog as SheepModeSelectDialog

# 导入AI工具箱
from ai_toolbox_dialog import AIToolboxDialog

# 导入文件格式转换
from file_converter_dialog import FileConverterDialog

# 导入桌面管理器
from desktop_manager import DesktopManagerMainWindow, open_desktop_manager

# 导入智能画板
from smart_paintboard import IntelligentDrawingBoard

class ClockDialog(QDialog):
    """时钟对话框
    
    用于显示小时提醒的对话框
    """
    def __init__(self, message, parent=None):
        """初始化时钟对话框
        
        Args:
            message: 要显示的消息
            parent: 父窗口对象
        """
        super(ClockDialog, self).__init__(parent)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.Tool | Qt.WindowStaysOnTopHint | Qt.NoDropShadowWindowHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        layout = QVBoxLayout()
        self.message_label = QLabel(message)
        self.message_label.setStyleSheet("""
            background-color: rgba(255, 255, 255, 225);
            border: 2px solid #FF69B4;
            border-radius: 10px;
            padding: 10px;
            color: #333;
            font-size: 20px;
        """)
        layout.addWidget(self.message_label)
        self.setLayout(layout)
        self.timer = None
    
    def setAutoClose(self, milliseconds=9500):
        """设置自动关闭
        
        Args:
            milliseconds: 自动关闭的时间（毫秒）
        """
        from PyQt5.QtCore import QTimer
        self.timer = QTimer()
        self.timer.setSingleShot(True)
        self.timer.timeout.connect(self.close)
        self.timer.start(milliseconds)

class UIComponents:
    """UI 组件类
    
    负责创建和管理应用的 UI 组件
    """
    def __init__(self, parent, base_dir, config):
        """初始化 UI 组件
        
        Args:
            parent: 父窗口对象
            base_dir: 应用基础目录
            config: 配置对象
        """
        try:
            self.parent = parent
            self.base_dir = base_dir
            self.config = config
            self.stats_visible = True
            
            # 初始化托盘图标
            self.initTrayIcon()
            
            # 初始化宠物图像和状态栏
            self.initPetImage()
            
            # 初始化日期更新定时器
            self.initDateTimer()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"初始化 UI 组件错误: {e}")
    
    def initTrayIcon(self):
        """初始化托盘图标
        
        创建系统托盘图标和相关菜单
        """
        try:
            icons = os.path.join(self.base_dir, 'Image/MenuIcon.jpg')
            self.quit_action = QAction(u'退出', self.parent, triggered=self.parent.quit)
            self.showing = QAction(u'显示', self.parent, triggered=self.parent.showup)
            self.hideup = QAction(u'隐藏', self.parent, triggered=self.parent.hide)
            self.hidestats = QAction(u'显示/隐藏状态栏', self.parent, triggered=self.parent.hideStatsBar)
            self.config_action = QAction(u'配置', self.parent, triggered=self.parent.openConfigDialog)
            self.tray_icon_menu = QMenu(self.parent)
            self.tray_icon_menu.addAction(self.quit_action)
            self.tray_icon_menu.addAction(self.showing)
            self.tray_icon_menu.addAction(self.hideup)
            self.tray_icon_menu.addAction(self.hidestats)
            self.tray_icon_menu.addAction(self.config_action)
            self.tray_icon = QSystemTrayIcon(self.parent)
            self.tray_icon.setIcon(QIcon(icons))
            self.tray_icon.setContextMenu(self.tray_icon_menu)
            self.tray_icon.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"初始化托盘图标错误: {e}")
    
    def initPetImage(self):
        """初始化宠物图像和状态栏
        
        创建宠物图像显示区域和状态栏（快乐值和能量值）
        """
        try:
            self.main_layout = QVBoxLayout(self.parent)
            self.main_layout.setContentsMargins(0, 0, 0, 0)
            self.main_layout.setSpacing(0)
            
            # 创建快乐值布局
            self.happiness_layout = QHBoxLayout()
            self.happiness_layout.setContentsMargins(0, 0, 0, 0)
            self.happiness_layout.setSpacing(0)
            self.happiness_icon = QLabel()
            self.happiness_icon.setContentsMargins(0, 0, 0, 0)
            self.happiness_icon_pixmap = QPixmap(os.path.join(self.base_dir, "Image/Happiness.svg"))
            self.happiness_icon_pixmap = self.happiness_icon_pixmap.scaled(QSize(20, 20), Qt.KeepAspectRatio, Qt.SmoothTransformation)
            self.happiness_icon.setPixmap(self.happiness_icon_pixmap)
            self.happiness_layout.addWidget(self.happiness_icon, alignment=Qt.AlignCenter)
            self.happiness_bar = QProgressBar()
            self.happiness_bar.setRange(0, 100)
            self.happiness_bar.setValue(80)
            self.happiness_bar.setFixedHeight(12)
            self.happiness_bar.setFixedWidth(150)
            self.happiness_bar.setStyleSheet("""
                QProgressBar {
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    text-align: center;
                }
                QProgressBar::chunk {
                    background-color: #FF69B4;
                }
            """)
            self.happiness_layout.addWidget(self.happiness_bar, alignment=Qt.AlignCenter)

            # 创建能量值布局
            self.energy_layout = QHBoxLayout()
            self.energy_layout.setContentsMargins(0, 0, 0, 0)
            self.energy_layout.setSpacing(0)
            self.energy_label = QLabel()
            self.energy_label.setContentsMargins(0, 0, 0, 0)
            self.energy_icon_pixmap = QPixmap(os.path.join(self.base_dir, "Image/Energy.svg"))
            self.energy_icon_pixmap = self.energy_icon_pixmap.scaled(QSize(20, 20), Qt.KeepAspectRatio, Qt.SmoothTransformation)
            self.energy_label.setPixmap(self.energy_icon_pixmap)
            self.energy_layout.addWidget(self.energy_label, alignment=Qt.AlignCenter)
            self.energy_bar = QProgressBar()
            self.energy_bar.setRange(0, 100)
            self.energy_bar.setValue(80)
            self.energy_bar.setFixedHeight(12)
            self.energy_bar.setFixedWidth(150)
            self.energy_bar.setStyleSheet("""
                QProgressBar {
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    text-align: center;
                }
                QProgressBar::chunk {
                    background-color: #1E90FF;
                }
            """)
            self.energy_layout.addWidget(self.energy_bar, alignment=Qt.AlignCenter)
            
            # 创建宠物图像显示区域
            self.image = QLabel(self.parent)
            self.image.setContentsMargins(0, 0, 0, 0)
            
            # 创建日期显示标签
            self.date_label = QLabel()
            self.date_label.setAlignment(Qt.AlignCenter)
            self.date_label.setStyleSheet("""
                color: #333;
                font-size: 20px;
                font-weight: bold;
            """)
            # 更新日期显示
            self.updateDate()
            
            # 添加组件到主布局
            self.main_layout.addWidget(self.image)
            self.main_layout.addWidget(self.date_label)
            self.main_layout.addLayout(self.happiness_layout)
            self.main_layout.addLayout(self.energy_layout)
            
            # 设置窗口大小和位置
            self.parent.resize(200, 200)
            self.parent.randomPosition()
            self.parent.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"初始化宠物图像和状态栏错误: {e}")
    
    def createLimitedMenu(self, parent_menu, title, items_list, max_count):
        """创建带数量限制的菜单
        
        Args:
            parent_menu: 父菜单对象
            title: 菜单标题
            items_list: 菜单项列表，每个元素为 (文本, 回调函数) 元组
            max_count: 最大显示数量
        
        Returns:
            QMenu: 创建的菜单对象
        """
        menu = QMenu(title, parent_menu)
        
        # 添加前max_count个项目
        display_items = items_list[:max_count]
        for text, callback in display_items:
            menu.addAction(text, callback)
        
        # 如果有更多项目，添加"更多"子菜单
        if len(items_list) > max_count:
            menu.addSeparator()
            more_menu = QMenu("更多...", menu)
            for text, callback in items_list[max_count:]:
                more_menu.addAction(text, callback)
            menu.addMenu(more_menu)
        
        return menu
    
    def showMenu(self):
        """显示右键菜单
        
        创建并显示右键菜单，包含各种互动选项
        """
        try:
            menu = QMenu()
            max_count = self.config.getMenuMaxDisplayCount()
            
            # 互动功能菜单组
            interaction_items = [
                (u"贴贴", self.parent.stick),
                (u"拍一拍", self.parent.call),
                (u"锻炼", self.parent.exercise),
                (u"充电", self.parent.charge),
                (u"投喂小白", self.parent.cake),
                (u"吧唧", self.parent.baji),
                (u"鸡毛丸子", self.parent.baji2),
                (u"随机出现", self.parent.appear),
                (u"遛小鸡毛", self.parent.walkDog),
                (u"吃饭", self.parent.eating),
                (u"魔法", self.parent.megic),
                (u"骑自行车", self.parent.biking),
                (u"爱心", self.parent.loving),
                (u"新年快乐", self.parent.happynewyear),
                (u"跳跃", self.parent.jumping),
                (u"功夫", self.parent.kungfu),
                (u"撒娇", self.parent.throwTantrum),
                (u"打哈欠", self.parent.yawn),
                (u"伸懒腰", self.parent.stretch),
                (u"跳舞", self.parent.dance),
                (u"唱歌", self.parent.sing),
                (u"转圈圈", self.parent.spin),
            ]
            interaction_menu = self.createLimitedMenu(menu, "互动", interaction_items, max_count)
            interaction_menu.addSeparator()
            update_action = interaction_menu.addAction(u"仍在更新中...")
            update_action.setEnabled(False)
            menu.addMenu(interaction_menu)
            
            # 分隔符
            menu.addSeparator()
            
            # 工具菜单组
            tools_menu = QMenu("工具", menu)
            tools_menu.addAction(u"AI工具箱", self.openAIToolbox)
            tools_menu.addAction(u"文件格式转换", self.openFileConverter)
            tools_menu.addAction(u"桌面管理器", self.openDesktopManager)
            tools_menu.addAction(u"智能画板", self.openSmartPaintboard)
            tools_menu.addSeparator()
            tools_menu.addAction(u"截屏", self.parent.screenshot)
            tools_menu.addSeparator()
            tools_menu.addAction(u"打开cmd", self.parent.openCmd)
            tools_menu.addAction(u"任务管理器", self.parent.openTaskManager)
            tools_menu.addAction(u"文件资源管理器", self.parent.openFileExplorer)
            tools_menu.addSeparator()
            
            # 常用应用子菜单
            apps_items = [
                (u"我的电脑", self.parent.openMyComputer),
                (u"画图工具", self.parent.openPaint),
                (u"记事本", self.parent.openNotepad),
                (u"计算器", self.parent.openCalculator),
                (u"截图工具", self.parent.openSnippingTool),
                (u"磁盘清理", self.parent.openDiskCleanup),
                (u"控制面板", self.parent.openControlPanel),
                (u"远程桌面", self.parent.openRemoteDesktop),
                (u"放大镜", self.parent.openMagnifier),
                (u"便签", self.parent.openStickyNotes),
                (u"闹钟", self.parent.openAlarm),
            ]
            apps_menu = self.createLimitedMenu(tools_menu, "常用应用", apps_items, max_count)
            apps_menu.addSeparator()
            app_update_action = apps_menu.addAction(u"仍在更新中...")
            app_update_action.setEnabled(False)
            tools_menu.addMenu(apps_menu)
            tools_menu.addSeparator()
            
            # 系统功能子菜单
            system_menu = QMenu("系统", tools_menu)
            system_menu.addAction(u"关机", self.parent.shutdown)
            system_menu.addAction(u"重启", self.parent.restart)
            system_menu.addAction(u"睡眠", self.parent.sleep)
            system_menu.addSeparator()
            sys_update_action = system_menu.addAction(u"仍在更新中...")
            sys_update_action.setEnabled(False)
            tools_menu.addMenu(system_menu)
            menu.addMenu(tools_menu)
            
            # 休闲小游戏菜单组
            games_items = [
                (u"贪吃蛇", self.openSnakeGame),
                (u"俄罗斯方块", self.openTetrisGame),
                (u"2048", self.open2048Game),
                (u"打地鼠", self.openWhackAMoleGame),
                (u"扫雷", self.openMinesweeperGame),
                (u"井字棋", self.openTicTacToeGame),
                (u"推箱子", self.openSokobanGame),
                (u"乒乓球", self.openPongGame),
                (u"坦克大战", self.openTankBattleGame),
                (u"华容道", self.openHuarongGame),
                (u"数独", self.openSudokuGame),
                (u"连连看", self.openLianlianGame),
                (u"消消乐", self.openXiaoxiaoleGame),
                (u"五子棋", self.openGomokuGame),
                (u"羊了个羊", self.openSheepGame),
                (u"网站游戏", self.openCrazyGames),
            ]
            games_menu = self.createLimitedMenu(menu, "休闲小游戏", games_items, max_count)
            menu.addMenu(games_menu)
            
            # 模式菜单组
            mode_menu = QMenu("模式", menu)
            mode_menu.addAction(u"自由模式", self.parent.setFreeMode)
            mode_menu.addAction(u"跟随模式", self.parent.setFollowMode)
            mode_menu.addAction(u"安静模式", self.parent.setQuietMode)
            menu.addMenu(mode_menu)
            
            # 设置菜单组
            settings_menu = QMenu("设置", menu)
            settings_menu.addAction(u"配置", self.parent.openConfigDialog)
            menu.addMenu(settings_menu)
            
            # 帮助菜单组
            help_menu = QMenu("帮助", menu)
            help_menu.addAction(u"问小白", self.openWenxiaobai)
            help_menu.addAction(u"帮助信息", self.parent.openHelpDialog)
            menu.addMenu(help_menu)
            
            # 退出菜单项
            menu.addSeparator()
            menu.addAction(u"退出", self.parent.quit)
            
            # 计算菜单位置，确保菜单在屏幕内
            cursor_pos = self.parent.mapToGlobal(self.parent.rect().center())
            screen = self.parent.screen().geometry()
            menu_width = 200  # 预估菜单宽度
            menu_height = 300  # 预估菜单高度
            
            # 调整菜单位置，避免超出屏幕
            x = cursor_pos.x()
            y = cursor_pos.y()
            
            if x + menu_width > screen.right():
                x = screen.right() - menu_width
            if y + menu_height > screen.bottom():
                y = screen.bottom() - menu_height
            
            # 确保菜单位置在屏幕内
            x = max(x, screen.left())
            y = max(y, screen.top())
            
            # 显示菜单
            menu.exec_(QPoint(x, y))
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"显示右键菜单错误: {e}")
    
    def hideStatsBar(self):
        """显示/隐藏状态栏
        
        切换状态栏的显示状态
        """
        try:
            self.stats_visible = not self.stats_visible
            self.happiness_icon.setVisible(self.stats_visible)
            self.happiness_bar.setVisible(self.stats_visible)
            self.energy_label.setVisible(self.stats_visible)
            self.energy_bar.setVisible(self.stats_visible)
            self.date_label.setVisible(self.stats_visible)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"显示/隐藏状态栏错误: {e}")
    
    def initDateTimer(self):
        """初始化日期更新定时器
        
        创建一个定时器，每秒更新一次日期显示
        """
        try:
            self.date_timer = QTimer(self.parent)
            # 每秒更新一次（1000毫秒）
            self.date_timer.timeout.connect(self.updateDate)
            self.date_timer.start(1000)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"初始化日期更新定时器错误: {e}")
    
    def updateDate(self):
        """更新日期显示
        
        以YYYY-MM-DD-HH:MM:SS格式更新日期显示
        """
        try:
            current_date = datetime.datetime.now()
            date_str = current_date.strftime("%Y-%m-%d-%H:%M:%S")
            self.date_label.setText(date_str)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"更新日期显示错误: {e}")
    
    def updateDialogPosition(self):
        """更新对话框位置
        
        根据宠物窗口的位置计算对话框的位置
        
        Returns:
            QPoint: 对话框的位置
        """
        try:
            screen = QDesktopWidget().screenGeometry()
            screen_width = screen.width()
            screen_height = screen.height()
            pet_pos = self.parent.pos()
            pet_width = self.parent.width()
            pet_height = self.parent.height()
            dialog_width = 200  # 默认对话框宽度
            dialog_height = 60  # 默认对话框高度
            
            x = pet_pos.x() + pet_width // 2
            y = pet_pos.y()
            if x + dialog_width > screen_width:
                x = pet_pos.x() - dialog_width // 2
            if y < 0:
                y = 0
            return QPoint(x, y)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"更新对话框位置错误: {e}")
            # 返回默认位置
            return QPoint(0, 0)
    
    def openSnakeGame(self):
        """打开贪吃蛇游戏"""
        try:
            game = SnakeGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openTetrisGame(self):
        """打开俄罗斯方块游戏"""
        try:
            game = TetrisGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def open2048Game(self):
        """打开2048游戏"""
        try:
            game = Game2048(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openWhackAMoleGame(self):
        """打开打地鼠游戏"""
        try:
            game = WhackAMole(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openMinesweeperGame(self):
        """打开扫雷游戏"""
        try:
            game = MinesweeperGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openTicTacToeGame(self):
        """打开井字棋游戏"""
        try:
            game = TicTacToeGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openSokobanGame(self):
        """打开推箱子游戏"""
        try:
            game = SokobanGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openPongGame(self):
        """打开乒乓球游戏"""
        try:
            game = PongGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openTankBattleGame(self):
        """打开坦克大战游戏"""
        try:
            game = TankBattleGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openHuarongGame(self):
        """打开华容道游戏"""
        try:
            game = HuarongGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openSudokuGame(self):
        """打开数独游戏"""
        try:
            game = SudokuGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openLianlianGame(self):
        """打开连连看游戏"""
        try:
            game = LianlianGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openXiaoxiaoleGame(self):
        """打开消消乐游戏"""
        try:
            game = XiaoxiaoleGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openGomokuGame(self):
        """打开五子棋游戏"""
        try:
            game = GomokuGame(self.parent)
            game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开游戏失败: {e}")
    
    def openWenxiaobai(self):
        """打开问小白网站"""
        try:
            QDesktopServices.openUrl(QUrl("https://www.wenxiaobai.com/"))
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开网站失败: {e}")
    
    def openCrazyGames(self):
        """打开CrazyGames网站"""
        try:
            QDesktopServices.openUrl(QUrl("https://www.crazygames.com/"))
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开网站失败: {e}")
    
    def openAIToolbox(self):
        """打开AI工具箱"""
        try:
            dialog = AIToolboxDialog(self.parent)
            dialog.exec_()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开AI工具箱失败: {e}")
    
    def openFileConverter(self):
        """打开文件格式转换工具"""
        try:
            dialog = FileConverterDialog(self.parent)
            dialog.exec_()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开文件转换工具失败: {e}")

    def openSheepGame(self):
        """打开羊了个羊游戏"""
        try:
            # 先弹出模式选择
            mode_dialog = SheepModeSelectDialog(self.parent)
            if mode_dialog.exec_():
                mode = mode_dialog.selected_mode
                level = mode_dialog.selected_level
                game = SheepGame(self.parent, level=level, mode=mode)
                game.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开羊了个羊失败: {e}")
    
    def openDesktopManager(self):
        """打开桌面管理器"""
        try:
            window = open_desktop_manager(self.parent)
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开桌面管理器失败: {e}")
    
    def openSmartPaintboard(self):
        """打开智能画板"""
        try:
            board = IntelligentDrawingBoard(self.parent)
            board.show()
        except Exception as e:
            QMessageBox.warning(self.parent, "错误", f"打开智能画板失败: {e}")