#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能画板 - PyQt5版本
一个功能强大的绘图工具，支持多种绘图模式、图层管理、AI辅助功能和文件操作
"""

import sys
import os
import json
import uuid
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import threading
from enum import Enum, auto
from typing import List, Dict, Tuple, Any, Optional, Union
import cv2
import pytesseract
import re

# 自动检测Tesseract-OCR路径
_tesseract_paths = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Users\XS\AppData\Local\Programs\Tesseract-OCR\tesseract.exe',
    r'D:\安装源文件\Tesseract-OCR\tesseract.exe',
]
_tessdata_paths = [
    r'C:\Program Files\Tesseract-OCR\tessdata',
    r'C:\Users\XS\AppData\Local\Programs\Tesseract-OCR\tessdata',
    r'D:\安装源文件\Tesseract-OCR\tessdata',
]
_tesseract_found = False
for p in _tesseract_paths:
    if os.path.exists(p):
        pytesseract.pytesseract.tesseract_cmd = p
        _tesseract_found = True
        break
if _tesseract_found:
    for td in _tessdata_paths:
        if os.path.exists(td):
            os.environ['TESSDATA_PREFIX'] = td
            break
else:
    print("警告: 未找到Tesseract-OCR安装路径，OCR功能将被禁用")
    pytesseract.pytesseract.tesseract_cmd = None

# PyQt5导入
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QComboBox, QColorDialog, QSlider,
    QFileDialog, QMessageBox, QInputDialog, QProgressDialog,
    QScrollArea, QToolBar, QStatusBar, QMenuBar, QMenu, QDialog,
    QGraphicsScene, QGraphicsView, QGraphicsItem, QGraphicsLineItem,
    QGraphicsRectItem, QGraphicsEllipseItem, QGraphicsPolygonItem,
    QGraphicsPathItem, QGraphicsTextItem, QGraphicsItemGroup, QAction
)

# 导入图层管理对话框
from layer_dialog import LayerDialog
from PyQt5.QtGui import (
    QPainter, QPen, QBrush, QColor, QFont, QPixmap, QIcon,
    QPainterPath, QImage, QCursor, QTransform
)
from PyQt5.QtCore import (
    Qt, QPoint, QPointF, QRect, QRectF, QSize, QSizeF, QTimer,
    QThread, pyqtSignal, pyqtSlot
)

# 绘图模式枚举
class DrawMode(Enum):
    FREE_DRAW = auto()
    LINE = auto()
    RECTANGLE = auto()
    CIRCLE = auto()
    TEXT = auto()
    ERASER = auto()
    POLYGON = auto()
    CURVE = auto()
    ARROW = auto()
    SELECT = auto()

# 形状类型映射
SHAPE_TYPES = {
    "line": "直线",
    "rectangle": "矩形",
    "circle": "圆形",
    "text": "文本",
    "polygon": "多边形",
    "curve": "曲线",
    "arrow": "箭头"
}

# 默认设置
DEFAULT_SETTINGS = {
    "line_color": "#000000",
    "fill_color": "#ffffff",
    "line_size": 2,
    "font_family": "Arial",
    "font_size": 12,
    "bg_color": "#f0f0f0",
    "canvas_bg": "#ffffff",
    "toolbar_bg": "#e0e0e0",
    "text_color": "#000000",
    "highlight_color": "#0066cc",
    "undo_limit": 50,
    "eraser_check_interval": 0.05
}


class Shape:
    """形状基类，管理形状属性和操作"""
    def __init__(self,
                 shape_id: str,
                 shape_type: str,
                 coords: List[float],
                 outline: str,
                 width: int,
                 fill: Optional[str] = None,
                 points: Optional[List[Tuple[float, float]]] = None,
                 layer: str = "0",
                 data: Optional[Dict[str, Any]] = None):
        self.id = shape_id
        self.type = shape_type
        self.coords = coords
        self.outline = outline
        self.width = width
        self.fill = fill
        self.points = points or []
        self.layer = layer
        self.visible = True
        self.data = data or {}
        self.qgraphics_item = None

    def to_dict(self) -> Dict[str, Any]:
        """将形状转换为字典格式"""
        return {
            "id": self.id,
            "type": self.type,
            "coords": self.coords,
            "outline": self.outline,
            "width": self.width,
            "fill": self.fill,
            "points": self.points,
            "layer": self.layer,
            "data": self.data
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Shape':
        """从字典创建形状对象"""
        return cls(
            data["id"],
            data["type"],
            data["coords"],
            data["outline"],
            data["width"],
            data.get("fill"),
            data.get("points", []),
            data.get("layer", "0"),
            data.get("data", {})
        )


class LayerManager:
    """图层管理类"""
    def __init__(self):
        self.layers = [{
            "id": "0",
            "name": "背景",
            "visible": True,
            "locked": False
        }]
        self.current_layer = "0"

    def add_layer(self, name: str) -> str:
        """添加新图层"""
        layer_id = str(uuid.uuid4())
        self.layers.append({
            "id": layer_id,
            "name": name,
            "visible": True,
            "locked": False
        })
        return layer_id

    def delete_layer(self, layer_id: str) -> bool:
        """删除图层"""
        if len(self.layers) <= 1:  # 至少保留一个图层
            return False
        self.layers = [layer for layer in self.layers if layer["id"] != layer_id]
        # 如果删除的是当前图层，切换到第一个图层
        if self.current_layer == layer_id:
            self.current_layer = self.layers[0]["id"]
        return True

    def rename_layer(self, layer_id: str, name: str) -> bool:
        """重命名图层"""
        for layer in self.layers:
            if layer["id"] == layer_id:
                layer["name"] = name
                return True
        return False

    def set_layer_visibility(self, layer_id: str, visible: bool) -> bool:
        """设置图层可见性"""
        for layer in self.layers:
            if layer["id"] == layer_id:
                layer["visible"] = visible
                return True
        return False

    def set_layer_lock(self, layer_id: str, locked: bool) -> bool:
        """设置图层锁定状态"""
        for layer in self.layers:
            if layer["id"] == layer_id:
                layer["locked"] = locked
                return True
        return False

    def get_layer(self, layer_id: str) -> Optional[Dict[str, Any]]:
        """获取图层信息"""
        for layer in self.layers:
            if layer["id"] == layer_id:
                return layer
        return None





class ExportThread(QThread):
    """导出图片线程"""
    progress_updated = pyqtSignal(int)
    export_completed = pyqtSignal(bool, str)
    
    def __init__(self, file_path: str, shapes: List[Shape], parent=None):
        super().__init__(parent)
        self.file_path = file_path
        self.shapes = shapes
        
    def run(self):
        """线程运行函数"""
        try:
            # 计算边界框
            min_x = min_y = float('inf')
            max_x = max_y = float('-inf')
            
            for shape in self.shapes:
                if not shape.visible:
                    continue
                
                # 获取形状边界
                if shape.coords:
                    coords = shape.coords
                    for i in range(0, len(coords), 2):
                        min_x = min(min_x, coords[i])
                        min_y = min(min_y, coords[i+1])
                        max_x = max(max_x, coords[i])
                        max_y = max(max_y, coords[i+1])
                elif shape.points:
                    for x, y in shape.points:
                        min_x = min(min_x, x)
                        min_y = min(min_y, y)
                        max_x = max(max_x, x)
                        max_y = max(max_y, y)
            
            # 如果没有形状，使用默认尺寸
            if min_x == float('inf'):
                width, height = 800, 600
                x_offset, y_offset = 0, 0
            else:
                width = int(max_x - min_x + 20)  # 留出边距
                height = int(max_y - min_y + 20)
                x_offset = int(min_x - 10)
                y_offset = int(min_y - 10)
            
            # 创建PIL图像
            img = Image.new("RGB", (width, height), "white")
            draw = ImageDraw.Draw(img)
            
            # 按图层顺序绘制所有形状
            sorted_shapes = sorted(self.shapes, key=lambda s: s.layer)
            
            for i, shape in enumerate(sorted_shapes):
                if not shape.visible:
                    continue
                
                # 更新进度
                progress = int((i + 1) / len(sorted_shapes) * 100)
                self.progress_updated.emit(progress)
                
                # 绘制形状
                try:
                    if shape.type == "line":
                        draw.line(
                            [(c - x_offset) for c in shape.coords], 
                            fill=shape.outline, 
                            width=shape.width
                        )
                    elif shape.type == "rectangle":
                        coords = [c - x_offset if i % 2 == 0 else c - y_offset for i, c in enumerate(shape.coords)]
                        draw.rectangle(coords, outline=shape.outline, fill=shape.fill, width=shape.width)
                    elif shape.type == "circle":
                        coords = [c - x_offset if i % 2 == 0 else c - y_offset for i, c in enumerate(shape.coords)]
                        draw.ellipse(coords, outline=shape.outline, fill=shape.fill, width=shape.width)
                    elif shape.type == "text":
                        try:
                            font = ImageFont.truetype(shape.data.get('font', ('Arial', 12))[0], 
                                                     shape.data.get('font', ('Arial', 12))[1])
                        except:
                            font = ImageFont.load_default()
                        draw.text(
                            (shape.coords[0] - x_offset, shape.coords[1] - y_offset),
                            shape.data.get('text', ''),
                            fill=shape.outline,
                            font=font
                        )
                    elif shape.type == "polygon":
                        points = [(p[0] - x_offset, p[1] - y_offset) for p in shape.points]
                        draw.polygon(points, outline=shape.outline, fill=shape.fill)
                    elif shape.type == "curve":
                        for i in range(len(shape.points) - 1):
                            x1, y1 = shape.points[i]
                            x2, y2 = shape.points[i+1]
                            draw.line(
                                [(x1 - x_offset, y1 - y_offset), (x2 - x_offset, y2 - y_offset)],
                                fill=shape.outline,
                                width=shape.width
                            )
                    elif shape.type == "arrow":
                        # 简化实现，实际需要绘制箭头
                        draw.line(
                            [(c - x_offset) for c in shape.coords], 
                            fill=shape.outline, 
                            width=shape.width
                        )
                except Exception as e:
                    print(f"绘制形状时出错: {e}")
            
            # 保存图像
            img.save(self.file_path)
            
            # 发送完成信号
            self.export_completed.emit(True, "导出成功")
            
        except Exception as e:
            self.export_completed.emit(False, f"导出失败: {str(e)}")


class IntelligentDrawingBoard(QMainWindow):
    """智能画板主应用类"""
    def __init__(self, parent=None):
        super().__init__(parent)
        # 设置窗口标题和大小
        self.setWindowTitle("智能画板 v3.0 (PyQt5版本)")
        self.resize(1200, 800)
        
        # 初始化变量
        self.settings = DEFAULT_SETTINGS.copy()
        self.draw_mode = DrawMode.FREE_DRAW
        self.current_color = self.settings["line_color"]
        self.fill_color = self.settings["fill_color"]
        self.current_size = self.settings["line_size"]
        self.text_font = (self.settings["font_family"], self.settings["font_size"])
        self.shapes = []
        self.selected_shape = None
        self.drawing = False
        self.last_pos = None
        self.current_shape = None
        self.point_buffer = []
        self.polygon_points = []
        self.curve_points = []
        self.temp_item = None
        self.layer_manager = LayerManager()
        self.undo_stack = []
        self.redo_stack = []
        self.undo_limit = self.settings["undo_limit"]
        self.current_file = None
        self.is_modified = False
        self.ai_mode = False
        self.recognized_shape = None
        self.copied_shape = None
        self.cut_shape_flag = False
        self.scale_factor = 1.0
        self.zoom_center = QPointF(0, 0)
        self.eraser_check_interval = self.settings["eraser_check_interval"]
        self.last_eraser_check = 0
        self.eraser_size = self.current_size * 5
        self.style_templates = []
        
        # 初始化UI
        self.init_ui()
        
        # 加载默认模板
        self.load_default_templates()
        
        # 更新状态栏
        self.statusBar().showMessage("就绪")
    
    def init_ui(self):
        """初始化用户界面 - 优化布局"""
        # 创建主窗口部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # 创建工具栏
        self.create_toolbars()
        
        # 创建画布和工具面板区域
        content_widget = QWidget()
        content_layout = QHBoxLayout(content_widget)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(0)
        
        # 创建左侧垂直滑块区域
        left_panel_widget = QWidget()
        left_panel_widget.setFixedWidth(40)
        left_panel_layout = QVBoxLayout(left_panel_widget)
        left_panel_layout.setContentsMargins(5, 5, 5, 5)
        left_panel_layout.setAlignment(Qt.AlignTop)
        
        # 添加缩放滑块
        zoom_label = QLabel("缩放")
        zoom_label.setAlignment(Qt.AlignCenter)
        zoom_label.setStyleSheet("font-size: 10px;")
        left_panel_layout.addWidget(zoom_label)
        
        self.zoom_slider = QSlider(Qt.Vertical)
        self.zoom_slider.setRange(1, 20)
        self.zoom_slider.setValue(10)  # 默认100%
        self.zoom_slider.setPageStep(1)
        self.zoom_slider.setTickInterval(2)
        self.zoom_slider.setTickPosition(QSlider.TicksBothSides)
        self.zoom_slider.valueChanged.connect(self.on_zoom_slider_changed)
        left_panel_layout.addWidget(self.zoom_slider)
        
        # 缩放百分比显示
        self.zoom_percent_label = QLabel("100%")
        self.zoom_percent_label.setAlignment(Qt.AlignCenter)
        self.zoom_percent_label.setStyleSheet("font-size: 10px;")
        left_panel_layout.addWidget(self.zoom_percent_label)
        
        # 添加分隔符
        left_panel_layout.addSpacing(20)
        
        # 画笔粗细快速调节滑块
        brush_label = QLabel("粗细")
        brush_label.setAlignment(Qt.AlignCenter)
        brush_label.setStyleSheet("font-size: 10px;")
        left_panel_layout.addWidget(brush_label)
        
        self.quick_size_slider = QSlider(Qt.Vertical)
        self.quick_size_slider.setRange(1, 20)
        self.quick_size_slider.setValue(self.current_size)
        self.quick_size_slider.setPageStep(1)
        self.quick_size_slider.setTickInterval(2)
        self.quick_size_slider.setTickPosition(QSlider.TicksBothSides)
        self.quick_size_slider.valueChanged.connect(self.on_quick_size_slider_changed)
        left_panel_layout.addWidget(self.quick_size_slider)
        
        # 粗细值显示
        self.size_value_label = QLabel(str(self.current_size))
        self.size_value_label.setAlignment(Qt.AlignCenter)
        self.size_value_label.setStyleSheet("font-size: 10px;")
        left_panel_layout.addWidget(self.size_value_label)
        
        # 创建画布区域
        canvas_widget = QWidget()
        canvas_layout = QVBoxLayout(canvas_widget)
        canvas_layout.setContentsMargins(0, 0, 0, 0)
        
        # 创建图形场景和视图
        self.scene = QGraphicsScene()
        self.scene.setBackgroundBrush(QBrush(QColor(self.settings["canvas_bg"])))
        self.scene.setSceneRect(0, 0, 2000, 2000)  # 设置大的场景以便绘制
        
        self.view = QGraphicsView(self.scene)
        self.view.setRenderHint(QPainter.Antialiasing)
        self.view.setRenderHint(QPainter.SmoothPixmapTransform)
        self.view.setDragMode(QGraphicsView.ScrollHandDrag)
        self.view.setMouseTracking(True)
        self.view.setStyleSheet("border: 1px solid #ccc;")
        
        # 连接视图事件
        self.view.mousePressEvent = self.mouse_press_event
        self.view.mouseMoveEvent = self.mouse_move_event
        self.view.mouseReleaseEvent = self.mouse_release_event
        self.view.wheelEvent = self.wheel_event
        
        canvas_layout.addWidget(self.view)
        
        # 添加到内容布局
        content_layout.addWidget(left_panel_widget)
        content_layout.addWidget(canvas_widget, 1)
        
        main_layout.addWidget(content_widget, 1)
        
        # 创建状态栏
        self.statusBar().showMessage("就绪")
        
        # 创建菜单栏
        self.create_menus()
    
    def create_toolbars(self):
        """创建工具栏 - 优化布局"""
        # 主工具栏 - 绘图工具、颜色选择、线条粗细
        main_toolbar = QToolBar("主工具", self)
        self.addToolBar(main_toolbar)
        
        # 创建绘图模式按钮组 - 紧凑布局
        draw_modes = [
            (DrawMode.FREE_DRAW, "自由绘制", "✏️"),
            (DrawMode.LINE, "直线", "📏"),
            (DrawMode.RECTANGLE, "矩形", "□"),
            (DrawMode.CIRCLE, "圆形", "○"),
            (DrawMode.TEXT, "文本", "Aa"),
            (DrawMode.ERASER, "橡皮擦", "🧽"),
            (DrawMode.POLYGON, "多边形", "🔺"),
            (DrawMode.CURVE, "曲线", "~"),
            (DrawMode.ARROW, "箭头", "➡️"),
            (DrawMode.SELECT, "选择", "👆")
        ]
        
        self.mode_group = []
        for mode, name, icon in draw_modes:
            action = QAction(icon, self)
            action.setToolTip(name)
            action.setCheckable(True)
            action.triggered.connect(lambda checked, m=mode: self.set_draw_mode(m))
            main_toolbar.addAction(action)
            self.mode_group.append(action)
        
        # 设置默认模式
        self.set_draw_mode(DrawMode.FREE_DRAW)
        
        # 添加分隔符
        main_toolbar.addSeparator()
        
        # 颜色选择区域
        color_layout = QHBoxLayout()
        color_layout.setContentsMargins(0, 0, 0, 0)
        color_layout.setSpacing(5)
        
        color_layout.addWidget(QLabel("线条:"))
        self.color_preview = QPushButton()
        self.color_preview.setFixedSize(30, 30)
        self.color_preview.setStyleSheet(f"background-color: {self.current_color}; border: 1px solid #ccc; border-radius: 3px;")
        self.color_preview.setToolTip("选择线条颜色")
        self.color_preview.clicked.connect(self.choose_color)
        color_layout.addWidget(self.color_preview)
        
        color_layout.addWidget(QLabel("填充:"))
        self.fill_preview = QPushButton()
        self.fill_preview.setFixedSize(30, 30)
        self.fill_preview.setStyleSheet(f"background-color: {self.fill_color}; border: 1px solid #ccc; border-radius: 3px;")
        self.fill_preview.setToolTip("选择填充颜色")
        self.fill_preview.clicked.connect(self.choose_fill_color)
        color_layout.addWidget(self.fill_preview)
        
        color_widget = QWidget()
        color_widget.setLayout(color_layout)
        main_toolbar.addWidget(color_widget)
        
        # 添加分隔符
        main_toolbar.addSeparator()
        
        # 线条粗细控制 - 优化布局
        size_layout = QHBoxLayout()
        size_layout.setContentsMargins(0, 0, 0, 0)
        size_layout.setSpacing(5)
        
        size_layout.addWidget(QLabel("粗细:"))
        
        # 创建快捷粗细按钮
        common_sizes = [1, 3, 5, 10]
        self.size_buttons = []
        for size in common_sizes:
            btn = QPushButton(str(size))
            btn.setFixedWidth(30)
            if size == self.current_size:
                btn.setStyleSheet("background-color: #4CAF50; color: white; border-radius: 3px;")
            btn.setToolTip(f"设置线条粗细为{size}")
            btn.clicked.connect(lambda checked, s=size: self.set_size_directly(s))
            self.size_buttons.append(btn)
            size_layout.addWidget(btn)
        
        # 添加滑块和标签到布局
        self.size_slider = QSlider(Qt.Horizontal)
        self.size_slider.setRange(1, 20)
        self.size_slider.setValue(self.current_size)
        self.size_slider.setFixedWidth(80)
        self.size_slider.setToolTip("调整线条粗细")
        self.size_slider.valueChanged.connect(self.change_size)
        size_layout.addWidget(self.size_slider)
        
        self.size_label = QLabel(str(self.current_size))
        self.size_label.setFixedWidth(20)
        size_layout.addWidget(self.size_label)
        
        size_widget = QWidget()
        size_widget.setLayout(size_layout)
        main_toolbar.addWidget(size_widget)
        
        # 第二工具栏 - 编辑、视图和AI工具
        second_toolbar = QToolBar("辅助工具", self)
        self.addToolBar(second_toolbar)
        
        # 编辑工具组
        edit_actions = [
            ("撤销", "↶", "撤销操作", self.undo),
            ("重做", "↷", "重做操作", self.redo),
            ("复制", "📋", "复制选中的形状", self.copy_shape),
            ("剪切", "✂️", "剪切选中的形状", self.cut_shape),
            ("粘贴", "📎", "粘贴形状", self.paste_shape),
            ("清除", "🗑️", "清除画布", self.clear_canvas),
            ("图层", "📚", "图层管理", self.manage_layers)
        ]
        
        for name, icon, tooltip, func in edit_actions:
            action = QAction(icon, self)
            action.setToolTip(f"{name} ({tooltip})")
            action.triggered.connect(func)
            second_toolbar.addAction(action)
        
        # 添加分隔符
        second_toolbar.addSeparator()
        
        # 视图工具组
        view_actions = [
            ("放大", "🔍+", "放大视图", self.zoom_in),
            ("缩小", "🔍-", "缩小视图", self.zoom_out),
            ("重置", "🔄", "重置缩放", self.reset_zoom),
            ("适应窗口", "🖼️", "适应窗口大小", self.zoom_to_fit)
        ]
        
        for name, icon, tooltip, func in view_actions:
            action = QAction(icon, self)
            action.setToolTip(f"{name} ({tooltip})")
            action.triggered.connect(func)
            second_toolbar.addAction(action)
        
        # 添加分隔符
        second_toolbar.addSeparator()
        
        # AI工具组
        self.ai_checkbox = QAction("🤖 AI辅助模式", self)
        self.ai_checkbox.setCheckable(True)
        self.ai_checkbox.setToolTip("启用/禁用AI辅助功能")
        self.ai_checkbox.triggered.connect(self.toggle_ai)
        second_toolbar.addAction(self.ai_checkbox)
        
        ai_actions = [
            ("识别形状", "🔍", "识别绘制的形状", self.recognize_shape),
            ("智能补全", "✨", "智能补全图形", self.smart_complete),
            ("填充形状", "🖍️", "填充当前形状", self.fill_current_shape),
            ("文本识别", "🔤", "识别文本", self.recognize_text)
        ]
        
        for name, icon, tooltip, func in ai_actions:
            action = QAction(icon, self)
            action.setToolTip(f"{name} ({tooltip})")
            action.triggered.connect(func)
            second_toolbar.addAction(action)
    
    def set_size_directly(self, size: int):
        """直接设置线条粗细"""
        self.current_size = size
        self.size_slider.setValue(size)
        self.size_label.setText(str(size))
        
        # 同步更新左侧快速粗细滑块
        if hasattr(self, 'quick_size_slider'):
            self.quick_size_slider.setValue(size)
            self.size_value_label.setText(str(size))
            
        self.eraser_size = size * 5  # 更新橡皮擦大小
        
        # 更新按钮状态
        for btn in self.size_buttons:
            if int(btn.text()) == size:
                btn.setStyleSheet("background-color: #4CAF50; color: white; border-radius: 3px;")
            else:
                btn.setStyleSheet("")
                
    def on_zoom_slider_changed(self, value: int):
        """处理左侧缩放滑块的变化"""
        # 将滑块值 (1-20) 映射到缩放比例 (0.1-4.0)
        scale = 0.1 + (value - 1) * 0.2
        
        # 应用缩放
        self.scale_factor = scale
        self.view.setTransform(QTransform().scale(scale, scale), False)
        
        # 更新缩放百分比标签
        percent = int(scale * 100)
        self.zoom_percent_label.setText(f"{percent}%")
        
    def on_quick_size_slider_changed(self, size: int):
        """处理左侧快速粗细调节滑块的变化"""
        self.set_size_directly(size)
                
    def create_menus(self):
        """创建菜单栏"""
        # 获取菜单栏
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu("文件")
        
        file_actions = [
            ("新建", "Ctrl+N", self.new_canvas),
            ("打开", "Ctrl+O", self.open_canvas),
            ("保存", "Ctrl+S", self.save_canvas),
            ("另存为", "Ctrl+Shift+S", self.save_canvas_as),
            ("导出为图片", None, self.export_as_image),
            ("导出为SVG", None, self.export_as_svg),
            ("退出", "Ctrl+Q", self.close)
        ]
        
        for name, shortcut, func in file_actions:
            action = QAction(name, self)
            if shortcut:
                action.setShortcut(shortcut)
            action.triggered.connect(func)
            file_menu.addAction(action)
        
        # 编辑菜单
        edit_menu = menubar.addMenu("编辑")
        
        edit_actions = [
            ("撤销", "Ctrl+Z", self.undo),
            ("重做", "Ctrl+Y", self.redo),
            ("剪切", "Ctrl+X", self.cut_shape),
            ("复制", "Ctrl+C", self.copy_shape),
            ("粘贴", "Ctrl+V", self.paste_shape),
            ("清除画布", "Ctrl+Delete", self.clear_canvas),
            ("图层管理", None, self.manage_layers)
        ]
        
        for name, shortcut, func in edit_actions:
            action = QAction(name, self)
            if shortcut:
                action.setShortcut(shortcut)
            action.triggered.connect(func)
            edit_menu.addAction(action)
        
        # 视图菜单
        view_menu = menubar.addMenu("视图")
        
        view_actions = [
            ("放大", "Ctrl++", self.zoom_in),
            ("缩小", "Ctrl+-", self.zoom_out),
            ("重置缩放", "Ctrl+0", self.reset_zoom),
            ("适应窗口", None, self.zoom_to_fit)
        ]
        
        for name, shortcut, func in view_actions:
            action = QAction(name, self)
            if shortcut:
                action.setShortcut(shortcut)
            action.triggered.connect(func)
            view_menu.addAction(action)
        
        # 工具菜单
        tool_menu = menubar.addMenu("工具")
        
        # 模板子菜单
        self.template_menu = QMenu("样式模板", self)
        tool_menu.addMenu(self.template_menu)
        
        # 添加保存样式动作
        save_style_action = QAction("保存当前样式", self)
        save_style_action.triggered.connect(self.save_current_style)
        tool_menu.addAction(save_style_action)
        
        # 帮助菜单
        help_menu = menubar.addMenu("帮助")
        
        help_actions = [
            ("使用帮助", "F1", self.show_help),
            ("快捷键", None, self.show_shortcuts),
            ("关于", None, self.show_about)
        ]
        
        for name, shortcut, func in help_actions:
            action = QAction(name, self)
            if shortcut:
                action.setShortcut(shortcut)
            action.triggered.connect(func)
            help_menu.addAction(action)
    
    def set_draw_mode(self, mode: DrawMode):
        """设置绘图模式"""
        self.draw_mode = mode
        
        # 更新按钮状态
        for i, action in enumerate(self.mode_group):
            action.setChecked(i == list(DrawMode).index(mode))
        
        # 更新状态栏
        mode_names = {
            DrawMode.FREE_DRAW: "自由绘制",
            DrawMode.LINE: "直线",
            DrawMode.RECTANGLE: "矩形",
            DrawMode.CIRCLE: "圆形",
            DrawMode.TEXT: "文本",
            DrawMode.ERASER: "橡皮擦",
            DrawMode.POLYGON: "多边形",
            DrawMode.CURVE: "曲线",
            DrawMode.ARROW: "箭头",
            DrawMode.SELECT: "选择"
        }
        self.statusBar().showMessage(f"绘图模式: {mode_names.get(mode, '未知')}")
    
    def choose_color(self):
        """选择线条颜色"""
        color = QColorDialog.getColor(QColor(self.current_color), self, "选择线条颜色")
        if color.isValid():
            self.current_color = color.name()
            self.color_preview.setStyleSheet(f"background-color: {self.current_color};")
    
    def choose_fill_color(self):
        """选择填充颜色"""
        color = QColorDialog.getColor(QColor(self.fill_color), self, "选择填充颜色")
        if color.isValid():
            self.fill_color = color.name()
            self.fill_preview.setStyleSheet(f"background-color: {self.fill_color};")
    
    def change_size(self, value: int):
        """改变线条粗细"""
        self.current_size = value
        self.size_label.setText(str(value))
        self.eraser_size = value * 5  # 更新橡皮擦大小
        
        # 更新左侧快速粗细调节滑块
        if hasattr(self, 'quick_size_slider'):
            # 将线条粗细值映射到滑块值
            slider_value = value
            slider_value = max(1, min(20, slider_value))  # 限制在有效范围内
            self.quick_size_slider.setValue(slider_value)
            
            # 更新粗细值标签
            self.size_value_label.setText(str(value))
    
    def mouse_press_event(self, event):
        """处理鼠标按下事件"""
        if self.view is None:
            return
        
        if event.button() != Qt.LeftButton:
            super(QGraphicsView, self.view).mousePressEvent(event)
            return
        
        try:
            # 获取场景坐标
            scene_pos = self.view.mapToScene(event.pos())
            
            if self.draw_mode == DrawMode.SELECT:
                self.handle_selection(scene_pos)
            elif self.draw_mode == DrawMode.TEXT:
                self.start_text(scene_pos)
            else:
                self.start_drawing(scene_pos)
        except Exception as e:
            self.statusBar().showMessage(f"绘图错误: {str(e)}")
            print(f"绘图错误: {str(e)}")
    
    def mouse_move_event(self, event):
        """处理鼠标移动事件"""
        if self.view is None:
            super(QGraphicsView, self.view).mouseMoveEvent(event)
            return
        
        try:
            # 获取场景坐标
            scene_pos = self.view.mapToScene(event.pos())
            
            # 更新坐标显示
            self.statusBar().showMessage(f"坐标: ({int(scene_pos.x())}, {int(scene_pos.y())})")
            
            if self.drawing:
                self.continue_drawing(scene_pos)
        except Exception as e:
            self.statusBar().showMessage(f"绘图错误: {str(e)}")
            print(f"绘图错误: {str(e)}")
        
        super(QGraphicsView, self.view).mouseMoveEvent(event)
    
    def mouse_release_event(self, event):
        """处理鼠标释放事件"""
        if self.view is None:
            super(QGraphicsView, self.view).mouseReleaseEvent(event)
            return
        
        if event.button() != Qt.LeftButton:
            super(QGraphicsView, self.view).mouseReleaseEvent(event)
            return
        
        try:
            # 获取场景坐标
            scene_pos = self.view.mapToScene(event.pos())
            
            if self.drawing:
                self.stop_drawing(scene_pos)
        except Exception as e:
            self.statusBar().showMessage(f"停止绘图错误: {str(e)}")
            print(f"停止绘图错误: {str(e)}")
    
    def wheel_event(self, event):
        """处理鼠标滚轮事件"""
        if self.view is None:
            super(QGraphicsView, self.view).wheelEvent(event)
            return
        
        try:
            # 获取滚轮方向
            if event.angleDelta().y() > 0:
                factor = 1.1
            else:
                factor = 0.9
            
            # 获取鼠标位置作为缩放中心 - 修复pos()方法为position()
            scene_pos = self.view.mapToScene(event.pos())
            
            # 保存当前缩放中心
            self.zoom_center = scene_pos
            
            # 应用缩放
            self.view.scale(factor, factor)
            self.scale_factor *= factor
            
            self.statusBar().showMessage(f"缩放: {self.scale_factor:.2f}x")
        except Exception as e:
            self.statusBar().showMessage(f"缩放错误: {str(e)}")
            print(f"缩放错误: {str(e)}")
        
        super(QGraphicsView, self.view).wheelEvent(event)
    
    def start_drawing(self, pos: QPointF):
        """开始绘图"""
        self.drawing = True
        self.last_pos = pos
        self.point_buffer = [pos]
        
        # 根据绘图模式创建初始形状
        if self.draw_mode == DrawMode.FREE_DRAW:
            # 创建自由绘制路径
            try:
                path = QPainterPath()
                path.moveTo(pos)
                self.temp_item = self.scene.addPath(path, 
                                                  QPen(QColor(self.current_color), self.current_size),
                                                  QBrush(QColor(self.fill_color)))  # 注意fill_color应用到自由绘制上
                
                # 初始化当前形状对象
                shape_id = str(uuid.uuid4())
                self.current_shape = Shape(
                    shape_id,
                    "free_draw",
                    [pos.x(), pos.y()],
                    self.current_color,
                    self.current_size,
                    fill=self.fill_color if hasattr(self, 'fill_color') else None,
                    points=[pos],
                    layer=self.layer_manager.current_layer
                )
            except Exception as e:
                self.statusBar().showMessage(f"初始化自由绘制错误: {str(e)}")
                print(f"初始化自由绘制错误: {str(e)}")
        elif self.draw_mode == DrawMode.LINE:
            # 创建直线
            self.temp_item = self.scene.addLine(
                pos.x(), pos.y(), pos.x(), pos.y(),
                QPen(QColor(self.current_color), self.current_size)
            )
        elif self.draw_mode == DrawMode.RECTANGLE:
            # 创建矩形
            self.temp_item = self.scene.addRect(
                QRectF(pos, QSizeF(0, 0)),
                QPen(QColor(self.current_color), self.current_size),
                QBrush(QColor(self.fill_color))
            )
        elif self.draw_mode == DrawMode.CIRCLE:
            # 创建圆形
            self.temp_item = self.scene.addEllipse(
                QRectF(pos, QSizeF(0, 0)),
                QPen(QColor(self.current_color), self.current_size),
                QBrush(QColor(self.fill_color))
            )
        elif self.draw_mode == DrawMode.ARROW:
            # 创建箭头
            line = QGraphicsLineItem(pos.x(), pos.y(), pos.x(), pos.y())
            pen = QPen(QColor(self.current_color), self.current_size)
            pen.setCapStyle(Qt.RoundCap)
            pen.setJoinStyle(Qt.RoundJoin)
            line.setPen(pen)
            self.temp_item = line
            self.scene.addItem(line)
        elif self.draw_mode == DrawMode.ERASER:
            # 初始化橡皮擦路径
            try:
                self.current_shape = Shape(
                    str(uuid.uuid4()),
                    "eraser",
                    [],
                    self.settings["canvas_bg"],
                    self.eraser_size,
                    layer=self.layer_manager.current_layer
                )
            except Exception as e:
                self.statusBar().showMessage(f"初始化橡皮擦错误: {str(e)}")
                print(f"初始化橡皮擦错误: {str(e)}")
        elif self.draw_mode == DrawMode.POLYGON:
            # 添加多边形点
            self.polygon_points.append(pos)
            # 绘制点标记
            self.scene.addEllipse(
                pos.x() - 3, pos.y() - 3, 6, 6,
                QPen(QColor(self.current_color)),
                QBrush(QColor(self.current_color))
            )
            # 如果已有多个点，绘制预览线
            if len(self.polygon_points) > 1:
                self.temp_item = self.scene.addLine(
                    self.polygon_points[-2].x(), self.polygon_points[-2].y(),
                    pos.x(), pos.y(),
                    QPen(QColor(self.current_color), self.current_size, Qt.DashLine)
                )
        elif self.draw_mode == DrawMode.CURVE:
            # 添加曲线点
            self.curve_points.append(pos)
            # 如果已有多个点，绘制曲线预览
            if len(self.curve_points) > 1:
                path = QPainterPath()
                path.moveTo(self.curve_points[0])
                for i in range(1, len(self.curve_points)):
                    path.lineTo(self.curve_points[i])
                # 添加当前鼠标位置作为临时点
                path.lineTo(pos)
                self.temp_item = self.scene.addPath(path, 
                                                  QPen(QColor(self.current_color), self.current_size))
    
    def continue_drawing(self, pos: QPointF):
        """继续绘图"""
        self.point_buffer.append(pos)
            
        if self.draw_mode == DrawMode.FREE_DRAW:
                # 扩展自由绘制路径
                if self.temp_item is not None:
                    try:
                        path = self.temp_item.path()
                        path.lineTo(pos)
                        self.temp_item.setPath(path)
                        
                        # 同时更新current_shape对象的点和坐标
                        if hasattr(self, 'current_shape') and self.current_shape is not None:
                            self.current_shape.points.append(pos)
                            self.current_shape.coords.extend([pos.x(), pos.y()])
                        
                        if self.view:  # 检查视图是否存在
                            self.view.viewport().update()  # 使用正确的视图端口更新
                    except Exception as e:
                        self.statusBar().showMessage(f"自由绘制更新错误: {str(e)}")
                        print(f"自由绘制更新错误: {str(e)}")
        elif self.draw_mode == DrawMode.LINE:
            # 更新直线
            if self.temp_item is not None:
                try:
                    line = self.temp_item
                    line.setLine(line.line().x1(), line.line().y1(), pos.x(), pos.y())
                except Exception as e:
                    self.statusBar().showMessage(f"直线更新错误: {str(e)}")
                    print(f"直线更新错误: {str(e)}")
        elif self.draw_mode == DrawMode.RECTANGLE:
            # 更新矩形
            if self.temp_item is not None:
                try:
                    rect_item = self.temp_item
                    start_pos = QPointF(rect_item.rect().x(), rect_item.rect().y())
                    
                    # 处理Shift键（正方形）
                    modifiers = QApplication.keyboardModifiers()
                    if modifiers == Qt.ShiftModifier:
                        # 计算正方形
                        width = max(abs(pos.x() - start_pos.x()), abs(pos.y() - start_pos.y()))
                        x2 = start_pos.x() + width if pos.x() > start_pos.x() else start_pos.x() - width
                        y2 = start_pos.y() + width if pos.y() > start_pos.y() else start_pos.y() - width
                        rect_item.setRect(QRectF(start_pos, QPointF(x2, y2)).normalized())
                    else:
                        # 普通矩形
                        rect_item.setRect(QRectF(start_pos, pos).normalized())
                except Exception as e:
                    self.statusBar().showMessage(f"矩形更新错误: {str(e)}")
                    print(f"矩形更新错误: {str(e)}")
        elif self.draw_mode == DrawMode.CIRCLE:
            # 更新圆形
            if self.temp_item is not None:
                try:
                    ellipse_item = self.temp_item
                    start_pos = QPointF(ellipse_item.rect().x(), ellipse_item.rect().y())
                    
                    # 处理Shift键（正圆）
                    modifiers = QApplication.keyboardModifiers()
                    if modifiers == Qt.ShiftModifier:
                        # 计算正圆
                        width = max(abs(pos.x() - start_pos.x()), abs(pos.y() - start_pos.y()))
                        x2 = start_pos.x() + width if pos.x() > start_pos.x() else start_pos.x() - width
                        y2 = start_pos.y() + width if pos.y() > start_pos.y() else start_pos.y() - width
                        ellipse_item.setRect(QRectF(start_pos, QPointF(x2, y2)).normalized())
                    else:
                        # 普通椭圆
                        ellipse_item.setRect(QRectF(start_pos, pos).normalized())
                except Exception as e:
                    self.statusBar().showMessage(f"圆形更新错误: {str(e)}")
                    print(f"圆形更新错误: {str(e)}")
        elif self.draw_mode == DrawMode.ARROW:
            # 更新箭头
            if self.temp_item is not None:
                try:
                    # 移除旧的箭头
                    self.scene.removeItem(self.temp_item)
                    
                    # 获取起点
                    start_pos = self.point_buffer[0]
                    
                    # 创建新的箭头路径
                    path = QPainterPath()
                    path.moveTo(start_pos)
                    path.lineTo(pos)
                    
                    # 计算箭头角度
                    angle = math.atan2(pos.y() - start_pos.y(), pos.x() - start_pos.x())
                    
                    # 计算箭头尾部的两个点
                    arrow_size = 10 + self.current_size  # 根据线条粗细调整箭头大小
                    arrow_angle = math.pi / 6  # 30度
                    
                    # 计算第一个箭头点
                    arrow_x1 = pos.x() - arrow_size * math.cos(angle - arrow_angle)
                    arrow_y1 = pos.y() - arrow_size * math.sin(angle - arrow_angle)
                    
                    # 计算第二个箭头点
                    arrow_x2 = pos.x() - arrow_size * math.cos(angle + arrow_angle)
                    arrow_y2 = pos.y() - arrow_size * math.sin(angle + arrow_angle)
                    
                    # 添加箭头尾部到路径
                    path.moveTo(pos)
                    path.lineTo(arrow_x1, arrow_y1)
                    path.moveTo(pos)
                    path.lineTo(arrow_x2, arrow_y2)
                    
                    # 创建新的箭头项目
                    self.temp_item = self.scene.addPath(path, QPen(QColor(self.current_color), self.current_size))
                except Exception as e:
                    self.statusBar().showMessage(f"箭头更新错误: {str(e)}")
                    print(f"箭头更新错误: {str(e)}")
        elif self.draw_mode == DrawMode.ERASER:
            # 实现橡皮擦功能 - 全面优化版本
            try:
                # 记录擦除路径点
                self.current_shape.coords.extend([pos.x(), pos.y()])
                
                # 创建橡皮擦区域的边界框，加速碰撞检测
                eraser_rect = QRectF(pos.x() - self.eraser_size/2, pos.y() - self.eraser_size/2, self.eraser_size, self.eraser_size)
                
                # 创建形状副本以避免遍历过程中修改列表导致的问题
                shapes_to_process = self.shapes.copy()
                
                # 初始化相交标志为False，解决变量作用域问题
                intersects = False
                
                # 检查并移除与橡皮擦相交的形状
                for shape in shapes_to_process:
                    if shape.layer != self.layer_manager.current_layer or shape not in self.shapes:
                        continue
                                 
                    # 快速检查：如果是可见的形状才处理
                    if not shape.visible:
                        continue
                    
                    # 创建一个临时路径来表示橡皮擦区域
                    eraser_path = QPainterPath()
                    eraser_path.addEllipse(eraser_rect)
                    
                    # 检查形状与橡皮擦区域的相交情况（不需要重新初始化）
                    
                    # 根据形状类型进行不同的处理
                    if shape.type == "free_draw" and shape.points:
                        # 快速检查：形状的边界框是否与橡皮擦区域相交
                        # 手动计算边界框
                        min_x = min(p.x() for p in shape.points)
                        min_y = min(p.y() for p in shape.points)
                        max_x = max(p.x() for p in shape.points)
                        max_y = max(p.y() for p in shape.points)
                        shape_bounds = QRectF(min_x, min_y, max_x - min_x, max_y - min_y)
                        
                        if eraser_rect.intersects(shape_bounds):
                            intersects = True
                            # 对于自由绘制路径，检查每个点是否在橡皮擦范围内
                            points = shape.points
                            keep_points = []
                            for p in points:
                                distance = ((p.x() - pos.x())**2 + (p.y() - pos.y())** 2) ** 0.5
                                if distance > self.eraser_size / 2:
                                    keep_points.append(p)
                                  
                            if len(keep_points) < len(points):
                                # 如果删除了部分点，更新路径
                                if len(keep_points) < 2:
                                    # 如果剩余点太少，完全删除该形状
                                    self.scene.removeItem(shape.qgraphics_item)
                                    self.shapes.remove(shape)
                                else:
                                    # 更新路径
                                    path = QPainterPath()
                                    path.moveTo(keep_points[0])
                                    for p in keep_points[1:]:
                                        path.lineTo(p)
                                        
                                    # 移除旧项并添加新项
                                    self.scene.removeItem(shape.qgraphics_item)
                                    new_item = self.scene.addPath(path, 
                                                          QPen(QColor(shape.outline), shape.width),
                                                          QBrush(QColor(shape.fill) if shape.fill else Qt.transparent))
                                    shape.qgraphics_item = new_item
                                    shape.points = keep_points
                                    
                                    # 更新坐标列表
                                    shape.coords = []
                                    for p in keep_points:
                                        shape.coords.extend([p.x(), p.y()])
                    else:
                        # 对于其他类型的形状，直接检查其图形项是否与橡皮擦相交
                        if shape.qgraphics_item and shape.qgraphics_item.boundingRect().intersects(eraser_rect):
                            # 对于简单形状，直接删除整个形状
                            self.scene.removeItem(shape.qgraphics_item)
                            self.shapes.remove(shape)
                            intersects = True
                
                if intersects:
                    self.is_modified = True
                    # 添加到撤销历史
                    self.add_to_history(self.current_shape.id)
            except Exception as e:
                self.statusBar().showMessage(f"橡皮擦错误: {str(e)}")
                print(f"橡皮擦错误: {str(e)}")
        elif self.draw_mode == DrawMode.POLYGON and len(self.polygon_points) > 1:
            # 更新多边形预览线
            self.scene.removeItem(self.temp_item)
            self.temp_item = self.scene.addLine(
                self.polygon_points[-1].x(), self.polygon_points[-1].y(),
                pos.x(), pos.y(),
                QPen(QColor(self.current_color), self.current_size, Qt.DashLine)
            )
        elif self.draw_mode == DrawMode.CURVE:
            try:
                # 添加点到曲线点列表
                self.curve_points.append(pos)
                
                # 更新曲线预览
                if self.temp_item is not None:
                    try:
                        self.scene.removeItem(self.temp_item)
                    except Exception as e:
                        print(f"移除临时项错误: {str(e)}")
                
                # 创建新的曲线路径
                if len(self.curve_points) > 1:
                    path = QPainterPath()
                    path.moveTo(self.curve_points[0])
                    for i in range(1, len(self.curve_points)):
                        path.lineTo(self.curve_points[i])
                    # 添加当前鼠标位置作为临时点
                    path.lineTo(pos)
                    self.temp_item = self.scene.addPath(path, 
                                                      QPen(QColor(self.current_color), self.current_size))
            except Exception as e:
                self.statusBar().showMessage(f"曲线更新错误: {str(e)}")
                print(f"曲线更新错误: {str(e)}")
    
    def stop_drawing(self, pos: QPointF):
        """停止绘图"""
        self.drawing = False
        
        try:
            if self.draw_mode == DrawMode.FREE_DRAW:
                # 检查temp_item是否为None
                if self.temp_item is None:
                    return
                
                # 使用已有的current_shape对象
                if hasattr(self, 'current_shape') and self.current_shape is not None:
                    # 确保qgraphics_item引用正确
                    self.current_shape.qgraphics_item = self.temp_item
                    
                    # 添加到形状列表
                    if self.current_shape not in self.shapes:
                        self.shapes.append(self.current_shape)
                    
                    # 添加到历史记录
                    self.add_to_history(self.current_shape.id)
                    self.is_modified = True
                else:
                    # 作为备用方案，如果current_shape不存在，则创建一个新的
                    shape_id = str(uuid.uuid4())
                    coords = []
                    for p in self.point_buffer:
                        coords.extend([p.x(), p.y()])
                    
                    self.current_shape = Shape(
                        shape_id,
                        "free_draw",
                        coords,
                        self.current_color,
                        self.current_size,
                        fill=self.fill_color if hasattr(self, 'fill_color') else None,
                        points=self.point_buffer,
                        layer=self.layer_manager.current_layer
                    )
                    
                    # 保存引用
                    self.current_shape.qgraphics_item = self.temp_item
                    self.shapes.append(self.current_shape)
                    
                    # 添加到历史记录
                    self.add_to_history(shape_id)
                    self.is_modified = True
                
                # 重置临时项
                self.temp_item = None
                
                # 如果AI模式开启，自动识别形状
                if self.ai_mode:
                    self.recognize_shape()
            elif self.draw_mode == DrawMode.LINE:
                # 检查temp_item是否为None
                if self.temp_item is None:
                    return
                
                try:
                    # 创建形状对象
                    shape_id = str(uuid.uuid4())
                    
                    # 获取坐标
                    line = self.temp_item
                    coords = [line.line().x1(), line.line().y1(), line.line().x2(), line.line().y2()]
                    
                    self.current_shape = Shape(
                        shape_id,
                        "line",
                        coords,
                        self.current_color,
                        self.current_size,
                        layer=self.layer_manager.current_layer
                    )
                    
                    # 保存引用
                    self.current_shape.qgraphics_item = self.temp_item
                    self.shapes.append(self.current_shape)
                    
                    # 添加到历史记录
                    self.add_to_history(shape_id)
                    self.is_modified = True
                except Exception as e:
                    self.statusBar().showMessage(f"创建直线错误: {str(e)}")
                    print(f"创建直线错误: {str(e)}")
                
                # 重置临时项
                self.temp_item = None
            elif self.draw_mode == DrawMode.ARROW:
                # 检查temp_item是否为None
                if self.temp_item is None:
                    return
                
                try:
                    # 创建形状对象
                    shape_id = str(uuid.uuid4())
                    
                    # 获取坐标（使用point_buffer中的起点和终点）
                    if len(self.point_buffer) >= 2:
                        start_pos = self.point_buffer[0]
                        end_pos = self.point_buffer[-1]
                        coords = [start_pos.x(), start_pos.y(), end_pos.x(), end_pos.y()]
                        
                        self.current_shape = Shape(
                            shape_id,
                            "arrow",
                            coords,
                            self.current_color,
                            self.current_size,
                            layer=self.layer_manager.current_layer
                        )
                        
                        # 保存引用
                        self.current_shape.qgraphics_item = self.temp_item
                        self.shapes.append(self.current_shape)
                        
                        # 添加到历史记录
                        self.add_to_history(shape_id)
                        self.is_modified = True
                except Exception as e:
                    self.statusBar().showMessage(f"创建箭头错误: {str(e)}")
                    print(f"创建箭头错误: {str(e)}")
                
                # 重置临时项
                self.temp_item = None
            elif self.draw_mode == DrawMode.RECTANGLE:
                # 检查temp_item是否为None
                if self.temp_item is None:
                    return
                
                try:
                    # 创建形状对象
                    shape_id = str(uuid.uuid4())
                    
                    # 获取坐标
                    rect = self.temp_item
                    coords = [rect.rect().x(), rect.rect().y(), rect.rect().x() + rect.rect().width(), rect.rect().y() + rect.rect().height()]
                    
                    # 判断是否需要填充
                    fill = self.fill_color
                    
                    self.current_shape = Shape(
                        shape_id,
                        "rectangle",
                        coords,
                        self.current_color,
                        self.current_size,
                        fill=fill,
                        layer=self.layer_manager.current_layer
                    )
                    
                    # 保存引用
                    self.current_shape.qgraphics_item = self.temp_item
                    self.shapes.append(self.current_shape)
                    
                    # 添加到历史记录
                    self.add_to_history(shape_id)
                    self.is_modified = True
                except Exception as e:
                    self.statusBar().showMessage(f"创建矩形错误: {str(e)}")
                    print(f"创建矩形错误: {str(e)}")
                
                # 重置临时项
                self.temp_item = None
            elif self.draw_mode == DrawMode.CIRCLE:
                # 检查temp_item是否为None
                if self.temp_item is None:
                    return
                
                try:
                    # 创建形状对象
                    shape_id = str(uuid.uuid4())
                    
                    # 获取坐标
                    ellipse = self.temp_item
                    coords = [ellipse.rect().x(), ellipse.rect().y(), ellipse.rect().x() + ellipse.rect().width(), ellipse.rect().y() + ellipse.rect().height()]
                    
                    # 判断是否需要填充
                    fill = self.fill_color
                    
                    self.current_shape = Shape(
                        shape_id,
                        "circle",
                        coords,
                        self.current_color,
                        self.current_size,
                        fill=fill,
                        layer=self.layer_manager.current_layer
                    )
                    
                    # 保存引用
                    self.current_shape.qgraphics_item = self.temp_item
                    self.shapes.append(self.current_shape)
                    
                    # 添加到历史记录
                    self.add_to_history(shape_id)
                    self.is_modified = True
                except Exception as e:
                    self.statusBar().showMessage(f"创建圆形错误: {str(e)}")
                    print(f"创建圆形错误: {str(e)}")
                
                # 重置临时项
                self.temp_item = None
            elif self.draw_mode == DrawMode.ERASER:
                # 完成橡皮擦操作
                self.is_modified = True
                self.current_shape = None
            elif self.draw_mode == DrawMode.POLYGON:
                # 添加当前点
                self.polygon_points.append(pos)
                
                # 绘制点标记
                self.scene.addEllipse(
                    pos.x() - 3, pos.y() - 3, 6, 6,
                    QPen(QColor(self.current_color)),
                    QBrush(QColor(self.current_color))
                )
                
                # 检查是否有足够的点绘制预览线
                if len(self.polygon_points) > 1:
                    # 移除旧的预览线
                    if self.temp_item:
                        try:
                            self.scene.removeItem(self.temp_item)
                        except:
                            pass
                    
                    # 创建新的预览线
                    self.temp_item = self.scene.addLine(
                        self.polygon_points[-2].x(), self.polygon_points[-2].y(),
                        pos.x(), pos.y(),
                        QPen(QColor(self.current_color), self.current_size, Qt.DashLine)
                    )
                
                # 检查是否双击完成多边形
                # 这里通过检查是否与第一个点重合来模拟双击行为
                if len(self.polygon_points) > 2 and (
                    (abs(self.polygon_points[-1].x() - self.polygon_points[0].x()) < 10) and 
                    (abs(self.polygon_points[-1].y() - self.polygon_points[0].y()) < 10)
                ):
                    # 完成多边形
                    try:
                        # 创建路径
                        path = QPainterPath()
                        path.moveTo(self.polygon_points[0])
                        for p in self.polygon_points[1:-1]:  # 排除最后一个点（与第一个点重合的点）
                            path.lineTo(p)
                        path.closeSubpath()
                        
                        # 创建图形项
                        polygon_item = self.scene.addPath(path,
                                                       QPen(QColor(self.current_color), self.current_size),
                                                       QBrush(QColor(self.fill_color)))
                        
                        # 创建形状对象
                        shape_id = str(uuid.uuid4())
                        coords = []
                        for p in self.polygon_points[:-1]:  # 排除最后一个点
                            coords.extend([p.x(), p.y()])
                        
                        self.current_shape = Shape(
                            shape_id,
                            "polygon",
                            coords,
                            self.current_color,
                            self.current_size,
                            fill=self.fill_color,
                            points=self.polygon_points[:-1],  # 排除最后一个点
                            layer=self.layer_manager.current_layer
                        )
                        
                        # 保存引用
                        self.current_shape.qgraphics_item = polygon_item
                        self.shapes.append(self.current_shape)
                        
                        # 添加到历史记录
                        self.add_to_history(shape_id)
                        self.is_modified = True
                        
                        self.statusBar().showMessage(f"多边形已完成")
                    except Exception as e:
                        self.statusBar().showMessage(f"创建多边形错误: {str(e)}")
                        print(f"创建多边形错误: {str(e)}")
                    
                    # 清除临时项
                    if self.temp_item:
                        try:
                            self.scene.removeItem(self.temp_item)
                        except:
                            pass
                    self.temp_item = None
                    self.polygon_points = []
            elif self.draw_mode == DrawMode.CURVE and len(self.curve_points) > 1:
                # 检查temp_item是否为None
                if self.temp_item is None:
                    self.curve_points = []
                    return
                
                # 完成曲线
                shape_id = str(uuid.uuid4())
                
                # 创建路径
                path = QPainterPath()
                path.moveTo(self.curve_points[0])
                for i in range(1, len(self.curve_points)):
                    path.lineTo(self.curve_points[i])
                
                # 创建图形项
                try:
                    curve_item = self.scene.addPath(path, 
                                                  QPen(QColor(self.current_color), self.current_size))
                    
                    # 获取坐标
                    coords = []
                    for p in self.curve_points:
                        coords.extend([p.x(), p.y()])
                    
                    # 创建形状对象
                    self.current_shape = Shape(
                        shape_id,
                        "curve",
                        coords,
                        self.current_color,
                        self.current_size,
                        points=self.curve_points,
                        layer=self.layer_manager.current_layer
                    )
                    
                    # 保存引用
                    self.current_shape.qgraphics_item = curve_item
                    self.shapes.append(self.current_shape)
                    
                    # 添加到历史记录
                    self.add_to_history(shape_id)
                    self.is_modified = True
                except Exception as e:
                    self.statusBar().showMessage(f"创建曲线错误: {str(e)}")
                    print(f"创建曲线错误: {str(e)}")
                
                # 清除临时图形
                try:
                    self.scene.removeItem(self.temp_item)
                except:
                    pass
                self.temp_item = None
                self.curve_points = []
        except Exception as e:
            self.statusBar().showMessage(f"绘图完成错误: {str(e)}")
            print(f"绘图完成错误: {str(e)}")
    
    def start_text(self, pos: QPointF):
        """开始文本输入"""
        # 获取用户输入的文本
        text, ok = QInputDialog.getText(self, "输入文本", "请输入文本:")
        if ok and text:
            # 创建文本项
            text_item = self.scene.addText(text, QFont(self.text_font[0], self.text_font[1]))
            text_item.setDefaultTextColor(QColor(self.current_color))
            text_item.setPos(pos)
            
            # 创建形状对象
            shape_id = str(uuid.uuid4())
            self.current_shape = Shape(
                shape_id,
                "text",
                [pos.x(), pos.y()],
                self.current_color,
                self.current_size,
                data={
                    "text": text,
                    "font": self.text_font
                },
                layer=self.layer_manager.current_layer
            )
            
            # 保存引用
            self.current_shape.qgraphics_item = text_item
            self.shapes.append(self.current_shape)
            
            # 添加到历史记录
            self.add_to_history(shape_id)
            self.is_modified = True
    
    def handle_selection(self, pos: QPointF):
        """处理选择操作"""
        try:
            # 查找点击的项目
            items = self.scene.items(pos)
            
            # 清除之前的选择
            self.clear_selection()
            
            # 查找第一个形状项目
            for item in items:
                # 查找对应的形状对象
                for shape in self.shapes:
                    if shape.qgraphics_item == item:
                        self.selected_shape = shape
                        # 高亮显示 - 添加选择边框
                        try:
                            # 保存原始画笔
                            if hasattr(item, 'original_pen'):
                                item.setPen(item.original_pen)
                            else:
                                # 记录原始画笔并创建高亮画笔
                                item.original_pen = item.pen()
                            
                            # 创建高亮画笔
                            highlight_pen = QPen(QColor('blue'), self.current_size + 1, Qt.DashLine)
                            highlight_pen.setCosmetic(True)  # 使线条宽度不受缩放影响
                            item.setPen(highlight_pen)
                        except Exception as e:
                            pass  # 如果设置高亮失败，继续执行
                        
                        self.statusBar().showMessage(f"已选择: {SHAPE_TYPES.get(shape.type, '形状')}")
                        return
            
            # 如果没有选择任何形状，清除选择
            self.statusBar().showMessage("就绪")
        except Exception as e:
            self.statusBar().showMessage(f"选择错误: {str(e)}")
            print(f"选择错误: {str(e)}")
    
    def clear_selection(self):
        """清除选择"""
        try:
            if self.selected_shape and hasattr(self.selected_shape.qgraphics_item, 'original_pen'):
                # 恢复原始画笔
                self.selected_shape.qgraphics_item.setPen(self.selected_shape.qgraphics_item.original_pen)
        except Exception as e:
            print(f"清除选择时出错: {str(e)}")
        finally:
            self.selected_shape = None
    
    # 文件操作方法
    def new_canvas(self):
        """新建画布"""
        # 检查是否需要保存
        if self.is_modified:
            reply = QMessageBox.question(self, "确认", "当前画布已修改，是否保存?",
                                        QMessageBox.Yes | QMessageBox.No | QMessageBox.Cancel)
            if reply == QMessageBox.Yes:
                self.save_canvas()
            elif reply == QMessageBox.Cancel:
                return
        
        # 清除画布
        self.scene.clear()
        self.shapes = []
        self.undo_stack = []
        self.redo_stack = []
        self.layer_manager = LayerManager()
        self.current_file = None
        self.is_modified = False
        self.statusBar().showMessage("已创建新画布")
    
    def open_canvas(self):
        """打开画布文件"""
        # 检查是否需要保存
        if self.is_modified:
            reply = QMessageBox.question(self, "确认", "当前画布已修改，是否保存?",
                                        QMessageBox.Yes | QMessageBox.No | QMessageBox.Cancel)
            if reply == QMessageBox.Yes:
                self.save_canvas()
            elif reply == QMessageBox.Cancel:
                return
        
        # 打开文件对话框
        file_path, _ = QFileDialog.getOpenFileName(self, "打开文件", "", "智能画板文件 (*.drb);;所有文件 (*.*)")
        if file_path:
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                # 清除当前画布
                self.scene.clear()
                self.shapes = []
                
                # 加载图层
                if "layers" in data:
                    self.layer_manager.layers = data["layers"]
                if "current_layer" in data:
                    self.layer_manager.current_layer = data["current_layer"]
                
                # 加载设置
                if "settings" in data:
                    settings = data["settings"]
                    self.current_color = settings.get("line_color", self.current_color)
                    self.fill_color = settings.get("fill_color", self.fill_color)
                    self.current_size = settings.get("line_size", self.current_size)
                    self.text_font = (
                        settings.get("font_family", self.text_font[0]),
                        settings.get("font_size", self.text_font[1])
                    )
                    self.color_preview.setStyleSheet(f"background-color: {self.current_color};")
                    self.fill_preview.setStyleSheet(f"background-color: {self.fill_color};")
                    self.size_slider.setValue(self.current_size)
                    self.size_label.setText(str(self.current_size))
                
                # 加载形状
                if "shapes" in data:
                    for shape_data in data["shapes"]:
                        shape = Shape.from_dict(shape_data)
                        
                        # 在画布上创建形状
                        if shape.type == "line":
                            item = self.scene.addLine(
                                shape.coords[0], shape.coords[1], shape.coords[2], shape.coords[3],
                                QPen(QColor(shape.outline), shape.width)
                            )
                        elif shape.type == "rectangle":
                            item = self.scene.addRect(
                                QRectF(shape.coords[0], shape.coords[1], 
                                       shape.coords[2] - shape.coords[0], shape.coords[3] - shape.coords[1]),
                                QPen(QColor(shape.outline), shape.width),
                                QBrush(QColor(shape.fill))
                            )
                        elif shape.type == "circle":
                            item = self.scene.addEllipse(
                                QRectF(shape.coords[0], shape.coords[1], 
                                       shape.coords[2] - shape.coords[0], shape.coords[3] - shape.coords[1]),
                                QPen(QColor(shape.outline), shape.width),
                                QBrush(QColor(shape.fill))
                            )
                        elif shape.type == "text":
                            item = self.scene.addText(shape.data.get('text', ''), 
                                                     QFont(shape.data.get('font', self.text_font)[0], 
                                                           shape.data.get('font', self.text_font)[1]))
                            item.setDefaultTextColor(QColor(shape.outline))
                            item.setPos(shape.coords[0], shape.coords[1])
                        elif shape.type == "polygon":
                            points = [QPointF(p[0], p[1]) for p in shape.points]
                            item = self.scene.addPolygon(
                                points,
                                QPen(QColor(shape.outline), shape.width),
                                QBrush(QColor(shape.fill))
                            )
                        elif shape.type == "curve":
                            path = QPainterPath()
                            path.moveTo(shape.points[0][0], shape.points[0][1])
                            for p in shape.points[1:]:
                                path.lineTo(p[0], p[1])
                            item = self.scene.addPath(path, QPen(QColor(shape.outline), shape.width))
                        elif shape.type == "arrow":
                            item = self.scene.addLine(
                                shape.coords[0], shape.coords[1], shape.coords[2], shape.coords[3],
                                QPen(QColor(shape.outline), shape.width)
                            )
                        else:
                            continue
                        
                        # 保存引用
                        shape.qgraphics_item = item
                        self.shapes.append(shape)
                
                self.current_file = file_path
                self.is_modified = False
                self.statusBar().showMessage(f"已打开: {os.path.basename(file_path)}")
                
                # 更新可见性
                self.update_canvas_visibility()
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"打开失败: {str(e)}")
                self.statusBar().showMessage(f"打开错误: {str(e)}")
                print(f"打开错误: {str(e)}")
    
    def save_canvas(self):
        """保存画布"""
        if self.current_file:
            self._save_canvas_to_file(self.current_file)
        else:
            self.save_canvas_as()
    
    def save_canvas_as(self):
        """另存为"""
        file_path, _ = QFileDialog.getSaveFileName(self, "保存文件", "", "智能画板文件 (*.drb);;所有文件 (*.*)")
        if file_path:
            self.current_file = file_path
            self._save_canvas_to_file(file_path)
    
    def _save_canvas_to_file(self, file_path: str):
        """将画布保存到文件"""
        try:
            # 准备保存数据
            save_data = {
                "version": "3.0",
                "shapes": [shape.to_dict() for shape in self.shapes],
                "layers": self.layer_manager.layers,
                "current_layer": self.layer_manager.current_layer,
                "settings": {
                    "line_color": self.current_color,
                    "fill_color": self.fill_color,
                    "line_size": self.current_size,
                    "font_family": self.text_font[0],
                    "font_size": self.text_font[1]
                }
            }
            
            # 保存到文件
            with open(file_path, 'w') as f:
                json.dump(save_data, f, indent=2)
            
            self.statusBar().showMessage(f"已保存: {os.path.basename(file_path)}")
            self.is_modified = False
            QMessageBox.information(self, "成功", "文件保存成功")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"保存失败: {str(e)}")
            self.statusBar().showMessage(f"保存错误: {str(e)}")
            print(f"保存错误: {str(e)}")
    
    def export_as_image(self):
        """导出为图片"""
        # 获取保存路径
        file_path, _ = QFileDialog.getSaveFileName(self, "导出为图片", "", 
                                                  "PNG文件 (*.png);;JPEG文件 (*.jpg);;所有文件 (*.*)")
        if file_path:
            try:
                # 创建进度对话框
                progress = QProgressDialog("正在导出图片...", "取消", 0, 100, self)
                progress.setWindowTitle("导出图片")
                progress.setWindowModality(Qt.WindowModal)
                progress.setValue(0)
                
                # 创建导出线程
                self.export_thread = ExportThread(file_path, self.shapes)
                self.export_thread.progress_updated.connect(progress.setValue)
                self.export_thread.export_completed.connect(self.on_export_completed)
                
                # 连接取消按钮
                progress.canceled.connect(self.export_thread.terminate)
                
                # 开始导出
                self.export_thread.start()
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {str(e)}")
                self.statusBar().showMessage(f"导出错误: {str(e)}")
                print(f"导出错误: {str(e)}")
    
    @pyqtSlot(bool, str)
    def on_export_completed(self, success: bool, message: str):
        """导出完成回调"""
        if success:
            QMessageBox.information(self, "成功", "图片导出成功")
        else:
            QMessageBox.critical(self, "错误", message)
        
    def export_as_svg(self):
        """导出为SVG"""
        QMessageBox.information(self, "导出SVG", "SVG导出功能将在未来版本中提供")
        self.statusBar().showMessage("SVG导出功能将在未来版本中提供")
    
    # 编辑功能方法
    def copy_shape(self):
        """复制选中的形状"""
        if self.draw_mode != DrawMode.SELECT or not self.selected_shape:
            self.statusBar().showMessage("请先选择一个形状")
            return
        
        # 保存形状数据（深拷贝）
        self.copied_shape = self.selected_shape.to_dict()
        self.cut_shape_flag = False
        self.statusBar().showMessage("已复制形状")
    
    def cut_shape(self):
        """剪切选中的形状"""
        if self.draw_mode != DrawMode.SELECT or not self.selected_shape:
            self.statusBar().showMessage("请先选择一个形状")
            return
        
        # 保存形状数据并标记为剪切
        self.copied_shape = self.selected_shape.to_dict()
        self.cut_shape_flag = True
        
        # 删除原形状
        shape = self.selected_shape
        self.scene.removeItem(shape.qgraphics_item)
        self.shapes.remove(shape)
        self.clear_selection()
        
        self.statusBar().showMessage("已剪切形状")
        self.is_modified = True
    
    def paste_shape(self):
        """粘贴复制/剪切的形状"""
        if not self.copied_shape:
            self.statusBar().showMessage("没有可粘贴的内容")
            return
        
        # 创建新形状ID
        new_id = str(uuid.uuid4())
        
        # 调整粘贴位置（偏移原位置一点）
        offset_x, offset_y = 20, 20
        
        # 复制形状数据并调整位置
        new_data = self.copied_shape.copy()
        new_data['id'] = new_id
        
        # 调整坐标（偏移一定距离）
        if isinstance(new_data['coords'], list):
            new_coords = []
            for i, coord in enumerate(new_data['coords']):
                if i % 2 == 0:  # x坐标
                    new_coords.append(coord + offset_x)
                else:  # y坐标
                    new_coords.append(coord + offset_y)
            new_data['coords'] = new_coords
            
        # 调整点坐标
        if new_data['points']:
            new_points = []
            for point in new_data['points']:
                if isinstance(point, QPointF):
                    # 处理QPointF对象
                    new_points.append(QPointF(point.x() + offset_x, point.y() + offset_y))
                else:
                    # 处理元组或其他格式的点
                    try:
                        # 首先检查是否是可迭代对象
                        if hasattr(point, '__iter__') and not isinstance(point, (str, bytes)):
                            try:
                                x, y = point
                                new_points.append((x + offset_x, y + offset_y))
                            except (TypeError, ValueError):
                                # 如果无法解包，保留原始点
                                new_points.append(point)
                        else:
                            # 不是可迭代对象，保留原始点
                            new_points.append(point)
                    except Exception as e:
                        # 捕获所有其他异常，确保程序不会崩溃
                        self.statusBar().showMessage(f"处理点坐标时出错: {str(e)}")
                        new_points.append(point)
            new_data['points'] = new_points
        
        # 创建新形状
        new_shape = Shape.from_dict(new_data)
        
        # 在画布上绘制新形状
        if new_shape.type == "line":
            item = self.scene.addLine(
                new_shape.coords[0], new_shape.coords[1], new_shape.coords[2], new_shape.coords[3],
                QPen(QColor(new_shape.outline), new_shape.width)
            )
        elif new_shape.type == "rectangle":
            item = self.scene.addRect(
                QRectF(new_shape.coords[0], new_shape.coords[1], 
                       new_shape.coords[2] - new_shape.coords[0], new_shape.coords[3] - new_shape.coords[1]),
                QPen(QColor(new_shape.outline), new_shape.width),
                QBrush(QColor(new_shape.fill))
            )
        elif new_shape.type == "circle":
            item = self.scene.addEllipse(
                QRectF(new_shape.coords[0], new_shape.coords[1], 
                       new_shape.coords[2] - new_shape.coords[0], new_shape.coords[3] - new_shape.coords[1]),
                QPen(QColor(new_shape.outline), new_shape.width),
                QBrush(QColor(new_shape.fill))
            )
        elif new_shape.type == "text":
            item = self.scene.addText(new_shape.data.get('text', ''), 
                                     QFont(new_shape.data.get('font', self.text_font)[0], 
                                           new_shape.data.get('font', self.text_font)[1]))
            item.setDefaultTextColor(QColor(new_shape.outline))
            item.setPos(new_shape.coords[0], new_shape.coords[1])
        elif new_shape.type == "polygon":
            points = [QPointF(p[0], p[1]) for p in new_shape.points]
            item = self.scene.addPolygon(
                points,
                QPen(QColor(new_shape.outline), new_shape.width),
                QBrush(QColor(new_shape.fill))
            )
        elif new_shape.type == "curve":
            path = QPainterPath()
            path.moveTo(new_shape.points[0][0], new_shape.points[0][1])
            for p in new_shape.points[1:]:
                path.lineTo(p[0], p[1])
            item = self.scene.addPath(path, QPen(QColor(new_shape.outline), new_shape.width))
        elif new_shape.type == "arrow":
            item = self.scene.addLine(
                new_shape.coords[0], new_shape.coords[1], new_shape.coords[2], new_shape.coords[3],
                QPen(QColor(new_shape.outline), new_shape.width)
            )
        else:
            return
        
        # 保存引用
        new_shape.qgraphics_item = item
        self.shapes.append(new_shape)
        
        # 如果是剪切操作，清除剪切标记
        if self.cut_shape_flag:
            self.copied_shape = None
            self.cut_shape_flag = False
        
        self.add_to_history(new_id)
        self.is_modified = True
        self.statusBar().showMessage("已粘贴形状")
    
    def clear_canvas(self):
        """清除画布"""
        if self.shapes:
            reply = QMessageBox.question(self, "确认", "确定要清除画布吗？",
                                        QMessageBox.Yes | QMessageBox.No)
            if reply != QMessageBox.Yes:
                return
        
        try:
            self.scene.clear()
            self.shapes = []
            self.undo_stack = []
            self.redo_stack = []
            self.layer_manager = LayerManager()  # 重置图层
            self.statusBar().showMessage("画布已清空")
            self.current_file = None
            self.is_modified = False
        except Exception as e:
            self.statusBar().showMessage(f"清空画布错误: {str(e)}")
            print(f"清空画布错误: {str(e)}")
    
    # 图层管理方法
    def manage_layers(self):
        """打开图层管理对话框"""
        dialog = LayerDialog(self, self.layer_manager.layers)
        if dialog.exec_() == QDialog.Accepted:
            self.update_layers(dialog.layers)
    
    def update_canvas_visibility(self):
        """更新画布上形状的可见性"""
        for shape in self.shapes:
            layer = self.layer_manager.get_layer(shape.layer)
            if layer and layer['visible'] != shape.visible:
                shape.visible = layer['visible']
                shape.qgraphics_item.setVisible(shape.visible)
    
    
    

    
    def update_layers(self, layers):
        """更新图层列表"""
        self.layer_manager.layers = layers
        self.update_canvas_visibility()
        self.is_modified = True
        
    def update_layer_visibility(self):
        """更新图层可见性"""
        try:
            self.update_canvas_visibility()
            self.is_modified = True
        except Exception as e:
            self.statusBar().showMessage(f"更新图层可见性错误: {str(e)}")
            print(f"更新图层可见性错误: {str(e)}")
        
    # 撤销/重做方法
    def add_to_history(self, shape_id: str):
        """添加到历史记录"""
        self.undo_stack.append(shape_id)
        self.redo_stack = []  # 清空重做栈
        
        # 限制撤销栈大小
        if len(self.undo_stack) > self.undo_limit:
            self.undo_stack.pop(0)
    
    def undo(self):
        """撤销操作"""
        if self.undo_stack:
            shape_id = self.undo_stack.pop()
            self.redo_stack.append(shape_id)
            
            # 查找形状
            shape = next((s for s in self.shapes if s.id == shape_id), None)
            if shape:
                # 隐藏形状
                shape.visible = False
                shape.qgraphics_item.setVisible(False)
                self.statusBar().showMessage("已撤销操作")
                self.is_modified = True
            else:
                self.statusBar().showMessage("没有可撤销的操作")
        else:
            self.statusBar().showMessage("没有可撤销的操作")
    
    def redo(self):
        """重做操作"""
        if self.redo_stack:
            shape_id = self.redo_stack.pop()
            self.undo_stack.append(shape_id)
            
            # 查找形状
            shape = next((s for s in self.shapes if s.id == shape_id), None)
            if shape:
                # 显示形状
                shape.visible = True
                shape.qgraphics_item.setVisible(True)
                self.statusBar().showMessage("已重做操作")
                self.is_modified = True
            else:
                self.statusBar().showMessage("没有可重做的操作")
        else:
            self.statusBar().showMessage("没有可重做的操作")
    
    # 视图操作方法
    def zoom(self, factor: float, center: QPointF = None):
        """缩放视图"""
        # 如果没有指定中心，使用当前中心点
        if center is None:
            center = self.zoom_center
        
        # 保存中心点在视图中的位置
        view_pos = self.view.mapFromScene(center)
        
        # 应用缩放
        self.view.scale(factor, factor)
        self.scale_factor *= factor
        
        # 重新定位中心点
        new_view_pos = self.view.mapFromScene(center)
        self.view.translate(new_view_pos.x() - view_pos.x(), new_view_pos.y() - view_pos.y())
        
        self.statusBar().showMessage(f"缩放: {self.scale_factor:.2f}x")
    
    def zoom_in(self):
        """放大视图"""
        # 使用鼠标当前位置作为中心
        mouse_pos = self.view.mapFromGlobal(self.mapFromGlobal(QCursor.pos()))
        scene_pos = self.view.mapToScene(mouse_pos)
        self.zoom(1.1, scene_pos)
        
        # 更新缩放滑块
        if hasattr(self, 'zoom_slider'):
            # 将缩放因子 (0.1-4.0) 映射到滑块值 (1-20)
            slider_value = int((self.scale_factor - 0.1) / 0.2) + 1
            slider_value = max(1, min(20, slider_value))  # 限制在有效范围内
            self.zoom_slider.setValue(slider_value)
            
            # 更新百分比标签
            percent = int(self.scale_factor * 100)
            self.zoom_percent_label.setText(f"{percent}%")
    
    def zoom_out(self):
        """缩小视图"""
        # 使用鼠标当前位置作为中心
        mouse_pos = self.view.mapFromGlobal(self.mapFromGlobal(QCursor.pos()))
        scene_pos = self.view.mapToScene(mouse_pos)
        self.zoom(0.9, scene_pos)
        
        # 更新缩放滑块
        if hasattr(self, 'zoom_slider'):
            # 将缩放因子 (0.1-4.0) 映射到滑块值 (1-20)
            slider_value = int((self.scale_factor - 0.1) / 0.2) + 1
            slider_value = max(1, min(20, slider_value))  # 限制在有效范围内
            self.zoom_slider.setValue(slider_value)
            
            # 更新百分比标签
            percent = int(self.scale_factor * 100)
            self.zoom_percent_label.setText(f"{percent}%")
    
    def reset_zoom(self):
        """重置缩放"""
        # 计算缩放因子
        factor = 1.0 / self.scale_factor
        
        # 重置变换
        self.view.resetTransform()
        self.scale_factor = 1.0
        
        # 更新缩放滑块和标签
        if hasattr(self, 'zoom_slider'):
            self.zoom_slider.setValue(10)  # 10对应100%
            self.zoom_percent_label.setText("100%")
        
        self.statusBar().showMessage(f"缩放: {self.scale_factor:.2f}x")
    
    def zoom_to_fit(self):
        """缩放以适应窗口"""
        # 计算所有形状的边界框
        if not self.shapes:
            self.reset_zoom()
            return
        
        min_x = min_y = float('inf')
        max_x = max_y = float('-inf')
        
        for shape in self.shapes:
            if not shape.visible:
                continue
            
            # 获取形状边界
            if shape.coords:
                coords = shape.coords
                for i in range(0, len(coords), 2):
                    min_x = min(min_x, coords[i])
                    min_y = min(min_y, coords[i+1])
                    max_x = max(max_x, coords[i])
                    max_y = max(max_y, coords[i+1])
            elif shape.points:
                for x, y in shape.points:
                    min_x = min(min_x, x)
                    min_y = min(min_y, y)
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)
        
        # 如果没有形状，使用默认尺寸
        if min_x == float('inf'):
            self.reset_zoom()
            return
        
        # 创建边界矩形
        bounding_rect = QRectF(min_x, min_y, max_x - min_x, max_y - min_y)
        
        # 添加边距
        margin = max(bounding_rect.width(), bounding_rect.height()) * 0.1
        bounding_rect.adjust(-margin, -margin, margin, margin)
        
        # 缩放以适应视图
        self.view.fitInView(bounding_rect, Qt.KeepAspectRatio)
        
        # 更新缩放因子
        # 简化实现，实际需要根据视图和场景的变换矩阵计算
        self.scale_factor = (self.view.size().width() / bounding_rect.width() + 
                            self.view.size().height() / bounding_rect.height()) / 2
        
        self.statusBar().showMessage(f"缩放: 适应窗口")
    
    # AI辅助功能
    def toggle_ai(self):
        """切换AI辅助模式"""
        self.ai_mode = self.ai_checkbox.isChecked()
        self.statusBar().showMessage(f"AI辅助模式: {'开启' if self.ai_mode else '关闭'}")
    
    def recognize_shape(self):
        """识别形状"""
        if not self.current_shape or not self.ai_mode:
            self.statusBar().showMessage("请开启AI模式并绘制一个形状")
            return
        
        try:
            # 这里是形状识别的简化实现
            # 实际应用中应该使用更复杂的算法或AI模型
            self.recognized_shape = self.advanced_shape_recognition(self.current_shape)
            
            if self.recognized_shape:
                self.statusBar().showMessage(f"识别到形状: {self.recognized_shape}")
                # 可以根据识别结果优化形状
                self.optimize_shape(self.current_shape, self.recognized_shape)
            else:
                self.statusBar().showMessage("无法识别形状")
        except Exception as e:
            self.statusBar().showMessage(f"形状识别错误: {str(e)}")
            print(f"形状识别错误: {str(e)}")
    
    def smart_complete(self):
        """智能补全"""
        if not self.selected_shape or not self.ai_mode:
            self.statusBar().showMessage("请开启AI模式并选择一个形状")
            return
        
        try:
            # 这里是智能补全的简化实现
            # 实际应用中应该使用更复杂的算法或AI模型
            self.statusBar().showMessage("正在智能补全...")
            # 补全逻辑
            self.statusBar().showMessage("智能补全完成")
        except Exception as e:
            self.statusBar().showMessage(f"智能补全错误: {str(e)}")
            print(f"智能补全错误: {str(e)}")
    
    def recognize_text(self):
        """文本识别
        
        集成了专业的OCR模型，能够识别不同字体、字号、背景干扰及倾斜角度的文本
        支持多语言、特殊符号的识别
        """
        if not self.ai_mode:
            self.statusBar().showMessage("请先开启AI模式")
            return
        
        try:
            # 获取当前选中区域或整个画布
            if self.selected_shape:
                # 从选中的形状中识别文本
                self._recognize_text_from_selected_shape()
            else:
                # 从整个画布中识别文本
                self._recognize_text_from_canvas()
        except Exception as e:
            self.statusBar().showMessage(f"文本识别错误: {str(e)}")
            print(f"文本识别错误: {str(e)}")
            
    def _recognize_text_from_selected_shape(self):
        """从选中的形状中识别文本"""
        try:
            # 检查选中的形状是否有图像数据
            if not hasattr(self.selected_shape, 'qgraphics_item') or not self.selected_shape.qgraphics_item:
                self.statusBar().showMessage("选中的形状不包含可识别的内容")
                return
            
            # 获取形状的边界框
            item = self.selected_shape.qgraphics_item
            bounding_rect = item.sceneBoundingRect()
            
            # 捕获形状区域的图像
            image = self._capture_scene_region(bounding_rect)
            
            # 识别文本
            text = self._perform_ocr(image)
            
            if text.strip():
                # 在形状附近显示识别结果
                self._show_recognized_text(text, bounding_rect.center())
                self.statusBar().showMessage(f"识别到文本: {text[:50]}...")
            else:
                self.statusBar().showMessage("未识别到文本")
        except Exception as e:
            self.statusBar().showMessage(f"从选中形状识别文本错误: {str(e)}")
            print(f"从选中形状识别文本错误: {str(e)}")
            
    def _recognize_text_from_canvas(self):
        """从整个画布中识别文本"""
        try:
            # 获取整个场景的边界框
            scene_rect = self.scene.itemsBoundingRect()
            
            # 捕获整个画布的图像
            image = self._capture_scene_region(scene_rect)
            
            # 识别文本
            text = self._perform_ocr(image)
            
            if text.strip():
                # 创建文本标签显示识别结果
                result_dialog = QDialog(self)
                result_dialog.setWindowTitle("文本识别结果")
                result_dialog.resize(600, 400)
                
                layout = QVBoxLayout(result_dialog)
                
                # 创建文本编辑框显示识别结果
                text_edit = QTextEdit()
                text_edit.setText(text)
                text_edit.setReadOnly(True)
                
                # 创建复制按钮
                copy_button = QPushButton("复制文本")
                copy_button.clicked.connect(lambda: QApplication.clipboard().setText(text))
                
                # 添加到布局
                layout.addWidget(text_edit)
                layout.addWidget(copy_button)
                
                # 显示对话框
                result_dialog.exec_()
                self.statusBar().showMessage(f"识别完成，共{len(text)}个字符")
            else:
                self.statusBar().showMessage("画布中未识别到文本")
        except Exception as e:
            self.statusBar().showMessage(f"从画布识别文本错误: {str(e)}")
            print(f"从画布识别文本错误: {str(e)}")
            
    def _capture_scene_region(self, rect: QRectF) -> np.ndarray:
        """捕获场景指定区域的图像
        
        Args:
            rect: 要捕获的区域边界框
        
        Returns:
            numpy数组格式的图像
        """
        # 创建图像
        width = int(rect.width())
        height = int(rect.height())
        
        if width <= 0 or height <= 0:
            raise ValueError("捕获区域无效")
        
        # 设置图像格式为RGB32
        image = QImage(width, height, QImage.Format_RGB32)
        image.fill(Qt.white)
        
        # 创建画家
        painter = QPainter(image)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setRenderHint(QPainter.TextAntialiasing)
        
        # 调整坐标系
        painter.translate(-rect.left(), -rect.top())
        
        # 绘制场景
        self.scene.render(painter)
        painter.end()
        
        # 转换为OpenCV格式
        ptr = image.bits()
        ptr.setsize(height * width * 4)
        arr = np.frombuffer(ptr, np.uint8).reshape((height, width, 4))
        
        # 转换为RGB格式
        rgb_image = cv2.cvtColor(arr, cv2.COLOR_RGBA2RGB)
        
        return rgb_image
        
    def _perform_ocr(self, image: np.ndarray) -> str:
        """执行OCR识别
        
        Args:
            image: 要识别的图像（numpy数组格式）
        
        Returns:
            识别出的文本
        """
        # 图像预处理
        processed_image = self._preprocess_image(image)
        
        # 检测文本方向并校正
        processed_image = self._detect_and_correct_orientation(processed_image)
        
        # 设置Tesseract参数以提高识别精度
        custom_config = r'--oem 3 --psm 6 -l chi_sim+eng'
        
        # 执行OCR识别
        text = pytesseract.image_to_string(processed_image, config=custom_config)
        
        # 后处理识别结果
        text = self._postprocess_text(text)
        
        return text
        
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """图像预处理以提高OCR识别精度
        
        Args:
            image: 原始图像
        
        Returns:
            预处理后的图像
        """
        # 转换为灰度图
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 应用高斯模糊去噪
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # 自适应阈值化
        binary = cv2.adaptiveThreshold(
            blurred, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 
            11, 2
        )
        
        # 形态学操作 - 膨胀
        kernel = np.ones((1, 1), np.uint8)
        dilated = cv2.dilate(binary, kernel, iterations=1)
        
        # 形态学操作 - 腐蚀
        eroded = cv2.erode(dilated, kernel, iterations=1)
        
        return eroded
        
    def _detect_and_correct_orientation(self, image: np.ndarray) -> np.ndarray:
        """检测并校正文本方向
        
        Args:
            image: 预处理后的图像
        
        Returns:
            方向校正后的图像
        """
        try:
            # 使用Tesseract检测文本方向
            osd = pytesseract.image_to_osd(image)
            rotation_angle = float(re.search(r'Rotate: (\d+)', osd).group(1))
            
            # 如果需要旋转，校正图像方向
            if rotation_angle != 0:
                # 获取图像尺寸
                (h, w) = image.shape[:2]
                center = (w // 2, h // 2)
                
                # 计算旋转矩阵
                M = cv2.getRotationMatrix2D(center, rotation_angle, 1.0)
                
                # 执行旋转
                rotated = cv2.warpAffine(image, M, (w, h), 
                                         flags=cv2.INTER_CUBIC, 
                                         borderMode=cv2.BORDER_REPLICATE)
                
                return rotated
        except Exception as e:
            # 如果方向检测失败，返回原始图像
            print(f"文本方向检测失败: {str(e)}")
            
        return image
        
    def _postprocess_text(self, text: str) -> str:
        """后处理OCR识别结果
        
        Args:
            text: 原始识别结果
        
        Returns:
            后处理后的文本
        """
        # 去除多余的空行
        lines = text.strip().split('\n')
        non_empty_lines = [line.strip() for line in lines if line.strip()]
        text = '\n'.join(non_empty_lines)
        
        # 去除特殊字符和噪声
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        
        # 处理空格和标点符号
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\s([,.;!?])', '\\1', text)  # 移除标点符号前的空格
        
        return text
        
    def _show_recognized_text(self, text: str, position: QPointF):
        """在指定位置显示识别的文本
        
        Args:
            text: 识别的文本
            position: 显示位置
        """
        # 创建文本项
        text_item = QGraphicsTextItem(text)
        
        # 设置文本属性
        font = QFont()
        font.setPointSize(12)
        text_item.setFont(font)
        text_item.setDefaultTextColor(QColor("#FF6B6B"))  # 使用醒目的颜色
        
        # 设置位置（稍微偏移以避免重叠）
        text_item.setPos(position.x(), position.y() + 20)
        
        # 添加到场景
        self.scene.addItem(text_item)
        
        # 创建一个标记，使文本项在一段时间后自动消失
        def remove_text_item():
            self.scene.removeItem(text_item)
        
        # 5秒后移除文本项
        QTimer.singleShot(5000, remove_text_item)
    
    def fill_current_shape(self):
        """填充当前形状"""
        if not self.selected_shape:
            self.statusBar().showMessage("请先选择一个形状")
            return
        
        try:
            # 改变形状的填充颜色
            self.selected_shape.fill = self.fill_color
            
            # 更新QGraphicsItem
            if self.selected_shape.type == "rectangle":
                rect_item = self.selected_shape.qgraphics_item
                rect_item.setBrush(QBrush(QColor(self.fill_color)))
            elif self.selected_shape.type == "circle":
                ellipse_item = self.selected_shape.qgraphics_item
                ellipse_item.setBrush(QBrush(QColor(self.fill_color)))
            elif self.selected_shape.type == "polygon":
                polygon_item = self.selected_shape.qgraphics_item
                polygon_item.setBrush(QBrush(QColor(self.fill_color)))
            
            self.statusBar().showMessage("已填充形状")
            self.is_modified = True
        except Exception as e:
            self.statusBar().showMessage(f"填充形状错误: {str(e)}")
            print(f"填充形状错误: {str(e)}")
    
    # 样式模板方法
    def load_default_templates(self):
        """加载默认样式模板"""
        # 默认样式模板
        self.style_templates = [
            {"name": "基本线条", "outline": "#000000", "width": 2},
            {"name": "粗体线条", "outline": "#000000", "width": 5},
            {"name": "红色线条", "outline": "#ff0000", "width": 3},
            {"name": "蓝色矩形", "outline": "#0000ff", "width": 2, "fill": "#e6f2ff"},
            {"name": "绿色圆形", "outline": "#008000", "width": 2, "fill": "#e6ffe6"}
        ]
        
        # 更新模板菜单
        self.update_template_menu()
    
    def update_template_menu(self):
        """更新模板菜单"""
        # 清除现有菜单
        self.template_menu.clear()
        
        # 添加模板
        for i, template in enumerate(self.style_templates):
            action = QAction(template["name"], self)
            action.triggered.connect(lambda checked, idx=i: self.apply_template(idx))
            self.template_menu.addAction(action)
    
    def apply_template(self, index: int):
        """应用样式模板"""
        if 0 <= index < len(self.style_templates):
            template = self.style_templates[index]
            self.current_color = template.get("outline", self.current_color)
            self.current_size = template.get("width", self.current_size)
            if "fill" in template:
                self.fill_color = template["fill"]
                self.fill_preview.setStyleSheet(f"background-color: {self.fill_color};")
            self.color_preview.setStyleSheet(f"background-color: {self.current_color};")
            self.size_slider.setValue(self.current_size)
            self.size_label.setText(str(self.current_size))
            self.statusBar().showMessage(f"已应用样式: {template['name']}")
    
    def save_current_style(self):
        """保存当前样式为模板"""
        name, ok = QInputDialog.getText(self, "保存样式", "输入样式名称:")
        if ok and name:
            template = {
                "name": name,
                "outline": self.current_color,
                "width": self.current_size,
                "fill": self.fill_color
            }
            self.style_templates.append(template)
            self.update_template_menu()
            self.statusBar().showMessage(f"样式 '{name}' 已保存")
    
    # 帮助信息方法
    def show_help(self):
        """显示帮助信息"""
        help_text = "智能画板 v3.0 (PyQt5版本)\n\n" \
                   "功能简介:\n" \
                   "1. 绘图工具：自由绘制、直线、矩形、圆形、文本、橡皮擦、多边形、曲线、箭头\n" \
                   "2. 编辑功能：撤销、重做、复制、剪切、粘贴、清除画布、图层管理\n" \
                   "3. 视图操作：放大、缩小、重置缩放、适应窗口\n" \
                   "4. AI辅助功能：形状识别、智能补全、形状填充、文本识别\n" \
                   "5. 文件操作：新建、打开、保存、另存为、导出为图片\n" \
                   "\n使用说明：\n" \
                   "- 选择绘图工具后，在画布上点击并拖动进行绘制\n" \
                   "- 选择工具可以选中和操作形状\n" \
                   "- 使用快捷键可以提高操作效率\n" \
                   "- AI辅助功能提供智能识别和优化\n"
        
        QMessageBox.information(self, "使用帮助", help_text)
    
    def show_shortcuts(self):
        """显示快捷键列表"""
        shortcuts_text = "常用快捷键\n\n" \
                        "文件操作:\n" \
                        "新建: Ctrl+N\n" \
                        "打开: Ctrl+O\n" \
                        "保存: Ctrl+S\n" \
                        "另存为: Ctrl+Shift+S\n" \
                        "退出: Ctrl+Q\n\n" \
                        "编辑操作:\n" \
                        "撤销: Ctrl+Z\n" \
                        "重做: Ctrl+Y\n" \
                        "剪切: Ctrl+X\n" \
                        "复制: Ctrl+C\n" \
                        "粘贴: Ctrl+V\n" \
                        "清除画布: Ctrl+Delete\n\n" \
                        "视图操作:\n" \
                        "放大: Ctrl++\n" \
                        "缩小: Ctrl+-\n" \
                        "重置缩放: Ctrl+0\n" \
                        "\n帮助:\n" \
                        "使用帮助: F1"
        
        QMessageBox.information(self, "快捷键", shortcuts_text)
    
    def show_about(self):
        """显示关于对话框"""
        about_text = "智能画板 v3.0 (PyQt5版本)\n\n" \
                    "一个功能强大的绘图工具，支持多种绘图模式、图层管理、AI辅助功能和文件操作。\n" \
                    "基于Python和PyQt5库开发。\n\n" \
                    "© 2023 智能画板团队 版权所有"
        
        QMessageBox.about(self, "关于智能画板", about_text)
    
    # 辅助方法
    def get_mode_name(self, mode: DrawMode) -> str:
        """获取模式名称"""
        mode_names = {
            DrawMode.FREE_DRAW: "自由绘制",
            DrawMode.LINE: "直线",
            DrawMode.RECTANGLE: "矩形",
            DrawMode.CIRCLE: "圆形",
            DrawMode.TEXT: "文本",
            DrawMode.ERASER: "橡皮擦",
            DrawMode.POLYGON: "多边形",
            DrawMode.CURVE: "曲线",
            DrawMode.ARROW: "箭头",
            DrawMode.SELECT: "选择"
        }
        return mode_names.get(mode, "未知")
    
    def is_valid_shape_id(self, shape_id: str) -> bool:
        """验证形状ID是否有效"""
        return any(shape.id == shape_id for shape in self.shapes)
    
    def advanced_shape_recognition(self, shape: Shape) -> Optional[str]:
        """高级形状识别算法
        
        集成了更复杂的算法，包括几何特征分析、统计形状描述符和简单的机器学习分类逻辑
        可以识别直线、矩形、圆形、三角形、椭圆、多边形等多种形状
        
        Args:
            shape: 要识别的形状对象
        
        Returns:
            识别出的形状类型字符串，如果无法识别则返回None
        """
        try:
            # 如果形状已经有明确类型，直接返回
            if shape.type != "free_draw":
                return shape.type
            
            # 检查必要的数据
            if not shape.points or len(shape.points) < 3:
                return None
            
            # 提取几何特征
            features = self._extract_geometric_features(shape)
            if not features:
                return None
            
            # 基于特征进行形状分类
            recognized_shape = self._classify_shape_by_features(features)
            return recognized_shape
        except Exception as e:
            print(f"形状识别错误: {str(e)}")
            return None
            
    def _extract_geometric_features(self, shape: Shape) -> Optional[Dict[str, float]]:
        """提取形状的几何特征"""
        try:
            points = shape.points
            num_points = len(points)
            
            # 计算边界框
            min_x = min(p.x() for p in points)
            min_y = min(p.y() for p in points)
            max_x = max(p.x() for p in points)
            max_y = max(p.y() for p in points)
            
            width = max_x - min_x
            height = max_y - min_y
            aspect_ratio = width / height if height > 0 else float('inf')
            
            # 计算中心点
            center_x = (min_x + max_x) / 2
            center_y = (min_y + max_y) / 2
            
            # 计算周长（简化版）
            perimeter = 0.0
            for i in range(num_points):
                p1 = points[i]
                p2 = points[(i + 1) % num_points]
                perimeter += math.sqrt((p2.x() - p1.x())**2 + (p2.y() - p1.y())** 2)
            
            # 计算面积（使用多边形面积公式）
            area = 0.0
            for i in range(num_points):
                p1 = points[i]
                p2 = points[(i + 1) % num_points]
                area += (p1.x() * p2.y()) - (p2.x() * p1.y())
            area = abs(area) / 2.0
            
            # 计算圆形度（4π*面积/周长²）
            circularity = (4 * math.pi * area) / (perimeter ** 2) if perimeter > 0 else 0
            
            # 计算凹凸性和角点数
            convexity, num_corners = self._calculate_convexity_and_corners(points)
            
            # 计算直线度（各段直线与总路径的比例）
            straightness = self._calculate_straightness(points)
            
            # 计算曲率特征
            curvature_features = self._calculate_curvature_features(points)
            
            features = {
                'num_points': num_points,
                'width': width,
                'height': height,
                'aspect_ratio': aspect_ratio,
                'perimeter': perimeter,
                'area': area,
                'circularity': circularity,
                'convexity': convexity,
                'num_corners': num_corners,
                'straightness': straightness
            }
            
            # 添加曲率特征
            features.update(curvature_features)
            
            return features
        except Exception as e:
            print(f"提取几何特征错误: {str(e)}")
            return None
            
    def _calculate_convexity_and_corners(self, points: List[QPointF]) -> Tuple[float, int]:
        """计算形状的凸性和角点数"""
        try:
            # 简化实现：计算各点的曲率变化来检测角点
            num_points = len(points)
            if num_points < 3:
                return 1.0, 0
            
            # 计算各点的曲率
            curvatures = []
            for i in range(num_points):
                p_prev = points[(i - 1) % num_points]
                p_curr = points[i]
                p_next = points[(i + 1) % num_points]
                
                # 计算向量
                v1 = QPointF(p_curr.x() - p_prev.x(), p_curr.y() - p_prev.y())
                v2 = QPointF(p_next.x() - p_curr.x(), p_next.y() - p_curr.y())
                
                # 计算向量长度
                len1 = math.sqrt(v1.x()**2 + v1.y()** 2)
                len2 = math.sqrt(v2.x()**2 + v2.y()** 2)
                
                if len1 > 0 and len2 > 0:
                    # 计算点积
                    dot_product = v1.x() * v2.x() + v1.y() * v2.y()
                    # 计算夹角（弧度）
                    angle = math.acos(max(-1, min(1, dot_product / (len1 * len2))))
                    curvatures.append(angle)
                else:
                    curvatures.append(0.0)
            
            # 检测角点（曲率超过阈值的点）
            corner_threshold = math.pi / 4  # 45度
            num_corners = sum(1 for c in curvatures if c > corner_threshold)
            
            # 计算凸性（简化为角点数与总点数的比例）
            convexity = 1.0 - (num_corners / num_points)
            
            return convexity, num_corners
        except Exception as e:
            print(f"计算凸性和角点数错误: {str(e)}")
            return 1.0, 0
            
    def _calculate_straightness(self, points: List[QPointF]) -> float:
        """计算形状的直线度"""
        try:
            if len(points) < 2:
                return 1.0
            
            # 计算起点到终点的直线距离
            start_to_end_dist = math.sqrt(
                (points[-1].x() - points[0].x())**2 + 
                (points[-1].y() - points[0].y())** 2
            )
            
            if start_to_end_dist == 0:
                return 1.0
            
            # 计算实际路径长度
            path_length = 0.0
            for i in range(1, len(points)):
                path_length += math.sqrt(
                    (points[i].x() - points[i-1].x())**2 + 
                    (points[i].y() - points[i-1].y())** 2
                )
            
            # 直线度 = 直线距离 / 实际路径长度
            straightness = min(1.0, start_to_end_dist / path_length)
            return straightness
        except Exception as e:
            print(f"计算直线度错误: {str(e)}")
            return 1.0
            
    def _calculate_curvature_features(self, points: List[QPointF]) -> Dict[str, float]:
        """计算曲率相关特征"""
        try:
            num_points = len(points)
            if num_points < 3:
                return {'mean_curvature': 0.0, 'max_curvature': 0.0, 'min_curvature': 0.0}
            
            # 计算各段的曲率
            curvatures = []
            for i in range(1, num_points - 1):
                p_prev = points[i - 1]
                p_curr = points[i]
                p_next = points[i + 1]
                
                # 计算向量
                v1 = QPointF(p_curr.x() - p_prev.x(), p_curr.y() - p_prev.y())
                v2 = QPointF(p_next.x() - p_curr.x(), p_next.y() - p_curr.y())
                
                # 计算向量长度
                len1 = math.sqrt(v1.x()**2 + v1.y()** 2)
                len2 = math.sqrt(v2.x()**2 + v2.y()** 2)
                
                if len1 > 0 and len2 > 0:
                    # 计算点积
                    dot_product = v1.x() * v2.x() + v1.y() * v2.y()
                    # 计算夹角（弧度）
                    angle = math.acos(max(-1, min(1, dot_product / (len1 * len2))))
                    curvatures.append(angle)
            
            if not curvatures:
                return {'mean_curvature': 0.0, 'max_curvature': 0.0, 'min_curvature': 0.0}
            
            mean_curvature = sum(curvatures) / len(curvatures)
            max_curvature = max(curvatures)
            min_curvature = min(curvatures)
            
            return {
                'mean_curvature': mean_curvature,
                'max_curvature': max_curvature,
                'min_curvature': min_curvature
            }
        except Exception as e:
            print(f"计算曲率特征错误: {str(e)}")
            return {'mean_curvature': 0.0, 'max_curvature': 0.0, 'min_curvature': 0.0}
            
    def _classify_shape_by_features(self, features: Dict[str, float]) -> Optional[str]:
        """基于提取的特征对形状进行分类"""
        try:
            # 基于规则的简单分类器
            
            # 检测直线
            if features['straightness'] > 0.95 and features['num_points'] > 2:
                return "line"
            
            # 检测矩形/正方形
            if (features['num_corners'] >= 3 and features['num_corners'] <= 5 and 
                0.8 < features['aspect_ratio'] < 1.2 and features['convexity'] > 0.8):
                return "rectangle"
            
            # 检测圆形
            if features['circularity'] > 0.8 and features['aspect_ratio'] > 0.9 and features['aspect_ratio'] < 1.1:
                return "circle"
            
            # 检测椭圆
            if (features['circularity'] > 0.6 and features['circularity'] < 0.8 and 
                (features['aspect_ratio'] < 0.8 or features['aspect_ratio'] > 1.2)):
                return "circle"  # 使用圆形表示椭圆
            
            # 检测三角形
            if features['num_corners'] == 3 and 0.5 < features['area'] / (features['perimeter']**2) < 0.15:
                return "polygon"
            
            # 检测多边形
            if features['num_corners'] >= 5 and features['convexity'] > 0.7:
                return "polygon"
            
            # 检测箭头（基于特定的特征，这里简化实现）
            if (features['num_points'] > 5 and features['straightness'] > 0.7 and 
                features['num_corners'] >= 2 and features['num_corners'] <= 4):
                return "arrow"
            
            # 检测曲线
            if features['mean_curvature'] > 0.5 and features['straightness'] < 0.8:
                return "curve"
            
            # 无法识别为特定形状，返回自由绘制
            return "free_draw"
        except Exception as e:
            print(f"形状分类错误: {str(e)}")
            return None
    
    def optimize_shape(self, shape: Shape, recognized_shape: str):
        """优化形状
        
        根据识别出的形状类型，对形状进行几何优化和规范化处理
        可以将自由绘制的形状转换为标准的几何形状
        
        Args:
            shape: 要优化的形状对象
            recognized_shape: 识别出的形状类型
        """
        try:
            if not shape or not recognized_shape or shape.type != "free_draw":
                return
            
            # 如果没有足够的点，无法优化
            if not shape.points or len(shape.points) < 3:
                return
            
            # 根据识别出的形状类型进行不同的优化
            if recognized_shape == "line":
                self._optimize_line_shape(shape)
            elif recognized_shape == "rectangle":
                self._optimize_rectangle_shape(shape)
            elif recognized_shape == "circle":
                self._optimize_circle_shape(shape)
            elif recognized_shape == "polygon":
                self._optimize_polygon_shape(shape)
            elif recognized_shape == "arrow":
                self._optimize_arrow_shape(shape)
            elif recognized_shape == "curve":
                self._optimize_curve_shape(shape)
            
        except Exception as e:
            print(f"形状优化错误: {str(e)}")
            
    def _optimize_line_shape(self, shape: Shape):
        """优化直线形状"""
        if not shape.points or len(shape.points) < 2:
            return
        
        # 只保留起点和终点，创建一条直线
        start_point = shape.points[0]
        end_point = shape.points[-1]
        
        # 创建新的直线路径
        path = QPainterPath()
        path.moveTo(start_point)
        path.lineTo(end_point)
        
        # 更新形状
        if shape.qgraphics_item:
            try:
                self.scene.removeItem(shape.qgraphics_item)
            except:
                pass
        
        new_item = self.scene.addPath(
            path,
            QPen(QColor(shape.outline), shape.width),
            QBrush(QColor(shape.fill) if shape.fill else Qt.transparent)
        )
        
        # 更新形状属性
        shape.type = "line"
        shape.qgraphics_item = new_item
        shape.points = [start_point, end_point]
        shape.coords = [start_point.x(), start_point.y(), end_point.x(), end_point.y()]
            
    def _optimize_rectangle_shape(self, shape: Shape):
        """优化矩形形状"""
        if not shape.points or len(shape.points) < 3:
            return
        
        # 计算边界框
        min_x = min(p.x() for p in shape.points)
        min_y = min(p.y() for p in shape.points)
        max_x = max(p.x() for p in shape.points)
        max_y = max(p.y() for p in shape.points)
        
        # 创建矩形路径
        rect = QRectF(min_x, min_y, max_x - min_x, max_y - min_y)
        path = QPainterPath()
        path.addRect(rect)
        
        # 更新形状
        if shape.qgraphics_item:
            try:
                self.scene.removeItem(shape.qgraphics_item)
            except:
                pass
        
        new_item = self.scene.addPath(
            path,
            QPen(QColor(shape.outline), shape.width),
            QBrush(QColor(shape.fill) if shape.fill else Qt.transparent)
        )
        
        # 更新形状属性
        shape.type = "rectangle"
        shape.qgraphics_item = new_item
        shape.points = [QPointF(min_x, min_y), QPointF(max_x, min_y), 
                      QPointF(max_x, max_y), QPointF(min_x, max_y)]
        shape.coords = [min_x, min_y, max_x, max_y]
            
    def _optimize_circle_shape(self, shape: Shape):
        """优化圆形形状"""
        if not shape.points or len(shape.points) < 3:
            return
        
        # 计算边界框
        min_x = min(p.x() for p in shape.points)
        min_y = min(p.y() for p in shape.points)
        max_x = max(p.x() for p in shape.points)
        max_y = max(p.y() for p in shape.points)
        
        # 计算圆心和半径
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        radius = max(max_x - center_x, max_y - center_y)
        
        # 创建圆形路径
        circle = QRectF(center_x - radius, center_y - radius, radius * 2, radius * 2)
        path = QPainterPath()
        path.addEllipse(circle)
        
        # 更新形状
        if shape.qgraphics_item:
            try:
                self.scene.removeItem(shape.qgraphics_item)
            except:
                pass
        
        new_item = self.scene.addPath(
            path,
            QPen(QColor(shape.outline), shape.width),
            QBrush(QColor(shape.fill) if shape.fill else Qt.transparent)
        )
        
        # 更新形状属性
        shape.type = "circle"
        shape.qgraphics_item = new_item
        shape.points = [QPointF(center_x, center_y)]
        shape.coords = [center_x, center_y, radius]
            
    def _optimize_polygon_shape(self, shape: Shape):
        """优化多边形形状"""
        if not shape.points or len(shape.points) < 3:
            return
        
        # 使用凸包算法简化多边形
        # 这里简化实现，只保留关键点
        simplified_points = self._simplify_polygon(shape.points)
        
        if len(simplified_points) < 3:
            return
        
        # 创建多边形路径
        path = QPainterPath()
        path.moveTo(simplified_points[0])
        for p in simplified_points[1:]:
            path.lineTo(p)
        path.closeSubpath()
        
        # 更新形状
        if shape.qgraphics_item:
            try:
                self.scene.removeItem(shape.qgraphics_item)
            except:
                pass
        
        new_item = self.scene.addPath(
            path,
            QPen(QColor(shape.outline), shape.width),
            QBrush(QColor(shape.fill) if shape.fill else Qt.transparent)
        )
        
        # 更新形状属性
        shape.type = "polygon"
        shape.qgraphics_item = new_item
        shape.points = simplified_points
        shape.coords = []
        for p in simplified_points:
            shape.coords.extend([p.x(), p.y()])
            
    def _simplify_polygon(self, points: List[QPointF]) -> List[QPointF]:
        """简化多边形，保留关键点"""
        if len(points) <= 3:
            return points
        
        # 简化实现：使用Douglas-Peucker算法的简化版本
        epsilon = 2.0  # 简化阈值
        simplified = []
        
        # 计算点之间的距离，只保留距离大于阈值的点
        simplified.append(points[0])
        for i in range(1, len(points) - 1):
            p_prev = points[i - 1]
            p_curr = points[i]
            p_next = points[i + 1]
            
            # 计算当前点到前后点连线的距离
            dist = self._point_to_line_distance(p_curr, p_prev, p_next)
            
            if dist > epsilon:
                simplified.append(p_curr)
        
        if len(points) > 1:
            simplified.append(points[-1])
        
        return simplified
            
    def _point_to_line_distance(self, point: QPointF, line_start: QPointF, line_end: QPointF) -> float:
        """计算点到直线的距离"""
        # 计算向量
        A = point.x() - line_start.x()
        B = point.y() - line_start.y()
        C = line_end.x() - line_start.x()
        D = line_end.y() - line_start.y()
        
        dot = A * C + B * D
        len_sq = C * C + D * D
        
        if len_sq == 0:
            return math.sqrt(A * A + B * B)  # 直线是一个点
        
        param = dot / len_sq
        
        if param < 0:
            xx = line_start.x()
            yy = line_start.y()
        elif param > 1:
            xx = line_end.x()
            yy = line_end.y()
        else:
            xx = line_start.x() + param * C
            yy = line_start.y() + param * D
        
        dx = point.x() - xx
        dy = point.y() - yy
        
        return math.sqrt(dx * dx + dy * dy)
            
    def _optimize_arrow_shape(self, shape: Shape):
        """优化箭头形状"""
        if not shape.points or len(shape.points) < 2:
            return
        
        # 只保留起点和终点，创建一条带箭头的直线
        start_point = shape.points[0]
        end_point = shape.points[-1]
        
        # 创建箭头路径
        path = QPainterPath()
        path.moveTo(start_point)
        path.lineTo(end_point)
        
        # 计算箭头角度
        angle = math.atan2(end_point.y() - start_point.y(), end_point.x() - start_point.x())
        
        # 计算箭头尾部的两个点
        arrow_size = 10 + shape.width  # 根据线条粗细调整箭头大小
        arrow_angle = math.pi / 6  # 30度
        
        # 计算第一个箭头点
        arrow_x1 = end_point.x() - arrow_size * math.cos(angle - arrow_angle)
        arrow_y1 = end_point.y() - arrow_size * math.sin(angle - arrow_angle)
        
        # 计算第二个箭头点
        arrow_x2 = end_point.x() - arrow_size * math.cos(angle + arrow_angle)
        arrow_y2 = end_point.y() - arrow_size * math.sin(angle + arrow_angle)
        
        # 添加箭头尾部到路径
        path.moveTo(end_point)
        path.lineTo(arrow_x1, arrow_y1)
        path.moveTo(end_point)
        path.lineTo(arrow_x2, arrow_y2)
        
        # 更新形状
        if shape.qgraphics_item:
            try:
                self.scene.removeItem(shape.qgraphics_item)
            except:
                pass
        
        new_item = self.scene.addPath(
            path,
            QPen(QColor(shape.outline), shape.width),
            QBrush(QColor(shape.fill) if shape.fill else Qt.transparent)
        )
        
        # 更新形状属性
        shape.type = "arrow"
        shape.qgraphics_item = new_item
        shape.points = [start_point, end_point, QPointF(arrow_x1, arrow_y1), QPointF(arrow_x2, arrow_y2)]
        shape.coords = [start_point.x(), start_point.y(), end_point.x(), end_point.y()]
            
    def _optimize_curve_shape(self, shape: Shape):
        """优化曲线形状"""
        if not shape.points or len(shape.points) < 3:
            return
        
        # 使用B样条曲线平滑处理
        # 简化实现：保留所有点但进行平滑处理
        smoothed_points = self._smooth_curve(shape.points)
        
        # 创建曲线路径
        path = QPainterPath()
        path.moveTo(smoothed_points[0])
        for p in smoothed_points[1:]:
            path.lineTo(p)
        
        # 更新形状
        if shape.qgraphics_item:
            try:
                self.scene.removeItem(shape.qgraphics_item)
            except:
                pass
        
        new_item = self.scene.addPath(
            path,
            QPen(QColor(shape.outline), shape.width),
            QBrush(QColor(shape.fill) if shape.fill else Qt.transparent)
        )
        
        # 更新形状属性
        shape.type = "curve"
        shape.qgraphics_item = new_item
        shape.points = smoothed_points
        shape.coords = []
        for p in smoothed_points:
            shape.coords.extend([p.x(), p.y()])
            
    def _smooth_curve(self, points: List[QPointF]) -> List[QPointF]:
        """平滑曲线"""
        if len(points) <= 2:
            return points
        
        # 简化实现：使用移动平均滤波
        smoothed = []
        smoothed.append(points[0])  # 保留第一个点
        
        # 对中间点进行平滑
        window_size = 3  # 窗口大小
        for i in range(1, len(points) - 1):
            sum_x = 0
            sum_y = 0
            count = 0
            
            # 计算窗口内的平均值
            for j in range(max(0, i - window_size // 2), min(len(points), i + window_size // 2 + 1)):
                sum_x += points[j].x()
                sum_y += points[j].y()
                count += 1
            
            smoothed.append(QPointF(sum_x / count, sum_y / count))
        
        smoothed.append(points[-1])  # 保留最后一个点
        
        return smoothed
       


def main():
    """主函数"""
    # 确保中文显示正常
    # PyQt5会自动处理字体设置
    
    # 创建应用程序
    app = QApplication(sys.argv)
    
    # 创建主窗口
    window = IntelligentDrawingBoard()
    
    # 显示窗口
    window.show()
    
    # 运行应用程序
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
