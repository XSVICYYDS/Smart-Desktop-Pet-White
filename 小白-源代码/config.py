import os
import json
import platform
from PyQt5.QtWidgets import QMessageBox

class Config:
    """配置类
    
    负责管理应用的配置项，包括读取和写入配置文件
    """
    def __init__(self, base_dir):
        """初始化配置
        
        Args:
            base_dir: 应用基础目录
        """
        self.base_dir = base_dir
        self.config_file = self.getConfigFilePath()
        self.default_config = {
            "pet_size": {
                "width": 200,
                "height": 200
            },
            "behavior_frequency": {
                "bored_time": 60 * 60 * 1000,  # 60分钟
                "working_interval": 3 * 60 * 1000,  # 3分钟
                "hour_alert": True
            },
            "appearance": {
                "show_stats_bar": True,
                "window_opacity": 1.0
            },
            "menu_config": {
                "max_display_count": 3,  # 菜单最大显示数量（3-5）
                "version": 1.0  # 配置版本号
            },
            "gesture_control": {
                "move_speed": 150,  # WSAD移动速度 (像素/秒)
                "jump_height_ratio": 1.5,  # 跳跃高度比例
                "gravity": 9.8,  # 重力加速度
                "ejection_ratio": 0.5,  # 弹射力度比例
                "bounce_count": 2,  # 弹跳次数
                "return_min_distance": 10,  # 触发返回的最小拖动距离
                "ejection_min_distance": 20,  # 触发弹射的最小拖动距离
                "return_duration_min": 1000,  # 返回最短时间 (ms)
                "return_duration_max": 3000  # 返回最长时间 (ms)
            },
            "system": {
                "auto_start": False
            },
            # 用户信息配置
            "user_profile": {
                "username": "小白用户",
                "email": "",
                "phone": "",
                "avatar": "",
                "bio": "",
                "status": "active"
            },
            # 账户安全配置
            "account_security": {
                "password_hash": "",
                "last_password_change": "",
                "remember_me": False,
                "remember_duration": 7
            },
            # 通知偏好配置
            "notification_preferences": {
                "system_notifications": True,
                "business_notifications": True,
                "marketing_notifications": False
            },
            # 快捷入口配置
            "quick_shortcuts": [
                {"id": "basic_settings", "name": "基础设置", "visible": True, "order": 0},
                {"id": "feature_select", "name": "功能选择", "visible": True, "order": 1},
                {"id": "games", "name": "休闲游戏", "visible": True, "order": 2}
            ],
            # 使用记录配置
            "usage_history": {
                "operations": [],
                "config_changes": [],
                "stats": {
                    "total_uses": 0,
                    "feature_usage": {},
                    "login_history": []
                }
            }
        }
        self.config = self.loadConfig()
    
    def getConfigFilePath(self):
        """获取配置文件路径
        
        根据操作系统获取合适的配置文件路径
        
        Returns:
            str: 配置文件路径
        """
        system = platform.system()
        if system == "Windows":
            config_dir = os.path.join(os.environ.get("APPDATA", ""), "MalteseDesktopPet")
        elif system == "Darwin":  # macOS
            config_dir = os.path.join(os.path.expanduser("~"), "Library", "Application Support", "MalteseDesktopPet")
        else:  # Linux
            config_dir = os.path.join(os.path.expanduser("~"), ".config", "maltese_desktop_pet")
        
        # 确保配置目录存在
        if not os.path.exists(config_dir):
            os.makedirs(config_dir)
        
        return os.path.join(config_dir, "config.json")
    
    def loadConfig(self):
        """加载配置
        
        从配置文件加载配置，如果文件不存在则使用默认配置
        
        Returns:
            dict: 配置字典
        """
        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                config = json.load(f)
                # 合并默认配置和加载的配置，确保所有配置项都存在
                return self._mergeConfig(self.default_config, config)
        except (FileNotFoundError, json.JSONDecodeError):
            # 配置文件不存在或格式错误，使用默认配置
            self.saveConfig(self.default_config)
            return self.default_config
    
    def saveConfig(self, config):
        """保存配置
        
        将配置保存到配置文件
        
        Args:
            config: 配置字典
        """
        try:
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=4, ensure_ascii=False)
        except Exception as e:
            QMessageBox.warning(None, "错误", f"保存配置失败: {e}")
    
    def _mergeConfig(self, default, user):
        """合并配置
        
        将用户配置合并到默认配置中，确保所有配置项都存在
        
        Args:
            default: 默认配置字典
            user: 用户配置字典
        
        Returns:
            dict: 合并后的配置字典
        """
        merged = default.copy()
        for key, value in user.items():
            if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
                merged[key] = self._mergeConfig(merged[key], value)
            else:
                merged[key] = value
        return merged
    
    def get(self, key, default=None):
        """获取配置项
        
        Args:
            key: 配置项键，支持嵌套键，如 "pet_size.width"
            default: 默认值
        
        Returns:
            配置项值或默认值
        """
        keys = key.split(".")
        value = self.config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value
    
    def set(self, key, value):
        """设置配置项
        
        Args:
            key: 配置项键，支持嵌套键，如 "pet_size.width"
            value: 配置项值
        """
        keys = key.split(".")
        config = self.config
        for k in keys[:-1]:
            if k not in config or not isinstance(config[k], dict):
                config[k] = {}
            config = config[k]
        config[keys[-1]] = value
        self.saveConfig(self.config)
    
    def getPetSize(self):
        """获取宠物大小
        
        Returns:
            tuple: (宽度, 高度)
        """
        return (
            self.get("pet_size.width", 200),
            self.get("pet_size.height", 200)
        )
    
    def getBoredTime(self):
        """获取无聊时间阈值
        
        Returns:
            int: 无聊时间阈值（毫秒）
        """
        return self.get("behavior_frequency.bored_time", 60 * 60 * 1000)
    
    def getWorkingInterval(self):
        """获取工作时间间隔
        
        Returns:
            int: 工作时间间隔（毫秒）
        """
        return self.get("behavior_frequency.working_interval", 3 * 60 * 1000)
    
    def isHourAlertEnabled(self):
        """检查是否启用小时提醒
        
        Returns:
            bool: 是否启用小时提醒
        """
        return self.get("behavior_frequency.hour_alert", True)
    
    def isStatsBarVisible(self):
        """检查状态栏是否可见
        
        Returns:
            bool: 状态栏是否可见
        """
        return self.get("appearance.show_stats_bar", True)
    
    def getWindowOpacity(self):
        """获取窗口透明度
        
        Returns:
            float: 窗口透明度（0.0-1.0）
        """
        return self.get("appearance.window_opacity", 1.0)
    
    def isAutoStartEnabled(self):
        """检查是否启用开机自启动
        
        Returns:
            bool: 是否启用开机自启动
        """
        return self.get("system.auto_start", False)
    
    def setAutoStart(self, enabled):
        """设置开机自启动
        
        Args:
            enabled: 是否启用开机自启动
        """
        self.set("system.auto_start", enabled)
    
    def getMenuMaxDisplayCount(self):
        """获取菜单最大显示数量
        
        Returns:
            int: 菜单最大显示数量（3-5）
        """
        count = self.get("menu_config.max_display_count", 3)
        # 确保值在3-5范围内
        if not isinstance(count, int):
            return 3
        if count < 3:
            return 3
        if count > 5:
            return 5
        return count
    
    def setMenuMaxDisplayCount(self, count):
        """设置菜单最大显示数量
        
        Args:
            count: 显示数量，必须在3-5范围内
        """
        # 验证输入
        if not isinstance(count, int):
            raise ValueError("显示数量必须是整数")
        if count < 3 or count > 5:
            raise ValueError("显示数量必须在3到5之间")
        self.set("menu_config.max_display_count", count)
    
    def validateMenuConfig(self, config):
        """验证菜单配置的有效性
        
        Args:
            config: 待验证的配置字典
            
        Returns:
            bool: 配置是否有效
        """
        try:
            if "menu_config" not in config:
                return False
            menu_config = config["menu_config"]
            count = menu_config.get("max_display_count")
            if not isinstance(count, int):
                return False
            if count < 3 or count > 5:
                return False
            return True
        except Exception:
            return False
    
    def resetMenuConfig(self):
        """重置菜单配置为默认值"""
        self.set("menu_config.max_display_count", 3)
        self.set("menu_config.version", 1.0)
    
    def getGestureConfig(self, key, default=None):
        """获取手势控制配置
        
        Args:
            key: 配置键
            default: 默认值
            
        Returns:
            配置值
        """
        return self.get(f"gesture_control.{key}", default)
    
    def setGestureConfig(self, key, value):
        """设置手势控制配置
        
        Args:
            key: 配置键
            value: 配置值
        """
        self.set(f"gesture_control.{key}", value)
