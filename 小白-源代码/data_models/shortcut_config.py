"""
快捷入口配置管理
"""


class ShortcutConfig:
    """
    快捷入口配置管理器
    """
    def __init__(self, config):
        self.config = config
        self._load_shortcuts()
    
    def _load_shortcuts(self):
        """加载快捷入口配置"""
        self.shortcuts = self.config.get("quick_shortcuts", [
            {"id": "basic_settings", "name": "基础设置", "visible": True, "order": 0},
            {"id": "feature_select", "name": "功能选择", "visible": True, "order": 1},
            {"id": "games", "name": "休闲游戏", "visible": True, "order": 2}
        ])
    
    def save(self):
        """保存配置"""
        self.config.set("quick_shortcuts", self.shortcuts)
    
    def get_visible_shortcuts(self):
        """获取可见的快捷入口"""
        visible = [s for s in self.shortcuts if s.get("visible", True)]
        return sorted(visible, key=lambda x: x.get("order", 0))
    
    def set_visible(self, shortcut_id: str, visible: bool):
        """设置是否可见"""
        for shortcut in self.shortcuts:
            if shortcut["id"] == shortcut_id:
                shortcut["visible"] = visible
                break
        self.save()
    
    def reorder(self, new_order: list):
        """重新排序"""
        for i, shortcut_id in enumerate(new_order):
            for shortcut in self.shortcuts:
                if shortcut["id"] == shortcut_id:
                    shortcut["order"] = i
                    break
        self.save()
    
    def add(self, shortcut_id: str, name: str):
        """添加快捷入口"""
        if not any(s["id"] == shortcut_id for s in self.shortcuts):
            self.shortcuts.append({
                "id": shortcut_id,
                "name": name,
                "visible": True,
                "order": len(self.shortcuts)
            })
            self.save()
    
    def remove(self, shortcut_id: str):
        """移除快捷入口"""
        self.shortcuts = [s for s in self.shortcuts if s["id"] != shortcut_id]
        self.save()
