import time
from PyQt5.QtCore import Qt, QTimer, QObject, pyqtSignal

class InputManager(QObject):
    """输入管理器
    
    统一管理键盘和鼠标输入，实现双击检测等功能
    """
    
    # 信号定义
    double_click = pyqtSignal()
    
    def __init__(self, parent=None):
        """初始化输入管理器
        
        Args:
            parent: 父对象
        """
        super().__init__(parent)
        
        # 冷却机制
        self.last_action_time = {}
        self.action_cooldown = {
            'double_click': 300,
        }
        
        # 点击检测
        self.click_times = []
        self.double_click_window = 300  # 300ms
        
    def check_cooldown(self, action_name):
        """检查操作是否在冷却中
        
        Args:
            action_name: 操作名称
            
        Returns:
            bool: 是否可以执行
        """
        now = time.time() * 1000
        if action_name not in self.last_action_time:
            self.last_action_time[action_name] = 0
        if now - self.last_action_time[action_name] < self.action_cooldown.get(action_name, 300):
            return False
        self.last_action_time[action_name] = now
        return True
    
    def on_key_press(self, key):
        """处理键盘按下事件
        
        Args:
            key: 键盘按键
        """
        pass
    
    def on_key_release(self, key):
        """处理键盘释放事件
        
        Args:
            key: 键盘按键
        """
        pass
    
    def on_mouse_press(self, pos, button):
        """处理鼠标按下事件
        
        Args:
            pos: 鼠标位置
            button: 鼠标按钮
        """
        if button == Qt.LeftButton:
            now = time.time() * 1000
            self.click_times.append(now)
            
            # 只保留最近的点击时间
            if len(self.click_times) > 2:
                self.click_times.pop(0)
            
            # 检测双击
            if len(self.click_times) >= 2:
                if now - self.click_times[-2] <= self.double_click_window:
                    if self.check_cooldown('double_click'):
                        self.double_click.emit()
                        self.click_times = []  # 重置点击记录
    
    def on_mouse_move(self, pos):
        """处理鼠标移动事件
        
        Args:
            pos: 鼠标位置
        """
        pass
    
    def on_mouse_release(self, pos, button):
        """处理鼠标释放事件
        
        Args:
            pos: 鼠标位置
            button: 鼠标按钮
        """
        pass
