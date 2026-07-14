#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
图层管理对话框模块
提供智能画板的图层管理功能
"""

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, 
    QListWidget, QListWidgetItem, QCheckBox, QInputDialog, QMessageBox, 
    QFrame, QColorDialog
)
from PyQt5.QtGui import QColor, QPalette, QIcon
from PyQt5.QtCore import Qt


class LayerDialog(QDialog):
    """图层管理对话框"""
    def __init__(self, parent=None, layers=None):
        """初始化图层管理对话框
        
        Args:
            parent: 父窗口对象
            layers: 图层列表
        """
        super().__init__(parent)
        self.setWindowTitle("图层管理")
        self.resize(350, 400)
        self.parent = parent
        # 确保传入的layers是列表，如果没有则创建默认图层
        self.layers = layers if layers and isinstance(layers, list) else [{"id": "0", "name": "背景", "visible": True}]
        self.setup_ui()
        self.update_layer_list()
        
    def setup_ui(self):
        """设置对话框界面"""
        # 主布局
        main_layout = QVBoxLayout(self)
        
        # 图层列表
        self.layer_list = QListWidget()
        self.layer_list.setAlternatingRowColors(True)
        self.layer_list.currentRowChanged.connect(self.on_current_row_changed)
        main_layout.addWidget(QLabel("图层列表:"))
        main_layout.addWidget(self.layer_list)
        
        # 分隔线
        line = QFrame()
        line.setFrameShape(QFrame.HLine)
        line.setFrameShadow(QFrame.Sunken)
        main_layout.addWidget(line)
        
        # 按钮布局
        button_layout = QHBoxLayout()
        
        # 添加按钮
        self.add_layer_btn = QPushButton("新建图层")
        self.add_layer_btn.clicked.connect(self.add_layer)
        button_layout.addWidget(self.add_layer_btn)
        
        # 复制按钮
        self.copy_layer_btn = QPushButton("复制图层")
        self.copy_layer_btn.clicked.connect(self.copy_layer)
        button_layout.addWidget(self.copy_layer_btn)
        
        # 删除按钮
        self.delete_layer_btn = QPushButton("删除图层")
        self.delete_layer_btn.clicked.connect(self.delete_layer)
        button_layout.addWidget(self.delete_layer_btn)
        
        main_layout.addLayout(button_layout)
        
        # 第二行按钮布局
        button_layout2 = QHBoxLayout()
        
        # 上移按钮
        self.move_up_btn = QPushButton("上移图层")
        self.move_up_btn.clicked.connect(self.move_layer_up)
        button_layout2.addWidget(self.move_up_btn)
        
        # 下移按钮
        self.move_down_btn = QPushButton("下移图层")
        self.move_down_btn.clicked.connect(self.move_layer_down)
        button_layout2.addWidget(self.move_down_btn)
        
        # 重命名按钮
        self.rename_layer_btn = QPushButton("重命名图层")
        self.rename_layer_btn.clicked.connect(self.rename_layer)
        button_layout2.addWidget(self.rename_layer_btn)
        
        main_layout.addLayout(button_layout2)
        
        # 确定按钮
        self.ok_btn = QPushButton("确定")
        self.ok_btn.clicked.connect(self.accept)
        main_layout.addWidget(self.ok_btn)
        
        # 更新按钮状态
        self.update_button_states()
        
    def update_layer_list(self):
        """更新图层列表"""
        self.layer_list.clear()
        for i, layer in enumerate(self.layers):
            # 创建自定义项部件
            widget = QFrame()
            widget_layout = QHBoxLayout(widget)
            widget_layout.setContentsMargins(5, 2, 5, 2)
            
            # 可见性复选框
            visible_check = QCheckBox()
            visible_check.setChecked(layer.get("visible", True))
            visible_check.toggled.connect(lambda checked, idx=i: self.toggle_layer_visibility(idx, checked))
            widget_layout.addWidget(visible_check)
            
            # 图层名称标签
            name_label = QLabel(layer.get("name", f"图层 {i+1}"))
            widget_layout.addWidget(name_label)
            widget_layout.addStretch()
            
            # 添加到列表
            item = QListWidgetItem()
            item.setSizeHint(widget.sizeHint())
            self.layer_list.addItem(item)
            self.layer_list.setItemWidget(item, widget)
        
        # 如果有图层，选中第一个
        if self.layers:
            self.layer_list.setCurrentRow(0)
        
    def update_button_states(self):
        """更新按钮状态"""
        has_layers = len(self.layers) > 0
        has_selection = self.layer_list.currentRow() >= 0
        
        self.delete_layer_btn.setEnabled(has_layers and has_selection and len(self.layers) > 1)
        self.copy_layer_btn.setEnabled(has_layers and has_selection)
        self.move_up_btn.setEnabled(has_layers and has_selection and self.layer_list.currentRow() > 0)
        self.move_down_btn.setEnabled(has_layers and has_selection and self.layer_list.currentRow() < len(self.layers) - 1)
        self.rename_layer_btn.setEnabled(has_layers and has_selection)
        
    def on_current_row_changed(self, row):
        """当前选中行变化时的处理"""
        self.update_button_states()
        
    def toggle_layer_visibility(self, index, visible):
        """切换图层可见性
        
        Args:
            index: 图层索引
            visible: 是否可见
        """
        if 0 <= index < len(self.layers):
            self.layers[index]["visible"] = visible
            if self.parent:
                self.parent.update_layer_visibility()
        
    def add_layer(self):
        """添加新图层"""
        name, ok = QInputDialog.getText(self, "新建图层", "请输入图层名称:")
        if not ok:
            return
        
        if not name:
            name = f"图层 {len(self.layers) + 1}"
        
        # 创建与LayerManager兼容的图层对象
        import uuid
        new_layer = {
            "id": str(uuid.uuid4()),
            "name": name,
            "visible": True,
            "locked": False
        }
        
        self.layers.append(new_layer)
        self.update_layer_list()
        self.layer_list.setCurrentRow(len(self.layers) - 1)
        
        if self.parent:
            self.parent.update_layers(self.layers)
        
    def copy_layer(self):
        """复制当前图层"""
        row = self.layer_list.currentRow()
        if 0 <= row < len(self.layers):
            # 创建图层的深拷贝，确保ID唯一
            import copy
            copied_layer = copy.deepcopy(self.layers[row])
            copied_layer["name"] = f"{copied_layer['name']} 副本"
            copied_layer["id"] = str(uuid.uuid4())  # 生成新的唯一ID
            
            # 插入到当前图层下方
            self.layers.insert(row + 1, copied_layer)
            self.update_layer_list()
            self.layer_list.setCurrentRow(row + 1)
            
            if self.parent:
                self.parent.update_layers(self.layers)
        
    def delete_layer(self):
        """删除当前图层"""
        row = self.layer_list.currentRow()
        if 0 <= row < len(self.layers) and len(self.layers) > 1:
            # 确认删除
            reply = QMessageBox.question(
                self, "确认删除", f"确定要删除图层 '{self.layers[row]['name']}' 吗？",
                QMessageBox.Yes | QMessageBox.No
            )
            
            if reply == QMessageBox.Yes:
                self.layers.pop(row)
                self.update_layer_list()
                
                if self.parent:
                    self.parent.update_layers(self.layers)
        
    def move_layer_up(self):
        """上移当前图层"""
        row = self.layer_list.currentRow()
        if 0 < row < len(self.layers):  # 确保不是第一个图层
            # 交换位置
            self.layers[row], self.layers[row - 1] = self.layers[row - 1], self.layers[row]
            self.update_layer_list()
            self.layer_list.setCurrentRow(row - 1)
            
            if self.parent:
                self.parent.update_layers(self.layers)
        
    def move_layer_down(self):
        """下移当前图层"""
        row = self.layer_list.currentRow()
        if 0 <= row < len(self.layers) - 1:  # 确保不是最后一个图层
            # 交换位置
            self.layers[row], self.layers[row + 1] = self.layers[row + 1], self.layers[row]
            self.update_layer_list()
            self.layer_list.setCurrentRow(row + 1)
            
            if self.parent:
                self.parent.update_layers(self.layers)
        
    def rename_layer(self):
        """重命名当前图层"""
        row = self.layer_list.currentRow()
        if 0 <= row < len(self.layers):
            current_name = self.layers[row]["name"]
            name, ok = QInputDialog.getText(
                self, "重命名图层", "请输入新的图层名称:", text=current_name
            )
            
            if ok and name and name != current_name:
                self.layers[row]["name"] = name
                self.update_layer_list()
                self.layer_list.setCurrentRow(row)
        
    def accept(self):
        """接受对话框"""
        if self.parent:
            self.parent.update_layers(self.layers)
        super().accept()
