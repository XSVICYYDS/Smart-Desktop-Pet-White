"""
使用记录查询 - 操作历史、配置变更、系统统计
"""

from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QLineEdit, QTableWidget, 
                             QTableWidgetItem, QHeaderView, QTabWidget,
                             QFileDialog)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont, QPainter, QColor, QBrush
from components import CardWidget
from datetime import datetime


class UsageHistory(QWidget):
    """
    使用记录查询组件
    """
    def __init__(self, usage_logger, parent=None):
        super().__init__(parent)
        self.usage_logger = usage_logger
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 使用TabWidget
        self.tab_widget = QTabWidget()
        
        # 操作历史标签
        self.tab_widget.addTab(self._create_operations_tab(), "操作历史")
        
        # 配置变更记录标签
        self.tab_widget.addTab(self._create_config_changes_tab(), "配置变更")
        
        # 使用统计标签
        self.tab_widget.addTab(self._create_stats_tab(), "使用统计")
        
        layout.addWidget(self.tab_widget)
    
    def _create_operations_tab(self):
        """创建操作历史标签"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 搜索区域
        search_layout = QHBoxLayout()
        
        self.search_edit = QLineEdit()
        self.search_edit.setPlaceholderText("搜索操作...")
        self.search_edit.setMinimumHeight(44)
        self.search_edit.setStyleSheet("""
            QLineEdit {
                padding: 10px;
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                font-size: 14px;
            }
        """)
        self.search_edit.textChanged.connect(self._filter_operations)
        search_layout.addWidget(self.search_edit)
        
        self.refresh_btn = QPushButton("刷新")
        self.refresh_btn.setMinimumSize(44, 44)
        self.refresh_btn.clicked.connect(self._refresh_operations)
        search_layout.addWidget(self.refresh_btn)
        
        self.export_btn = QPushButton("导出CSV")
        self.export_btn.setMinimumSize(44, 44)
        self.export_btn.clicked.connect(self._export_operations)
        search_layout.addWidget(self.export_btn)
        
        layout.addLayout(search_layout)
        
        # 操作列表
        self.operations_table = QTableWidget()
        self.operations_table.setColumnCount(3)
        self.operations_table.setHorizontalHeaderLabels(["时间", "操作", "详情"])
        self.operations_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.operations_table.setStyleSheet("""
            QTableWidget {
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                gridline-color: #E0E0E0;
            }
            QHeaderView::section {
                background-color: #F9F9F9;
                padding: 8px;
                border: none;
                border-bottom: 1px solid #E0E0E0;
                font-weight: bold;
            }
        """)
        self._refresh_operations()
        layout.addWidget(self.operations_table)
        
        return widget
    
    def _create_config_changes_tab(self):
        """创建配置变更标签"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        title = QLabel("配置变更记录")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        layout.addWidget(title)
        
        self.config_table = QTableWidget()
        self.config_table.setColumnCount(4)
        self.config_table.setHorizontalHeaderLabels(["时间", "配置项", "旧值", "新值"])
        self.config_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.config_table.setStyleSheet("""
            QTableWidget {
                border: 1px solid #E0E0E0;
                border-radius: 6px;
                gridline-color: #E0E0E0;
            }
            QHeaderView::section {
                background-color: #F9F9F9;
                padding: 8px;
                border: none;
                border-bottom: 1px solid #E0E0E0;
                font-weight: bold;
            }
        """)
        self._refresh_config_changes()
        layout.addWidget(self.config_table)
        
        return widget
    
    def _create_stats_tab(self):
        """创建使用统计标签"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        title = QLabel("系统使用统计")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        layout.addWidget(title)
        
        # 统计卡片
        stats_card = CardWidget()
        
        stats_layout = QVBoxLayout()
        
        stats = self.usage_logger.get_stats()
        
        # 总使用次数
        total_label = QLabel(f"总使用次数: {stats['total_uses']}")
        total_label.setFont(QFont("Microsoft YaHei", 14))
        stats_layout.addWidget(total_label)
        
        # 功能使用排行
        feature_label = QLabel("功能使用排行:")
        feature_label.setFont(QFont("Microsoft YaHei", 14))
        stats_layout.addWidget(feature_label)
        
        feature_usage = stats.get("feature_usage", {})
        sorted_features = sorted(feature_usage.items(), key=lambda x: x[1], reverse=True)
        
        for feature_id, count in sorted_features[:5]:
            feature_item = QLabel(f"  - {feature_id}: {count}次")
            feature_item.setFont(QFont("Microsoft YaHei", 12))
            stats_layout.addWidget(feature_item)
        
        if not sorted_features:
            no_data = QLabel("  暂无数据")
            no_data.setStyleSheet("color: #999999;")
            stats_layout.addWidget(no_data)
        
        stats_card.layout.addLayout(stats_layout)
        layout.addWidget(stats_card)
        
        layout.addStretch()
        
        return widget
    
    def _refresh_operations(self):
        """刷新操作历史"""
        operations = self.usage_logger.get_operations()
        self._populate_operations_table(operations)
    
    def _filter_operations(self):
        """过滤操作历史"""
        keyword = self.search_edit.text()
        operations = self.usage_logger.get_operations(keyword=keyword)
        self._populate_operations_table(operations)
    
    def _populate_operations_table(self, operations):
        """填充操作表格"""
        self.operations_table.setRowCount(len(operations))
        
        for i, op in enumerate(operations):
            self.operations_table.setItem(i, 0, QTableWidgetItem(op.get("timestamp", "")))
            self.operations_table.setItem(i, 1, QTableWidgetItem(op.get("operation", "")))
            self.operations_table.setItem(i, 2, QTableWidgetItem(str(op.get("details", ""))))
    
    def _refresh_config_changes(self):
        """刷新配置变更记录"""
        changes = self.usage_logger.get_config_changes()
        
        self.config_table.setRowCount(len(changes))
        
        for i, change in enumerate(changes):
            self.config_table.setItem(i, 0, QTableWidgetItem(change.get("timestamp", "")))
            self.config_table.setItem(i, 1, QTableWidgetItem(change.get("key", "")))
            self.config_table.setItem(i, 2, QTableWidgetItem(str(change.get("old_value", ""))))
            self.config_table.setItem(i, 3, QTableWidgetItem(str(change.get("new_value", ""))))
    
    def _export_operations(self):
        """导出操作历史为CSV"""
        path, _ = QFileDialog.getSaveFileName(self, "导出操作历史", "", "CSV Files (*.csv)")
        
        if path:
            operations = self.usage_logger.get_operations()
            
            with open(path, 'w', encoding='utf-8-sig') as f:
                f.write("时间,操作,详情\n")
                for op in operations:
                    f.write(f"{op.get('timestamp', '')},{op.get('operation', '')},{op.get('details', '')}\n")
            
            from PyQt5.QtWidgets import QMessageBox
            QMessageBox.information(self, "成功", "导出成功！")
