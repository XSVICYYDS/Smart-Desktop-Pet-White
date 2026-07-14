"""
使用记录日志 - 记录操作历史和统计
"""

from datetime import datetime
import json


class UsageLogger:
    """
    使用记录日志器
    """
    def __init__(self, config):
        self.config = config
        self._load_history()
    
    def _load_history(self):
        """加载历史数据"""
        self.history = self.config.get("usage_history", {
            "operations": [],
            "config_changes": [],
            "stats": {
                "total_uses": 0,
                "feature_usage": {},
                "login_history": []
            }
        })
    
    def save(self):
        """保存历史数据"""
        self.config.set("usage_history", self.history)
    
    def log_operation(self, operation: str, details: dict = None):
        """记录操作"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "details": details or {}
        }
        self.history["operations"].insert(0, entry)
        
        # 只保留最近100条记录
        if len(self.history["operations"]) > 100:
            self.history["operations"] = self.history["operations"][:100]
        
        # 更新统计
        self.history["stats"]["total_uses"] += 1
        
        self.save()
    
    def log_config_change(self, key: str, old_value, new_value):
        """记录配置变更"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "key": key,
            "old_value": old_value,
            "new_value": new_value
        }
        self.history["config_changes"].insert(0, entry)
        
        # 只保留最近50条记录
        if len(self.history["config_changes"]) > 50:
            self.history["config_changes"] = self.history["config_changes"][:50]
        
        self.save()
    
    def log_feature_usage(self, feature_id: str):
        """记录功能使用"""
        usage = self.history["stats"]["feature_usage"]
        if feature_id not in usage:
            usage[feature_id] = 0
        usage[feature_id] += 1
        self.save()
    
    def get_operations(self, keyword: str = None, start_date: datetime = None, end_date: datetime = None):
        """获取操作历史"""
        operations = self.history["operations"]
        
        if keyword:
            operations = [op for op in operations if keyword.lower() in op["operation"].lower()]
        
        if start_date or end_date:
            filtered = []
            for op in operations:
                try:
                    op_date = datetime.fromisoformat(op["timestamp"])
                    if start_date and op_date < start_date:
                        continue
                    if end_date and op_date > end_date:
                        continue
                    filtered.append(op)
                except:
                    filtered.append(op)
            operations = filtered
        
        return operations
    
    def get_config_changes(self):
        """获取配置变更记录"""
        return self.history["config_changes"]
    
    def get_stats(self):
        """获取使用统计"""
        return self.history["stats"]
