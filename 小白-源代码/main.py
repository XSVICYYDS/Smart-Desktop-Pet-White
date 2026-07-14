import sys
import os
import random
import math
import logging
from datetime import datetime
from PyQt5.QtGui import QMovie, QCursor
from PyQt5.QtWidgets import QWidget, QApplication, QDialog, QMessageBox
from PyQt5.QtCore import Qt, QSize, QPoint

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'debug.log'))
    ]
)
logger = logging.getLogger('MalteseDesktopPet')

class ModeStateMachine:
    """模式状态机
    
    管理宠物的模式切换，确保状态转换平滑无冲突
    """
    def __init__(self, pet):
        """初始化状态机
        
        Args:
            pet: 宠物对象
        """
        self.pet = pet
        self.current_state = "自由模式"
        self.states = ["自由模式", "跟随模式", "安静模式"]
        self.transitions = {
            "自由模式": ["跟随模式", "安静模式"],
            "跟随模式": ["自由模式", "安静模式"],
            "安静模式": ["自由模式", "跟随模式"]
        }
    
    def transition(self, new_state):
        """状态转换
        
        Args:
            new_state: 新状态
            
        Returns:
            bool: 转换是否成功
        """
        if new_state not in self.states:
            return False
        
        if new_state not in self.transitions[self.current_state]:
            return False
        
        # 执行状态转换
        self.current_state = new_state
        return True
    
    def get_current_state(self):
        """获取当前状态
        
        Returns:
            str: 当前状态
        """
        return self.current_state

# 获取脚本所在目录的绝对路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 导入模块
from pet_behavior import PetBehavior
from ui_components import UIComponents, ClockDialog
from config import Config
from state import StateManager
from config_ui import ConfigDialog
from system_integration import SystemIntegration
from setup_wizard import SetupWizard
from help_dialog import HelpDialog
from screen_pen import ScreenPen
from screen_capture import ScreenCapture
from input_manager import InputManager
from physics_engine import PhysicsEngine
from animation_player import AnimationPlayer
# from status_tooltip import StatusTooltip

class DesktopPet(QWidget):
    """桌面宠物主类
    
    负责整合各个模块，协调宠物的行为和 UI 显示
    """
    def __init__(self, parent=None, **kwargs):
        """初始化桌面宠物
        
        Args:
            parent: 父窗口对象
            **kwargs: 其他参数
        """
        super(DesktopPet, self).__init__(parent)
        self.init()
        
        # 初始化 GIF 缓存
        self.gif_cache = {}
        
        # 初始化配置和状态管理
        self.config = Config(BASE_DIR)
        self.state_manager = StateManager(BASE_DIR)
        
        # 初始化系统集成
        self.system_integration = SystemIntegration()
        
        # 初始化 UI 组件
        self.ui = UIComponents(self, BASE_DIR, self.config)
        
        # 初始化状态提示
        # self.status_tooltip = StatusTooltip(self)
        
        # 初始化输入管理器
        self.input_manager = InputManager(self)
        
        # 初始化动画播放器
        self.animation_player = AnimationPlayer(self, BASE_DIR)
        
        # 行为状态锁
        self.is_action_locked = False
        
        # 初始化宠物行为
        self.behavior = PetBehavior(self, BASE_DIR)
        
        # 初始化模式
        self.mode = "自由模式"  # 默认自由模式
        self.follow_timer = None
        self.free_move_timer = None
        self.move_speed = 2  # 移动速度
        self.move_direction = [random.uniform(-1, 1), random.uniform(-1, 1)]  # 移动方向
        self.screen_geometry = None  # 屏幕几何信息
        # 跟随模式参数
        self.follow_delay = 1  # 跟随延迟（秒），设置为7-10秒之间的平均值
        self.mouse_history = []  # 鼠标位置历史
        self.mouse_history_max = 10  # 最大历史记录数
        self.follow_smoothness = 0.1  # 跟随平滑度
        # 状态保存变量
        self.previous_state = {}  # 保存切换到安静模式前的状态
        # 初始化状态机
        self.state_machine = ModeStateMachine(self)
        
        # 初始化状态定时器
        from PyQt5.QtCore import QTimer
        # 能量值减少定时器（每4分钟）
        self.energy_decrease_timer = QTimer(self)
        self.energy_decrease_timer.timeout.connect(self.decreaseEnergy)
        self.energy_decrease_timer.start(4 * 60 * 1000)
        # 快乐值定时器
        self.happiness_timer = QTimer(self)
        self.happiness_timer.timeout.connect(self.updateHappinessBasedOnMode)
        self.happiness_timer.start(12 * 60 * 1000)
        # 饱食度减少定时器（每4分钟）
        self.fullness_decrease_timer = QTimer(self)
        self.fullness_decrease_timer.timeout.connect(self.decreaseFullness)
        self.fullness_decrease_timer.start(4 * 60 * 1000)
        # 好感度定时器
        self.favor_timer = QTimer(self)
        self.favor_timer.timeout.connect(self.updateFavorBasedOnMode)
        self.favor_timer.start(12 * 60 * 1000)
        
        # 加载保存的状态
        self.loadState()
        
        # 检查初始 GIF
        self.behavior.checkInitialGif()
        
        # 连接信号
        self._connect_gesture_signals()
        
        # 显示欢迎通知
        # self.showNotification("小白来了", "你好！我是你的桌面宠物小白，很高兴认识你！")
        
    def init(self):
        """初始化窗口
        
        设置窗口属性，如无边框、置顶、透明背景等
        """
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool | Qt.NoDropShadowWindowHint)
        self.setAutoFillBackground(False)
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.repaint()
    
    def loadState(self):
        """加载保存的状态
        
        从状态管理器加载宠物的快乐值、能量值等状态
        注：饱食度已整合到快乐值，好感度已整合到能量值
        """
        # 加载快乐值和能量值
        happiness = self.state_manager.getHappiness()
        energy = self.state_manager.getEnergy()
        self.ui.happiness_bar.setValue(happiness)
        self.ui.energy_bar.setValue(energy)
        
        # 加载死亡状态
        self.behavior.is_dead = self.state_manager.isDead()
        
        # 加载最后一次小时提醒的小时数
        self.behavior.last_hour = self.state_manager.getLastHour()
    
    def saveState(self):
        """保存当前状态
        
        将宠物的快乐值、能量值等状态保存到状态管理器
        注：原饱食度和好感度已整合到快乐值和能量值中
        """
        self.state_manager.updateState(
            happiness=self.ui.happiness_bar.value(),
            energy=self.ui.energy_bar.value(),
            fullness=0,  # 已整合到快乐值
            favor=0,   # 已整合到能量值
            is_dead=self.behavior.is_dead,
            last_hour=self.behavior.last_hour
        )
    
    def showClockDialog(self, message):
        """显示时钟对话框
        
        Args:
            message: 对话框显示的消息
        """
        self.clock_dialog = ClockDialog(message, parent=self)
        self.clock_dialog.setAutoClose(9500)
        self.clock_dialog.move(self.updateDialogPosition())
        self.clock_dialog.show()
    
    def randomPosition(self):
        """随机设置宠物位置
        
        将宠物随机移动到屏幕的某个位置
        """
        from PyQt5.QtWidgets import QDesktopWidget
        screen_geometry = QDesktopWidget().screenGeometry()
        pet_geometry = self.geometry()
        width = int((screen_geometry.width() - pet_geometry.width()) * random.random())
        height  = int((screen_geometry.height() - pet_geometry.height()) * random.random())
        self.move(width, height)
    
    def changeGif(self, path):
        """更改宠物的 GIF 动画
        
        Args:
            path: GIF 文件路径
        """
        try:
            # 构建绝对路径
            abs_path = os.path.join(BASE_DIR, path)
            
            # 检查文件是否存在
            if not os.path.exists(abs_path):
                QMessageBox.warning(self, "错误", f"动图文件不存在: {abs_path}")
                return
            
            # 停止当前播放的动图
            current_movie = self.ui.image.movie()
            if current_movie:
                current_movie.stop()
            
            # 检查缓存中是否已存在该 GIF
            if path not in self.gif_cache:
                # 创建新的动图对象并加入缓存
                movie = QMovie(abs_path)
                movie.setScaledSize(QSize(200, 200))
                self.gif_cache[path] = movie
            else:
                # 使用缓存中的动图对象
                movie = self.gif_cache[path]
                # 重置动图到开始位置
                movie.setCacheMode(QMovie.CacheAll)
                movie.jumpToFrame(0)
            
            # 设置动图并启动
            self.ui.image.setMovie(movie)
            movie.start()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"更改动图错误: {e}")
    
    def mousePressEvent(self, event):
        """鼠标按下事件处理
        
        Args:
            event: 鼠标事件对象
        """
        try:
            # 通知输入管理器
            if hasattr(self, 'input_manager'):
                self.input_manager.on_mouse_press(event.globalPos(), event.button())
            
            if event.button() == Qt.LeftButton:
                # 保存拖动状态
                self.is_follow_mouse = True
                self.mouse_drag_pos = event.globalPos() - self.pos()
                self.setCursor(QCursor(Qt.OpenHandCursor))
            elif event.button() == Qt.RightButton:
                self.ui.showMenu()
            event.accept()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"鼠标按下事件处理错误: {e}")
 
    def mouseMoveEvent(self, event):
        """鼠标移动事件处理
        
        Args:
            event: 鼠标事件对象
        """
        try:
            # 通知输入管理器
            if hasattr(self, 'input_manager'):
                self.input_manager.on_mouse_move(event.globalPos())
            
            if Qt.LeftButton and hasattr(self, 'is_follow_mouse') and self.is_follow_mouse:
                self.move(event.globalPos() - self.mouse_drag_pos)
                if hasattr(self, 'clock_dialog') and self.clock_dialog.isVisible():
                    self.clock_dialog.move(self.updateDialogPosition())
            event.accept()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"鼠标移动事件处理错误: {e}")
 
    def mouseReleaseEvent(self, event):
        """鼠标释放事件处理
        
        Args:
            event: 鼠标事件对象
        """
        try:
            # 通知输入管理器
            if hasattr(self, 'input_manager'):
                self.input_manager.on_mouse_release(event.globalPos(), event.button())
            
            if hasattr(self, 'is_follow_mouse'):
                self.is_follow_mouse = False
            self.setCursor(QCursor(Qt.ArrowCursor))
        except Exception as e:
            QMessageBox.warning(self, "错误", f"鼠标释放事件处理错误: {e}")
 
    def enterEvent(self, event):
        """鼠标进入事件处理
        
        Args:
            event: 鼠标事件对象
        """
        try:
            self.setCursor(Qt.ClosedHandCursor)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"鼠标进入事件处理错误: {e}")
    
    def keyPressEvent(self, event):
        """键盘事件处理
        
        Args:
            event: 键盘事件对象
        """
        try:
            # 通知输入管理器
            if hasattr(self, 'input_manager'):
                self.input_manager.on_key_press(event.key())
            
            # Alt+Esc 关闭宠物
            if event.key() == Qt.Key_Escape and event.modifiers() == Qt.AltModifier:
                self.quit()
            # Esc 隐藏宠物
            elif event.key() == Qt.Key_Escape:
                self.hide()
            event.accept()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"键盘事件处理错误: {e}")
    
    def keyReleaseEvent(self, event):
        """键盘释放事件处理
        
        Args:
            event: 键盘事件对象
        """
        try:
            # 通知输入管理器
            if hasattr(self, 'input_manager'):
                self.input_manager.on_key_release(event.key())
            event.accept()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"键盘释放事件处理错误: {e}")
        
    def updateHappiness(self, value):
        """更新快乐值
        
        Args:
            value: 快乐值变化量
        """
        try:
            current_value = self.ui.happiness_bar.value()
            new_value = max(0, min(100, current_value + value))
            self.ui.happiness_bar.setValue(new_value)
            # 保存状态 
            self.saveState()
            # 更新状态提示
            # self.status_tooltip.updateStatusTips()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"更新快乐值错误: {e}")
        
    def updateEnergy(self, value):
        """更新能量值
        
        Args:
            value: 能量值变化量
        """
        try:
            current_value = self.ui.energy_bar.value()
            new_value = max(0, min(100, current_value + value))
            self.ui.energy_bar.setValue(new_value)
            # 保存状态
            self.saveState()
            # 更新状态提示
            # self.status_tooltip.updateStatusTips()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"更新能量值错误: {e}")
    
    def updateFullness(self, value):
        """更新饱食度（已整合到快乐值）
        
        Args:
            value: 变化量，实际影响快乐值
        """
        try:
            # 将饱食度的变化整合到快乐值中
            self.updateHappiness(value)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"更新快乐值错误: {e}")
    
    def updateFavor(self, value):
        """更新好感度（已整合到能量值）
        
        Args:
            value: 变化量，实际影响能量值
        """
        try:
            # 将好感度的变化整合到能量值中
            self.updateEnergy(value)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"更新能量值错误: {e}")
    
    def decreaseEnergy(self):
        """减少能量值
        
        每4分钟减少1点能量值
        """
        try:
            self.updateEnergy(-1)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"减少能量值错误: {e}")
    
    def updateHappinessBasedOnMode(self):
        """根据模式更新快乐值
        
        自由模式和跟随模式：每12分钟增加1点快乐值
        安静模式：每12分钟减少1点快乐值
        """
        try:
            if self.mode == "安静模式":
                self.updateHappiness(-1)
            else:  # 自由模式和跟随模式
                self.updateHappiness(1)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"更新快乐值错误: {e}")
    
    def decreaseFullness(self):
        """减少饱食度
        
        每4分钟减少1点饱食度
        """
        try:
            self.updateFullness(-1)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"减少饱食度错误: {e}")
    
    def updateFavorBasedOnMode(self):
        """根据模式更新好感度
        
        自由模式和跟随模式：每12分钟增加1点好感度
        安静模式：每12分钟减少1点好感度
        """
        try:
            if self.mode == "安静模式":
                self.updateFavor(-1)
            else:  # 自由模式和跟随模式
                self.updateFavor(1)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"更新好感度错误: {e}")
        
    def hideStatsBar(self):
        """显示/隐藏状态栏
        
        切换状态栏的显示状态
        """
        try:
            if self.behavior.is_dead:
                return
            self.ui.hideStatsBar()
            # 保存配置
            self.config.set("appearance.show_stats_bar", self.ui.stats_visible)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"显示/隐藏状态栏错误: {e}")
        
    def updateDialogPosition(self):
        """更新对话框位置
        
        根据宠物窗口的位置计算对话框的位置
        
        Returns:
            QPoint: 对话框的位置
        """
        try:
            return self.ui.updateDialogPosition()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"更新对话框位置错误: {e}")
            # 返回默认位置
            from PyQt5.QtCore import QPoint
            return QPoint(0, 0)
        
    def quit(self):
        """退出应用
        
        保存状态并退出应用
        """
        try:
            self.saveState()
            self.close()
            sys.exit()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"退出应用错误: {e}")
            # 即使出错也尝试退出
            sys.exit(1)
        
    def showup(self):
        """显示宠物
        
        淡入效果显示宠物
        """
        try:
            # 简单的显示效果
            self.setWindowOpacity(1)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"显示宠物错误: {e}")
        
    def hide(self):
        """隐藏宠物
        
        淡出效果隐藏宠物
        """
        try:
            # 简单的隐藏效果
            self.setWindowOpacity(0)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"隐藏宠物错误: {e}")
    
    def openConfigDialog(self):
        """打开配置对话框
        
        显示配置对话框，允许用户修改应用配置
        """
        try:
            dialog = ConfigDialog(self.config, BASE_DIR, self)
            if dialog.exec_() == QDialog.Accepted:
                # 配置已更改，应用新配置
                self.applyConfig()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开配置对话框错误: {e}")
    
    def applyConfig(self):
        """应用配置
        
        应用用户修改的配置
        """
        try:
            # 应用状态栏显示状态
            if self.config.isStatsBarVisible() != self.ui.stats_visible:
                self.ui.hideStatsBar()
            
            # 应用窗口透明度
            self.setWindowOpacity(self.config.getWindowOpacity())
        except Exception as e:
            QMessageBox.warning(self, "错误", f"应用配置错误: {e}")
    
    def showNotification(self, title, message, duration=5):
        """显示系统通知
        
        Args:
            title: 通知标题
            message: 通知消息
            duration: 通知显示时间（秒）
        """
        try:
            self.system_integration.showNotification(title, message, duration)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"显示系统通知错误: {e}")
    
    def openHelpDialog(self):
        """打开帮助对话框
        
        显示应用的帮助信息和使用说明
        """
        try:
            dialog = HelpDialog(self)
            dialog.exec_()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开帮助对话框错误: {e}")
    
    # 互动行为方法（代理到 behavior 对象）
    def stick(self):
        """贴贴行为
        
        代理到 behavior 对象的 stick 方法
        """
        try:
            self.behavior.stick()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"贴贴行为错误: {e}")
    
    def call(self):
        """拍一拍行为
        
        代理到 behavior 对象的 call 方法
        """
        try:
            self.behavior.call()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"拍一拍行为错误: {e}")
    
    def exercise(self):
        """锻炼行为
        
        代理到 behavior 对象的 exercise 方法
        """
        try:
            self.behavior.exercise()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"锻炼行为错误: {e}")
    
    def charge(self):
        """充电行为
        
        代理到 behavior 对象的 charge 方法
        """
        try:
            self.behavior.charge()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"充电行为错误: {e}")
    
    def cake(self):
        """投喂小白行为
        
        代理到 behavior 对象的 cake 方法
        """
        try:
            self.behavior.cake()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"投喂小白行为错误: {e}")
    
    def baji(self):
        """吧唧行为
        
        代理到 behavior 对象的 baji 方法
        """
        try:
            self.behavior.baji()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"吧唧行为错误: {e}")
    
    def appear(self):
        """随机出现行为
        
        代理到 behavior 对象的 appear 方法
        """
        try:
            self.behavior.appear()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"随机出现行为错误: {e}")
    
    def walkDog(self):
        """遛小鸡毛行为
        
        代理到 behavior 对象的 walkDog 方法
        """
        try:
            self.behavior.walkDog()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"遛小鸡毛行为错误: {e}")
    
    def baji2(self):
        """鸡毛丸子行为
        
        代理到 behavior 对象的 baji2 方法
        """
        try:
            self.behavior.baji2()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"鸡毛丸子行为错误: {e}")
    
    def eating(self):
        """吃饭行为
        
        代理到 behavior 对象的 eating 方法
        """
        try:
            self.behavior.eating()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"吃饭行为错误: {e}")
    
    def megic(self):
        """魔法行为
        
        代理到 behavior 对象的 megic 方法
        """
        try:
            self.behavior.megic()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"魔法行为错误: {e}")
    
    def biking(self):
        """骑自行车行为
        
        代理到 behavior 对象的 biking 方法
        """
        try:
            self.behavior.biking()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"骑自行车行为错误: {e}")
    
    def loving(self):
        """爱心行为
        
        代理到 behavior 对象的 loving 方法
        """
        try:
            self.behavior.loving()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"爱心行为错误: {e}")
    

    
    def happynewyear(self):
        """新年快乐行为
        
        代理到 behavior 对象的 happynewyear 方法
        """
        try:
            self.behavior.happynewyear()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"新年快乐行为错误: {e}")
    
    def jumping(self):
        """跳跃行为
        
        代理到 behavior 对象的 jumping 方法
        """
        try:
            self.behavior.jumping()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"跳跃行为错误: {e}")
    
    def kungfu(self):
        """功夫行为
        
        代理到 behavior 对象的 kungfu 方法
        """
        try:
            self.behavior.kungfu()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"功夫行为错误: {e}")
    
    def throwTantrum(self):
        """撒娇行为"""
        try:
            QMessageBox.information(self, "撒娇", "功能仍在开发中\n敬请期待！\n😢💢")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"撒娇行为错误: {e}")
    
    def yawn(self):
        """打哈欠行为"""
        try:
            QMessageBox.information(self, "打哈欠", "功能仍在开发中\n敬请期待！\n😪💤")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打哈欠行为错误: {e}")
    
    def stretch(self):
        """伸懒腰行为"""
        try:
            QMessageBox.information(self, "伸懒腰", "功能仍在开发中\n敬请期待！\n😊💪")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"伸懒腰行为错误: {e}")
    
    def dance(self):
        """跳舞行为"""
        try:
            QMessageBox.information(self, "跳舞", "功能仍在开发中\n敬请期待！\n💃🕺")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"跳舞行为错误: {e}")
    
    def sing(self):
        """唱歌行为"""
        try:
            QMessageBox.information(self, "唱歌", "功能仍在开发中\n敬请期待！\n🎵🎤")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"唱歌行为错误: {e}")
    
    def spin(self):
        """转圈圈行为"""
        try:
            QMessageBox.information(self, "转圈圈", "功能仍在开发中\n敬请期待！\n🔄✨")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"转圈圈行为错误: {e}")
    
    def screenshot(self):
        """截屏功能
        
        打开矩形区域截屏工具，允许用户选择截取屏幕区域
        """
        try:
            # 隐藏宠物窗口，避免截到宠物自身
            self.hide()
            
            # 延迟一小段时间确保宠物窗口已隐藏
            from PyQt5.QtCore import QTimer
            QTimer.singleShot(200, self.startCapture)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"截屏功能错误: {e}")
            self.forceShowPet()
    
    def startCapture(self):
        """开始截图
        
        在宠物窗口隐藏后启动截图工具
        """
        try:
            # 传递 self 作为父窗口，以便截图完成后能重新显示宠物
            capture = ScreenCapture(self)
            capture.capture_finished.connect(self.onCaptureFinished)
            capture.show()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"截图失败: {e}")
            self.forceShowPet()
    
    def onCaptureFinished(self):
        """截图完成回调
        
        确保宠物窗口正确显示
        """
        try:
            # 强制显示宠物窗口（多重保障）
            self.forceShowPet()
        except Exception as e:
            pass
    
    def forceShowPet(self):
        """强制显示宠物窗口
        
        使用多种方法确保宠物窗口正确显示
        """
        try:
            # 方法1: 直接调用show()
            self.show()
            
            # 方法2: 激活并置顶
            self.activateWindow()
            self.raise_()
            
            # 方法3: 使用QTimer延迟多次显示
            from PyQt5.QtCore import QTimer
            QTimer.singleShot(50, self.show)
            QTimer.singleShot(100, self.show)
            QTimer.singleShot(200, self.show)
            QTimer.singleShot(300, self.show)
            
            QTimer.singleShot(50, self.activateWindow)
            QTimer.singleShot(100, self.activateWindow)
            QTimer.singleShot(200, self.activateWindow)
            
            QTimer.singleShot(50, self.raise_)
            QTimer.singleShot(100, self.raise_)
            QTimer.singleShot(200, self.raise_)
        except Exception as e:
            logger.error(f"强制显示宠物窗口错误: {e}")
    
    def showPet(self):
        """显示宠物窗口
        
        确保宠物窗口正确显示，用于截图完成后的恢复
        """
        try:
            self.show()
            self.activateWindow()
            self.raise_()
        except Exception as e:
            logger.error(f"显示宠物窗口错误: {e}")
    
    def openScreenPen(self):
        """打开屏幕笔工具
        
        显示屏幕笔工具，允许用户在屏幕上绘图
        """
        try:
            screen_pen = ScreenPen(self)
            screen_pen.exec_()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开屏幕笔工具错误: {e}")
    
    def openCmd(self):
        """打开命令提示符
        
        调用系统集成的打开命令提示符功能
        """
        try:
            self.system_integration.openCmd()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开命令提示符错误: {e}")
    
    def openTaskManager(self):
        """打开任务管理器
        
        调用系统集成的打开任务管理器功能
        """
        try:
            self.system_integration.openTaskManager()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开任务管理器错误: {e}")
    
    def openFileExplorer(self):
        """打开文件资源管理器
        
        调用系统集成的打开文件资源管理器功能
        """
        try:
            self.system_integration.openFileExplorer()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开文件资源管理器错误: {e}")
    
    def openMyComputer(self):
        """打开我的电脑"""
        try:
            self.system_integration.openMyComputer()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开我的电脑错误: {e}")
    
    def openPaint(self):
        """打开画图工具"""
        try:
            self.system_integration.openPaint()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开画图工具错误: {e}")
    
    def openNotepad(self):
        """打开记事本"""
        try:
            self.system_integration.openNotepad()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开记事本错误: {e}")
    
    def openCalculator(self):
        """打开计算器"""
        try:
            self.system_integration.openCalculator()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开计算器错误: {e}")
    
    def openSnippingTool(self):
        """打开截图工具"""
        try:
            self.system_integration.openSnippingTool()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开截图工具错误: {e}")
    
    def openDiskCleanup(self):
        """打开磁盘清理"""
        try:
            self.system_integration.openDiskCleanup()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开磁盘清理错误: {e}")
    
    def openControlPanel(self):
        """打开控制面板"""
        try:
            self.system_integration.openControlPanel()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开控制面板错误: {e}")
    
    def openRemoteDesktop(self):
        """打开远程桌面连接"""
        try:
            self.system_integration.openRemoteDesktop()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开远程桌面错误: {e}")
    
    def openMagnifier(self):
        """打开放大镜"""
        try:
            self.system_integration.openMagnifier()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开放大镜错误: {e}")
    
    def openStickyNotes(self):
        """打开便签"""
        try:
            self.system_integration.openStickyNotes()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开便签错误: {e}")
    
    def openAlarm(self):
        """打开闹钟"""
        try:
            self.system_integration.openAlarm()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"打开闹钟错误: {e}")
    
    def shutdown(self):
        """关机功能
        
        调用系统集成的关机功能
        """
        try:
            self.system_integration.shutdown()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"关机错误: {e}")
    
    def restart(self):
        """重启功能
        
        调用系统集成的重启功能
        """
        try:
            self.system_integration.restart()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"重启错误: {e}")
    
    def sleep(self):
        """睡眠功能
        
        调用系统集成的睡眠功能
        """
        try:
            self.system_integration.sleep()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"睡眠错误: {e}")
    
    def setFreeMode(self):
        """设置自由模式
        
        宠物在屏幕上自由活动
        """
        try:
            # 使用状态机进行状态转换
            if not self.state_machine.transition("自由模式"):
                return
            
            logger.info(f"模式切换: 切换到自由模式")
            self.mode = "自由模式"
            # 停止跟随定时器
            if self.follow_timer:
                self.follow_timer.stop()
                self.follow_timer = None
                logger.info("自由模式: 停止跟随定时器")
            # 恢复宠物的随机活动
            self.behavior.resetBoringTimer()
            logger.info("自由模式: 恢复宠物的随机活动")
            # 启动自由移动定时器
            from PyQt5.QtCore import QTimer
            self.free_move_timer = QTimer(self)
            self.free_move_timer.timeout.connect(self.freeMove)
            self.free_move_timer.start(16)  # 约60FPS
            logger.info("自由模式: 启动自由移动定时器，帧率约60FPS")
            # 获取屏幕几何信息
            from PyQt5.QtWidgets import QDesktopWidget
            self.screen_geometry = QDesktopWidget().screenGeometry()
            logger.info(f"自由模式: 获取屏幕几何信息 - 宽: {self.screen_geometry.width()}, 高: {self.screen_geometry.height()}")
            # 恢复之前的状态
            if self.previous_state:
                # 恢复工作状态
                if self.previous_state.get("is_working_time"):
                    self.behavior.working_timer.start(3 * 60 * 1000)
                    logger.info("自由模式: 恢复工作状态")
                # 恢复无聊状态
                if self.previous_state.get("is_boring"):
                    self.behavior.setBoring()
                    logger.info("自由模式: 恢复无聊状态")
                # 清空状态
                self.previous_state = {}
                logger.info("自由模式: 清空之前的状态")
        except Exception as e:
            logger.error(f"设置自由模式错误: {e}")
            QMessageBox.warning(self, "错误", f"设置自由模式错误: {e}")
    
    def setFollowMode(self):
        """设置跟随模式
        
        宠物跟随鼠标移动
        """
        try:
            # 使用状态机进行状态转换
            if not self.state_machine.transition("跟随模式"):
                return
            
            logger.info(f"模式切换: 切换到跟随模式")
            self.mode = "跟随模式"
            # 停止宠物的随机活动
            self.behavior.boring_timer.stop()
            logger.info("跟随模式: 停止宠物的随机活动")
            # 停止自由移动定时器
            if self.free_move_timer:
                self.free_move_timer.stop()
                self.free_move_timer = None
                logger.info("跟随模式: 停止自由移动定时器")
            # 启动跟随定时器
            from PyQt5.QtCore import QTimer
            self.follow_timer = QTimer(self)
            self.follow_timer.timeout.connect(self.followMouse)
            self.follow_timer.start(16)  # 约60FPS
            logger.info("跟随模式: 启动跟随定时器，帧率约60FPS")
            # 清空状态
            self.previous_state = {}
            logger.info("跟随模式: 清空之前的状态")
        except Exception as e:
            logger.error(f"设置跟随模式错误: {e}")
            QMessageBox.warning(self, "错误", f"设置跟随模式错误: {e}")
    
    def setQuietMode(self):
        """设置安静模式
        
        宠物静止不动
        """
        try:
            # 使用状态机进行状态转换
            if not self.state_machine.transition("安静模式"):
                return
            
            logger.info(f"模式切换: 切换到安静模式")
            # 保存当前状态
            self.previous_state = {
                "mode": self.mode,
                "is_boring": self.behavior.is_boring,
                "is_working_time": self.behavior.is_working_time,
                "action_timer_active": self.behavior.action_timer.isActive(),
                "status_timer_active": self.behavior.status_timer.isActive(),
                "working_timer_active": self.behavior.working_timer.isActive(),
                "boring_timer_active": self.behavior.boring_timer.isActive()
            }
            logger.info(f"安静模式: 保存当前状态 - 模式: {self.previous_state['mode']}, 无聊状态: {self.previous_state['is_boring']}, 工作时间: {self.previous_state['is_working_time']}")
            
            self.mode = "安静模式"
            # 停止跟随定时器
            if self.follow_timer:
                self.follow_timer.stop()
                self.follow_timer = None
                logger.info("安静模式: 停止跟随定时器")
            # 停止自由移动定时器
            if self.free_move_timer:
                self.free_move_timer.stop()
                self.free_move_timer = None
                logger.info("安静模式: 停止自由移动定时器")
            # 停止宠物的随机活动
            self.behavior.boring_timer.stop()
            logger.info("安静模式: 停止宠物的随机活动")
            # 停止所有定时器
            self.behavior.action_timer.stop()
            self.behavior.status_timer.stop()
            self.behavior.working_timer.stop()
            logger.info("安静模式: 停止所有定时器")
            # 设置为正常状态的动画
            self.changeGif("GIF/normal.gif")
            logger.info("安静模式: 设置为正常状态的动画")
        except Exception as e:
            logger.error(f"设置安静模式错误: {e}")
            QMessageBox.warning(self, "错误", f"设置安静模式错误: {e}")
    
    def followMouse(self):
        """跟随鼠标移动
        
        使宠物跟随鼠标位置移动，包含延迟、平滑和预测机制
        """
        try:
            if self.mode != "跟随模式":
                return
            
            from PyQt5.QtGui import QCursor
            from PyQt5.QtWidgets import QDesktopWidget
            import time
            
            # 获取当前鼠标位置和时间戳
            current_time = time.time()
            mouse_pos = QCursor.pos()
            
            # 添加到鼠标历史记录
            self.mouse_history.append((current_time, mouse_pos.x(), mouse_pos.y()))
            
            # 保持历史记录长度
            if len(self.mouse_history) > self.mouse_history_max:
                self.mouse_history.pop(0)
            
            # 计算延迟后的目标位置
            target_x, target_y = mouse_pos.x(), mouse_pos.y()
            
            # 如果有足够的历史记录，进行鼠标移动预测
            if len(self.mouse_history) >= 3:
                # 计算鼠标移动速度
                recent_history = self.mouse_history[-3:]
                times = [t for t, _, _ in recent_history]
                x_positions = [x for _, x, _ in recent_history]
                y_positions = [y for _, _, y in recent_history]
                
                # 计算速度向量
                if times[-1] > times[0]:
                    delta_time = times[-1] - times[0]
                    delta_x = x_positions[-1] - x_positions[0]
                    delta_y = y_positions[-1] - y_positions[0]
                    
                    # 预测延迟后的位置
                    predicted_x = x_positions[-1] + (delta_x / delta_time) * self.follow_delay
                    predicted_y = y_positions[-1] + (delta_y / delta_time) * self.follow_delay
                    
                    # 平滑过渡到预测位置
                    target_x = (1 - self.follow_smoothness) * target_x + self.follow_smoothness * predicted_x
                    target_y = (1 - self.follow_smoothness) * target_y + self.follow_smoothness * predicted_y
            
            # 计算宠物位置，使宠物中心对准目标位置
            pet_x = target_x - self.width() // 2
            pet_y = target_y - self.height() // 2
            
            # 确保宠物在屏幕内
            screen = QDesktopWidget().screenGeometry()
            pet_x = max(0, min(pet_x, screen.width() - self.width()))
            pet_y = max(0, min(pet_y, screen.height() - self.height()))
            
            # 平滑移动
            current_pos = self.pos()
            smooth_x = current_pos.x() + (pet_x - current_pos.x()) * 0.1
            smooth_y = current_pos.y() + (pet_y - current_pos.y()) * 0.1
            
            self.move(int(smooth_x), int(smooth_y))
        except Exception as e:
            QMessageBox.warning(self, "错误", f"跟随鼠标错误: {e}")
    
    def freeMove(self):
        """自由移动
        
        宠物在屏幕上自由活动，包含碰撞检测和反弹逻辑
        优化实现：
        - 基于屏幕坐标系的宠物自由活动边界控制机制
        - 伪随机路径生成算法，确保移动轨迹自然无规律
        - 高精度屏幕边缘碰撞检测系统
        - 碰撞反弹物理引擎
        - 基于缓动函数的平滑移动算法
        """
        try:
            if self.mode != "自由模式" or not self.screen_geometry:
                return
            
            # 获取当前位置
            current_pos = self.pos()
            pet_width = self.width()
            pet_height = self.height()
            screen_width = self.screen_geometry.width()
            screen_height = self.screen_geometry.height()
            
            # 计算新位置
            new_x = current_pos.x() + self.move_direction[0] * self.move_speed
            new_y = current_pos.y() + self.move_direction[1] * self.move_speed
            
            # 高精度屏幕边缘碰撞检测
            collision_detected = False
            
            # 左右边界碰撞
            if new_x < 0:
                new_x = 0
                # 碰撞反弹物理引擎，计算反弹角度
                self.move_direction[0] = -self.move_direction[0] * 0.9  # 能量损失较小，更自然
                collision_detected = True
            elif new_x + pet_width > screen_width:
                new_x = screen_width - pet_width
                self.move_direction[0] = -self.move_direction[0] * 0.9
                collision_detected = True
            
            # 上下边界碰撞
            if new_y < 0:
                new_y = 0
                self.move_direction[1] = -self.move_direction[1] * 0.9
                collision_detected = True
            elif new_y + pet_height > screen_height:
                new_y = screen_height - pet_height
                self.move_direction[1] = -self.move_direction[1] * 0.9
                collision_detected = True
            
            # 伪随机路径生成算法
            # 碰撞后增加改变方向的概率
            direction_change_prob = 0.05 if collision_detected else 0.01
            if random.random() < direction_change_prob:
                # 生成更自然的随机方向
                angle = random.uniform(0, 2 * 3.14159)
                self.move_direction = [math.cos(angle), math.sin(angle)]
                # 归一化方向向量
                magnitude = math.sqrt(self.move_direction[0]**2 + self.move_direction[1]**2)
                if magnitude > 0:
                    self.move_direction[0] /= magnitude
                    self.move_direction[1] /= magnitude
            
            # 基于缓动函数的平滑移动算法
            # 使用线性缓动，确保移动速度变化自然流畅
            smooth_factor = 0.1
            target_x = new_x
            target_y = new_y
            smooth_x = current_pos.x() + (target_x - current_pos.x()) * smooth_factor
            smooth_y = current_pos.y() + (target_y - current_pos.y()) * smooth_factor
            
            # 移动宠物
            self.move(int(smooth_x), int(smooth_y))
            
            # 定期更新屏幕几何信息（防止屏幕分辨率变化）
            if random.random() < 0.001:  # 0.1%的概率更新
                from PyQt5.QtWidgets import QDesktopWidget
                self.screen_geometry = QDesktopWidget().screenGeometry()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"自由移动错误: {e}")
    
    # ============================================
    # 手势控制功能
    # ============================================
    
    def _connect_gesture_signals(self):
        """连接手势控制信号"""
        if hasattr(self, 'input_manager'):
            self.input_manager.double_click.connect(self._on_double_click)
    
    def _on_double_click(self):
        """双击 - 自由落体"""
        if self.is_action_locked:
            return
        
        try:
            self.is_action_locked = True
            
            from PyQt5.QtWidgets import QDesktopWidget
            screen = QDesktopWidget().screenGeometry()
            screen_bottom = screen.height() - self.height()
            
            # 计算落体轨迹
            gravity = self.config.getGestureConfig("gravity", 9.8) * 0.5
            trajectory = PhysicsEngine.calculate_free_fall(
                self.pos(), screen_bottom, gravity
            )
            
            if trajectory:
                self.animation_player.move_along_trajectory(trajectory, 10)
            
            # 等待落体完成后弹跳
            from PyQt5.QtCore import QTimer
            fall_time = len(trajectory) * 10 if trajectory else 500
            QTimer.singleShot(fall_time + 100, self._do_bounce)
            
            # 减少能量值（原好感度功能整合到能量值）
            self.updateEnergy(-1)
            
        except Exception as e:
            logger.error(f"自由落体错误: {e}")
            self.is_action_locked = False
    
    def _do_bounce(self):
        """执行弹跳"""
        try:
            bounce_count = self.config.getGestureConfig("bounce_count", 2)
            gravity = self.config.getGestureConfig("gravity", 9.8) * 0.3
            
            trajectory = PhysicsEngine.calculate_bounce_trajectory(
                self.pos(), 50, gravity, bounce_count
            )
            
            if trajectory:
                self.animation_player.move_along_trajectory(trajectory, 15)
            
            # 解锁
            from PyQt5.QtCore import QTimer
            bounce_time = len(trajectory) * 15 if trajectory else 300
            QTimer.singleShot(bounce_time + 100, self._unlock_action)
            
        except Exception as e:
            logger.error(f"弹跳错误: {e}")
            self.is_action_locked = False
    
    def _unlock_action(self):
        """解锁动作"""
        self.is_action_locked = False
        
        # 确保窗口状态正常
        self.setWindowOpacity(1.0)
        self.show()
        
        # 恢复待机动画
        self.behavior.checkInitialGif()

def isFirstRun():
    """检查是否是首次运行
    
    Returns:
        bool: 是否是首次运行
    """
    import os
    import platform
    
    # 获取配置目录
    if platform.system() == "Windows":
        config_dir = os.path.join(os.environ.get("APPDATA", ""), "MalteseDesktopPet")
    elif platform.system() == "Darwin":  # macOS
        config_dir = os.path.join(os.path.expanduser("~"), "Library", "Application Support", "MalteseDesktopPet")
    else:  # Linux
        config_dir = os.path.join(os.path.expanduser("~"), ".config", "maltese_desktop_pet")
    
    # 检查是否存在配置文件
    config_file = os.path.join(config_dir, "config.json")
    return not os.path.exists(config_file)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    
    # 检查是否是首次运行
    if isFirstRun():
        # 显示设置向导
        config = Config(BASE_DIR)
        wizard = SetupWizard(config)
        if wizard.exec_() == SetupWizard.Accepted:
            # 设置向导完成，启动应用
            pet = DesktopPet()
            sys.exit(app.exec_())
    else:
        # 不是首次运行，直接启动应用
        pet = DesktopPet()
        sys.exit(app.exec_())