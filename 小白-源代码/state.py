import os
import json
import platform
from PyQt5.QtWidgets import QMessageBox

class StateManager:
    """状态管理类（多用户档案隔离版）

    多人共用一台电脑时，每个用户（user_id / profile_id）有独立的 state.json，
    避免 A 的快乐值、饱食度等被 B 登录后覆盖。
    """
    DEFAULT_PROFILE = "default"

    def __init__(self, base_dir, profile_id=None):
        """初始化状态管理

        Args:
            base_dir: 应用基础目录
            profile_id: 用户档案 ID（None 时使用 DEFAULT_PROFILE，后续调用 switch_profile 可切换）
        """
        self.base_dir = base_dir
        self.profile_id = profile_id or self.DEFAULT_PROFILE
        self._shared_root_dir = self._getSharedRootDir()
        self.state_file = self._resolveStateFilePath(self.profile_id)
        self.default_state = {
            "happiness": 80,
            "energy": 80,
            "fullness": 80,
            "favor": 80,
            "is_dead": False,
            "last_hour": -1
        }
        self.state = self.loadState()

    def _safeProfileDirName(self, profile_id: str) -> str:
        """把 profile_id 转成安全的目录名（user_id / 外部传入均可）"""
        if not profile_id:
            return self.DEFAULT_PROFILE
        return "".join(c if c.isalnum() or c in "-_" else "_" for c in str(profile_id)) or self.DEFAULT_PROFILE

    def _getSharedRootDir(self) -> str:
        """根据操作系统返回所有 profile 共享的根目录"""
        system = platform.system()
        if system == "Windows":
            root = os.path.join(os.environ.get("APPDATA", ""), "MalteseDesktopPet")
        elif system == "Darwin":  # macOS
            root = os.path.join(os.path.expanduser("~"), "Library", "Application Support", "MalteseDesktopPet")
        else:  # Linux
            root = os.path.join(os.path.expanduser("~"), ".config", "maltese_desktop_pet")
        os.makedirs(root, exist_ok=True)
        return root

    def _resolveStateFilePath(self, profile_id: str) -> str:
        """根据 profile_id 生成独立的 state.json 路径：<root>/profiles/<profile>/state.json"""
        safe = self._safeProfileDirName(profile_id)
        profile_dir = os.path.join(self._shared_root_dir, "profiles", safe)
        os.makedirs(profile_dir, exist_ok=True)
        return os.path.join(profile_dir, "state.json")

    def switch_profile(self, profile_id):
        """运行时切换到另一个用户档案（A 登了 B 来用，立即加载 B 的状态，不再互相覆盖）"""
        next_profile = profile_id or self.DEFAULT_PROFILE
        if self._safeProfileDirName(next_profile) == self._safeProfileDirName(self.profile_id):
            return
        self.profile_id = next_profile
        self.state_file = self._resolveStateFilePath(self.profile_id)
        self.state = self.loadState()
        logger_msg = f"[StateManager] 已切换状态档案到 profile={self._safeProfileDirName(self.profile_id)}"
        try:
            import logging as _logging
            _logging.getLogger('MalteseDesktopPet').info(logger_msg)
        except Exception:
            pass

    def getStateFilePath(self):
        """兼容老代码：返回当前 profile 的 state.json 路径"""
        return self.state_file
    
    def loadState(self):
        """加载状态
        
        从状态文件加载状态，如果文件不存在则使用默认状态
        
        Returns:
            dict: 状态字典
        """
        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                state = json.load(f)
                # 合并默认状态和加载的状态，确保所有状态项都存在
                return self._mergeState(self.default_state, state)
        except (FileNotFoundError, json.JSONDecodeError):
            # 状态文件不存在或格式错误，使用默认状态
            self.saveState(self.default_state)
            return self.default_state
    
    def saveState(self, state):
        """保存状态
        
        将状态保存到状态文件
        
        Args:
            state: 状态字典
        """
        try:
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=4, ensure_ascii=False)
        except Exception as e:
            QMessageBox.warning(None, "错误", f"保存状态失败: {e}")
    
    def _mergeState(self, default, user):
        """合并状态
        
        将用户状态合并到默认状态中，确保所有状态项都存在
        
        Args:
            default: 默认状态字典
            user: 用户状态字典
        
        Returns:
            dict: 合并后的状态字典
        """
        merged = default.copy()
        for key, value in user.items():
            merged[key] = value
        return merged
    
    def getHappiness(self):
        """获取快乐值
        
        Returns:
            int: 快乐值
        """
        return self.state.get("happiness", 80)
    
    def setHappiness(self, value):
        """设置快乐值
        
        Args:
            value: 快乐值
        """
        self.state["happiness"] = value
        self.saveState(self.state)
    
    def getEnergy(self):
        """获取能量值
        
        Returns:
            int: 能量值
        """
        return self.state.get("energy", 80)
    
    def setEnergy(self, value):
        """设置能量值
        
        Args:
            value: 能量值
        """
        self.state["energy"] = value
        self.saveState(self.state)
    
    def isDead(self):
        """检查宠物是否死亡
        
        Returns:
            bool: 是否死亡
        """
        return self.state.get("is_dead", False)
    
    def setDead(self, value):
        """设置宠物死亡状态
        
        Args:
            value: 是否死亡
        """
        self.state["is_dead"] = value
        self.saveState(self.state)
    
    def getLastHour(self):
        """获取最后一次小时提醒的小时数
        
        Returns:
            int: 最后一次小时提醒的小时数
        """
        return self.state.get("last_hour", -1)
    
    def setLastHour(self, value):
        """设置最后一次小时提醒的小时数
        
        Args:
            value: 最后一次小时提醒的小时数
        """
        self.state["last_hour"] = value
        self.saveState(self.state)
    
    def getFullness(self):
        """获取饱食度
        
        Returns:
            int: 饱食度
        """
        return self.state.get("fullness", 80)
    
    def setFullness(self, value):
        """设置饱食度
        
        Args:
            value: 饱食度
        """
        self.state["fullness"] = value
        self.saveState(self.state)
    
    def getFavor(self):
        """获取好感度
        
        Returns:
            int: 好感度
        """
        return self.state.get("favor", 80)
    
    def setFavor(self, value):
        """设置好感度
        
        Args:
            value: 好感度
        """
        self.state["favor"] = value
        self.saveState(self.state)
    
    def updateState(self, happiness=None, energy=None, fullness=None, favor=None, is_dead=None, last_hour=None):
        """更新状态
        
        Args:
            happiness: 快乐值（可选）
            energy: 能量值（可选）
            fullness: 饱食度（可选）
            favor: 好感度（可选）
            is_dead: 是否死亡（可选）
            last_hour: 最后一次小时提醒的小时数（可选）
        """
        if happiness is not None:
            self.state["happiness"] = happiness
        if energy is not None:
            self.state["energy"] = energy
        if fullness is not None:
            self.state["fullness"] = fullness
        if favor is not None:
            self.state["favor"] = favor
        if is_dead is not None:
            self.state["is_dead"] = is_dead
        if last_hour is not None:
            self.state["last_hour"] = last_hour
        self.saveState(self.state)
    
    def resetState(self):
        """重置状态
        
        将状态重置为默认状态
        """
        self.state = self.default_state.copy()
        self.saveState(self.state)
