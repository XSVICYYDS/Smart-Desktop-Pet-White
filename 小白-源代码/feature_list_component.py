import os
import json
import datetime
from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QListWidget, QListWidgetItem,
                             QCheckBox, QScrollArea, QFrame, QGraphicsDropShadowEffect,
                             QApplication, QMessageBox)
from PyQt5.QtCore import Qt, QSize, QPropertyAnimation, QRect, pyqtSignal, QTimer, QEasingCurve
from PyQt5.QtGui import QColor, QPalette, QFont, QIcon, QBrush, QPainter
from PyQt5.QtWidgets import QStyleOption, QStyle

class FeatureItem(QFrame):
    """功能项组件
    
    用于显示单个功能项的卡片组件,支持选中状态和动画效果
    """
    clicked = pyqtSignal(str)
    selected = pyqtSignal(str, bool)
    
    def __init__(self, feature_id, feature_name, feature_desc="", icon_path=None, parent=None):
        """初始化功能项组件
        
        Args:
            feature_id: 功能ID
            feature_name: 功能名称
            feature_desc: 功能描述
            icon_path: 图标路径(可选)
            parent: 父窗口对象
        """
        super().__init__(parent)
        self.feature_id = feature_id
        self.feature_name = feature_name
        self.feature_desc = feature_desc
        self.icon_path = icon_path
        self._is_selected = False
        self._hovered = False
        
        self.initUI()
        self.setupAnimations()
    
    def initUI(self):
        """初始化UI"""
        self.setFrameShape(QFrame.StyledPanel)
        self.setFrameShadow(QFrame.Raised)
        self.setFixedHeight(70)
        self.setCursor(Qt.PointingHandCursor)
        
        self.setStyleSheet("""
            FeatureItem {
                background-color: white;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                margin: 5px;
            }
            FeatureItem:hover {
                border: 2px solid #FF69B4;
                background-color: #fff5f8;
            }
            FeatureItem[selected="true"] {
                border: 2px solid #FF69B4;
                background-color: #ffe6ee;
            }
        """)
        
        main_layout = QHBoxLayout(self)
        main_layout.setContentsMargins(15, 10, 15, 10)
        main_layout.setSpacing(15)
        
        self.checkbox = QCheckBox()
        self.checkbox.setFixedWidth(30)
        self.checkbox.stateChanged.connect(self.onCheckboxChanged)
        main_layout.addWidget(self.checkbox)
        
        icon_label = QLabel()
        icon_label.setFixedSize(40, 40)
        if self.icon_path and os.path.exists(self.icon_path):
            from PyQt5.QtGui import QPixmap
            pixmap = QPixmap(self.icon_path).scaled(40, 40, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            icon_label.setPixmap(pixmap)
        else:
            icon_label.setText("🎯")
            icon_label.setAlignment(Qt.AlignCenter)
            icon_label.setStyleSheet("font-size: 24px;")
        main_layout.addWidget(icon_label)
        
        text_layout = QVBoxLayout()
        text_layout.setSpacing(3)
        
        self.name_label = QLabel(self.feature_name)
        self.name_label.setFont(QFont("Microsoft YaHei", 11, QFont.Bold))
        self.name_label.setStyleSheet("color: #333;")
        text_layout.addWidget(self.name_label)
        
        if self.feature_desc:
            self.desc_label = QLabel(self.feature_desc)
            self.desc_label.setFont(QFont("Microsoft YaHei", 9))
            self.desc_label.setStyleSheet("color: #888;")
            self.desc_label.setWordWrap(True)
            text_layout.addWidget(self.desc_label)
        
        main_layout.addLayout(text_layout)
        
        self.status_label = QLabel()
        self.status_label.setFixedWidth(80)
        self.status_label.setAlignment(Qt.AlignCenter)
        self.status_label.setFont(QFont("Microsoft YaHei", 9))
        main_layout.addWidget(self.status_label)
        
        main_layout.addStretch()
    
    def setupAnimations(self):
        """设置动画效果"""
        self.shadow_effect = QGraphicsDropShadowEffect(self)
        self.shadow_effect.setBlurRadius(10)
        self.shadow_effect.setColor(QColor(0, 0, 0, 50))
        self.shadow_effect.setOffset(2, 2)
        self.setGraphicsEffect(self.shadow_effect)
        
        self.animation = QPropertyAnimation(self, b"geometry")
        self.animation.setDuration(200)
        self.animation.setEasingCurve(QEasingCurve.OutCubic)
    
    def onCheckboxChanged(self, state):
        """复选框状态改变处理
        
        Args:
            state: 复选框状态
        """
        self._is_selected = (state == Qt.Checked)
        self.setSelected(self._is_selected)
        self.selected.emit(self.feature_id, self._is_selected)
    
    def setSelected(self, selected):
        """设置选中状态
        
        Args:
            selected: 是否选中
        """
        self._is_selected = selected
        self.checkbox.setChecked(selected)
        self.setProperty("selected", "true" if selected else "false")
        self.style().unpolish(self)
        self.style().polish(self)
        
        if selected:
            self.status_label.setText("✓ 已选择")
            self.status_label.setStyleSheet("color: #FF69B4; font-weight: bold;")
        else:
            self.status_label.setText("")
            self.status_label.setStyleSheet("")
    
    def isSelected(self):
        """获取选中状态
        
        Returns:
            bool: 是否选中
        """
        return self._is_selected
    
    def mousePressEvent(self, event):
        """鼠标按下事件
        
        Args:
            event: 鼠标事件
        """
        if event.button() == Qt.LeftButton:
            self.animateClick()
            self.clicked.emit(self.feature_id)
        super().mousePressEvent(event)
    
    def animateClick(self):
        """点击动画"""
        self.animation.stop()
        start_geo = self.geometry()
        
        shrink = QRect(start_geo.x() + 3, start_geo.y() + 3, 
                      start_geo.width() - 6, start_geo.height() - 6)
        expand = start_geo
        
        self.animation.setKeyValueAt(0, expand)
        self.animation.setKeyValueAt(0.5, shrink)
        self.animation.setKeyValueAt(1, expand)
        self.animation.start()
    
    def enterEvent(self, event):
        """鼠标进入事件"""
        self._hovered = True
        self.shadow_effect.setBlurRadius(15)
        super().enterEvent(event)
    
    def leaveEvent(self, event):
        """鼠标离开事件"""
        self._hovered = False
        self.shadow_effect.setBlurRadius(10)
        super().leaveEvent(event)


class FeatureSelectionList(QWidget):
    """功能选择列表组件
    
    完整的交互式列表组件,支持选择、智能推荐和动画效果
    """
    selectionChanged = pyqtSignal(list)
    
    def __init__(self, base_dir, config, parent=None):
        """初始化功能选择列表
        
        Args:
            base_dir: 应用基础目录
            config: 配置对象
            parent: 父窗口对象
        """
        super().__init__(parent)
        self.base_dir = base_dir
        self.config = config
        self.selection_manager = SelectionManager(base_dir, config)
        self.recommendation_engine = RecommendationEngine(self.selection_manager)
        
        self.feature_items = {}
        self.initUI()
        self.loadFeatures()
        self.applySavedSelections()
    
    def initUI(self):
        """初始化UI"""
        self.setFixedHeight(450)
        
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(10)
        
        header_layout = QHBoxLayout()
        header_layout.setSpacing(10)
        
        title_label = QLabel("✨ 功能选择")
        title_label.setFont(QFont("Microsoft YaHei", 14, QFont.Bold))
        title_label.setStyleSheet("color: #FF69B4;")
        header_layout.addWidget(title_label)
        
        header_layout.addStretch()
        
        self.select_all_btn = QPushButton("全选")
        self.select_all_btn.setFixedSize(70, 30)
        self.select_all_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 5px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #FF1493;
            }
        """)
        self.select_all_btn.clicked.connect(self.selectAll)
        header_layout.addWidget(self.select_all_btn)
        
        self.deselect_all_btn = QPushButton("取消")
        self.deselect_all_btn.setFixedSize(70, 30)
        self.deselect_all_btn.setStyleSheet("""
            QPushButton {
                background-color: #f0f0f0;
                color: #666;
                border: none;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #e0e0e0;
            }
        """)
        self.deselect_all_btn.clicked.connect(self.deselectAll)
        header_layout.addWidget(self.deselect_all_btn)
        
        main_layout.addLayout(header_layout)
        
        info_layout = QHBoxLayout()
        self.info_label = QLabel()
        self.info_label.setFont(QFont("Microsoft YaHei", 9))
        self.info_label.setStyleSheet("color: #888;")
        info_layout.addWidget(self.info_label)
        info_layout.addStretch()
        
        self.recommend_btn = QPushButton("🤖 智能推荐")
        self.recommend_btn.setFixedSize(100, 28)
        self.recommend_btn.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        self.recommend_btn.clicked.connect(self.applySmartRecommendation)
        info_layout.addWidget(self.recommend_btn)
        
        main_layout.addLayout(info_layout)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        scroll.setStyleSheet("""
            QScrollArea {
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                background-color: #fafafa;
            }
            QScrollBar:vertical {
                border: none;
                background: #f0f0f0;
                width: 10px;
                margin: 0px;
            }
            QScrollBar::handle:vertical {
                background: #ccc;
                border-radius: 5px;
                min-height: 20px;
            }
            QScrollBar::handle:hover {
                background: #bbb;
            }
        """)
        
        self.list_widget = QWidget()
        self.list_layout = QVBoxLayout(self.list_widget)
        self.list_layout.setContentsMargins(5, 5, 5, 5)
        self.list_layout.setSpacing(5)
        self.list_layout.addStretch()
        
        scroll.setWidget(self.list_widget)
        main_layout.addWidget(scroll)
        
        footer_layout = QHBoxLayout()
        footer_layout.addStretch()
        
        self.save_btn = QPushButton("💾 保存选择")
        self.save_btn.setFixedSize(120, 32)
        self.save_btn.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 5px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        self.save_btn.clicked.connect(self.saveSelections)
        footer_layout.addWidget(self.save_btn)
        
        main_layout.addLayout(footer_layout)
        
        self.updateInfo()
    
    def loadFeatures(self):
        """加载功能项"""
        features = [
            ("互动", [
                ("stick", "贴贴", "和宠物贴贴"),
                ("call", "拍一拍", "拍拍宠物"),
                ("exercise", "锻炼", "和宠物一起锻炼"),
                ("charge", "充电", "给宠物充电"),
                ("cake", "投喂小白", "给宠物喂食"),
                ("baji", "吧唧", "亲亲宠物"),
                ("baji2", "鸡毛丸子", "鸡毛丸子游戏"),
                ("appear", "随机出现", "随机位置出现"),
                ("walkDog", "遛小鸡毛", "遛宠物"),
                ("eating", "吃饭", "宠物吃饭"),
                ("megic", "魔法", "魔法效果"),
                ("biking", "骑自行车", "骑自行车"),
                ("loving", "爱心", "爱心效果"),
                ("happynewyear", "新年快乐", "新年祝福"),
                ("jumping", "跳跃", "跳跃动作"),
                ("kungfu", "功夫", "功夫表演"),
                ("throwTantrum", "撒娇", "宠物撒娇"),
                ("yawn", "打哈欠", "打哈欠动画"),
                ("stretch", "伸懒腰", "伸懒腰动画"),
                ("dance", "跳舞", "跳舞表演"),
                ("sing", "唱歌", "唱歌表演"),
                ("spin", "转圈圈", "转圈圈表演"),
            ]),
            ("工具", [
                ("screenshot", "截屏", "截取屏幕"),
                ("openCmd", "打开cmd", "打开命令提示符"),
                ("openTaskManager", "任务管理器", "打开任务管理器"),
                ("openFileExplorer", "文件资源管理器", "打开资源管理器"),
            ]),
            ("常用应用", [
                ("openMyComputer", "我的电脑", "打开我的电脑"),
                ("openPaint", "画图工具", "打开画图"),
                ("openNotepad", "记事本", "打开记事本"),
                ("openCalculator", "计算器", "打开计算器"),
                ("openSnippingTool", "截图工具", "打开截图工具"),
                ("openDiskCleanup", "磁盘清理", "打开磁盘清理"),
                ("openControlPanel", "控制面板", "打开控制面板"),
                ("openRemoteDesktop", "远程桌面", "打开远程桌面"),
                ("openMagnifier", "放大镜", "打开放大镜"),
                ("openStickyNotes", "便签", "打开便签"),
                ("openAlarm", "闹钟", "打开闹钟"),
            ]),
            ("休闲小游戏", [
                ("snake", "贪吃蛇", "经典贪吃蛇游戏"),
                ("tetris", "俄罗斯方块", "俄罗斯方块游戏"),
                ("game2048", "2048", "2048益智游戏"),
                ("whackamole", "打地鼠", "打地鼠游戏"),
                ("minesweeper", "扫雷", "扫雷游戏"),
                ("tictactoe", "井字棋", "井字棋游戏"),
                ("sokoban", "推箱子", "推箱子游戏"),
                ("pong", "乒乓球", "乒乓球游戏"),
                ("tankbattle", "坦克大战", "坦克大战游戏"),
            ]),
        ]
        
        for category, items in features:
            category_label = QLabel(f"📁 {category}")
            category_label.setFont(QFont("Microsoft YaHei", 11, QFont.Bold))
            category_label.setStyleSheet("color: #333; margin: 10px 0 5px 0;")
            self.list_layout.addWidget(category_label)
            
            for feature_id, name, desc in items:
                item = FeatureItem(feature_id, name, desc)
                item.clicked.connect(self.onItemClicked)
                item.selected.connect(self.onItemSelected)
                self.list_layout.addWidget(item)
                self.feature_items[feature_id] = item
    
    def applySavedSelections(self):
        """应用保存的选择"""
        try:
            saved_selections = self.selection_manager.getSelections()
            for feature_id, selected in saved_selections.items():
                if feature_id in self.feature_items:
                    self.feature_items[feature_id].setSelected(selected)
        except Exception as e:
            print(f"应用保存选择失败: {e}")
    
    def onItemClicked(self, feature_id):
        """项被点击处理
        
        Args:
            feature_id: 功能ID
        """
        self.selection_manager.recordUsage(feature_id)
        self.updateInfo()
    
    def onItemSelected(self, feature_id, selected):
        """项选中状态改变处理
        
        Args:
            feature_id: 功能ID
            selected: 是否选中
        """
        self.updateInfo()
        self.emitSelectionChanged()
    
    def selectAll(self):
        """全选"""
        for item in self.feature_items.values():
            item.setSelected(True)
        self.updateInfo()
        self.emitSelectionChanged()
    
    def deselectAll(self):
        """取消全选"""
        for item in self.feature_items.values():
            item.setSelected(False)
        self.updateInfo()
        self.emitSelectionChanged()
    
    def applySmartRecommendation(self):
        """应用智能推荐"""
        try:
            recommended = self.recommendation_engine.getRecommendations()
            
            self.deselectAll()
            
            QTimer.singleShot(200, lambda: self._applyRecommendations(recommended))
            
            QMessageBox.information(
                self, 
                "智能推荐", 
                f"已为您推荐 {len(recommended)} 个常用功能！\n\n推荐依据:\n• 使用频率\n• 使用时间\n• 使用模式"
            )
        except Exception as e:
            QMessageBox.warning(self, "错误", f"智能推荐失败: {e}")
    
    def _applyRecommendations(self, recommended_ids):
        """应用推荐的选择
        
        Args:
            recommended_ids: 推荐的功能ID列表
        """
        for feature_id in recommended_ids:
            if feature_id in self.feature_items:
                self.feature_items[feature_id].setSelected(True)
        
        self.updateInfo()
        self.emitSelectionChanged()
    
    def updateInfo(self):
        """更新信息显示"""
        total = len(self.feature_items)
        selected = sum(1 for item in self.feature_items.values() if item.isSelected())
        self.info_label.setText(f"已选择: {selected}/{total} 个功能")
    
    def saveSelections(self):
        """保存选择"""
        try:
            selections = {fid: item.isSelected() for fid, item in self.feature_items.items()}
            self.selection_manager.saveSelections(selections)
            QMessageBox.information(self, "保存成功", "选择已保存!")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"保存失败: {e}")
    
    def emitSelectionChanged(self):
        """发送选择改变信号"""
        selections = [fid for fid, item in self.feature_items.items() if item.isSelected()]
        self.selectionChanged.emit(selections)
    
    def getSelections(self):
        """获取所有选择
        
        Returns:
            dict: 选择状态字典
        """
        return {fid: item.isSelected() for fid, item in self.feature_items.items()}


class SelectionManager:
    """选择管理器
    
    负责管理功能选择状态和使用历史记录
    """
    def __init__(self, base_dir, config):
        """初始化选择管理器
        
        Args:
            base_dir: 应用基础目录
            config: 配置对象
        """
        self.base_dir = base_dir
        self.config = config
        self.history_file = self._getHistoryFilePath()
        self.usage_history = self._loadHistory()
    
    def _getHistoryFilePath(self):
        """获取历史记录文件路径
        
        Returns:
            str: 历史记录文件路径
        """
        system = __import__('platform').system()
        if system == "Windows":
            data_dir = os.path.join(os.environ.get("APPDATA", ""), "MalteseDesktopPet")
        else:
            data_dir = os.path.join(os.path.expanduser("~"), ".maltese_desktop_pet")
        
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        
        return os.path.join(data_dir, "selection_history.json")
    
    def _loadHistory(self):
        """加载历史记录
        
        Returns:
            dict: 历史记录字典
        """
        try:
            if os.path.exists(self.history_file):
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"加载历史记录失败: {e}")
        
        return self._getDefaultHistory()
    
    def _getDefaultHistory(self):
        """获取默认历史记录
        
        Returns:
            dict: 默认历史记录
        """
        return {
            "selections": {},
            "usage": {},
            "last_updated": datetime.datetime.now().isoformat()
        }
    
    def saveSelections(self, selections):
        """保存选择状态
        
        Args:
            selections: 选择状态字典
        """
        try:
            self.usage_history["selections"] = selections
            self.usage_history["last_updated"] = datetime.datetime.now().isoformat()
            
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(self.usage_history, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"保存选择失败: {e}")
            raise
    
    def getSelections(self):
        """获取保存的选择
        
        Returns:
            dict: 选择状态字典
        """
        return self.usage_history.get("selections", {})
    
    def recordUsage(self, feature_id):
        """记录功能使用
        
        Args:
            feature_id: 功能ID
        """
        try:
            if "usage" not in self.usage_history:
                self.usage_history["usage"] = {}
            
            usage = self.usage_history["usage"]
            if feature_id not in usage:
                usage[feature_id] = {
                    "count": 0,
                    "last_used": None,
                    "hours": {}
                }
            
            usage[feature_id]["count"] += 1
            usage[feature_id]["last_used"] = datetime.datetime.now().isoformat()
            
            current_hour = datetime.datetime.now().hour
            hour_str = str(current_hour)
            if hour_str not in usage[feature_id]["hours"]:
                usage[feature_id]["hours"][hour_str] = 0
            usage[feature_id]["hours"][hour_str] += 1
            
            self._saveHistory()
        except Exception as e:
            print(f"记录使用失败: {e}")
    
    def _saveHistory(self):
        """保存历史记录"""
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(self.usage_history, f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"保存历史记录失败: {e}")
    
    def getUsageStats(self, feature_id=None):
        """获取使用统计
        
        Args:
            feature_id: 功能ID,如果为None则返回所有统计
        
        Returns:
            dict: 使用统计
        """
        if feature_id:
            return self.usage_history.get("usage", {}).get(feature_id, {})
        return self.usage_history.get("usage", {})
    
    def clearHistory(self):
        """清除历史记录"""
        try:
            self.usage_history = self._getDefaultHistory()
            self._saveHistory()
        except Exception as e:
            print(f"清除历史记录失败: {e}")
            raise


class RecommendationEngine:
    """推荐引擎
    
    基于使用历史和模式分析提供智能推荐
    """
    def __init__(self, selection_manager):
        """初始化推荐引擎
        
        Args:
            selection_manager: 选择管理器
        """
        self.selection_manager = selection_manager
    
    def getRecommendations(self, top_n=10):
        """获取推荐列表
        
        Args:
            top_n: 推荐数量
        
        Returns:
            list: 推荐的功能ID列表
        """
        try:
            scores = self._calculateScores()
            sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            recommendations = [fid for fid, score in sorted_scores[:top_n]]
            
            if not recommendations:
                recommendations = self._getDefaultRecommendations()
            
            return recommendations
        except Exception as e:
            print(f"获取推荐失败: {e}")
            return self._getDefaultRecommendations()
    
    def _calculateScores(self):
        """计算推荐分数
        
        Returns:
            dict: 功能ID到分数的映射
        """
        scores = {}
        usage_stats = self.selection_manager.getUsageStats()
        current_hour = datetime.datetime.now().hour
        
        for feature_id, stats in usage_stats.items():
            score = 0
            
            count = stats.get("count", 0)
            score += count * 10
            
            hours = stats.get("hours", {})
            if str(current_hour) in hours:
                score += hours[str(current_hour)] * 5
            
            last_used = stats.get("last_used")
            if last_used:
                last_used_time = datetime.datetime.fromisoformat(last_used)
                days_since = (datetime.datetime.now() - last_used_time).days
                if days_since <= 7:
                    score += max(0, 30 - days_since * 3)
            
            scores[feature_id] = score
        
        return scores
    
    def _getDefaultRecommendations(self):
        """获取默认推荐
        
        Returns:
            list: 默认推荐的功能ID列表
        """
        return [
            "stick", "call", "exercise", "charge", "cake",
            "screenshot", "openNotepad", "openCalculator",
            "snake", "tetris", "game2048"
        ]
    
    def analyzeUsagePattern(self):
        """分析使用模式
        
        Returns:
            dict: 使用模式分析结果
        """
        try:
            usage_stats = self.selection_manager.getUsageStats()
            
            total_usage = sum(stats.get("count", 0) for stats in usage_stats.values())
            
            peak_hours = {}
            for feature_id, stats in usage_stats.items():
                hours = stats.get("hours", {})
                for hour, count in hours.items():
                    if hour not in peak_hours:
                        peak_hours[hour] = 0
                    peak_hours[hour] += count
            
            sorted_hours = sorted(peak_hours.items(), key=lambda x: x[1], reverse=True)
            
            return {
                "total_usage": total_usage,
                "unique_features": len(usage_stats),
                "peak_hours": sorted_hours[:3],
                "most_used": sorted(usage_stats.items(), 
                                  key=lambda x: x[1].get("count", 0), 
                                  reverse=True)[:5]
            }
        except Exception as e:
            print(f"分析使用模式失败: {e}")
            return {}
