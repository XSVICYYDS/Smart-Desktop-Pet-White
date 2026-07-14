import os
from PyQt5.QtGui import QPainter, QPen, QColor, QImage, QPixmap
from PyQt5.QtWidgets import (QWidget, QDialog, QPushButton, QComboBox, 
                             QSlider, QVBoxLayout, QHBoxLayout, QFileDialog,
                             QMessageBox, QLabel)
from PyQt5.QtCore import Qt, QPoint, QSize

class ScreenPen(QDialog):
    """屏幕笔工具
    
    提供基础绘图功能，包括铅笔、直线、矩形、圆形等
    """
    def __init__(self, parent=None):
        """初始化屏幕笔工具
        
        Args:
            parent: 父窗口对象
        """
        try:
            super(ScreenPen, self).__init__(parent)
            self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool)
            self.setAttribute(Qt.WA_TranslucentBackground)
            
            # 初始化绘图属性
            self.drawing = False
            self.last_point = QPoint()
            self.current_point = QPoint()
            self.current_tool = "铅笔"
            self.current_color = QColor(255, 0, 0)
            self.line_width = 3
            
            # 初始化撤销历史记录
            self.undo_history = []
            self.redo_history = []
            self.max_history = 10
            
            # 初始化画布
            self.initCanvas()
            
            # 初始化UI
            self.initUI()
            
            # 记录初始状态用于撤销
            self.saveState()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"初始化屏幕笔工具错误: {e}")
    
    def initCanvas(self):
        """初始化画布
        
        创建一个与屏幕大小相同的画布
        """
        try:
            from PyQt5.QtWidgets import QApplication
            screen = QApplication.desktop().screenGeometry()
            self.canvas = QImage(screen.size(), QImage.Format_ARGB32)
            self.canvas.fill(Qt.transparent)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"初始化画布错误: {e}")
    
    def initUI(self):
        """初始化UI
        
        创建工具栏，包括工具选择、颜色选择、线条粗细调整等
        """
        try:
            # 创建主布局
            main_layout = QVBoxLayout(self)
            
            # 创建工具栏
            toolbar = QHBoxLayout()
            
            # 工具选择
            tool_label = QLabel("工具:")
            toolbar.addWidget(tool_label)
            
            self.tool_combobox = QComboBox()
            self.tool_combobox.addItems(["铅笔", "直线", "矩形", "圆形", "橡皮擦"])
            self.tool_combobox.currentTextChanged.connect(self.changeTool)
            toolbar.addWidget(self.tool_combobox)
            
            # 颜色选择
            color_label = QLabel("颜色:")
            toolbar.addWidget(color_label)
            
            self.color_combobox = QComboBox()
            colors = [
                "红色", "绿色", "蓝色", "黄色", "紫色", "橙色", "黑色", "白色",
                "粉色", "青色", "棕色", "灰色", "深绿", "深蓝", "深红", "浅灰"
            ]
            color_values = [
                QColor(255, 0, 0), QColor(0, 255, 0), QColor(0, 0, 255), QColor(255, 255, 0),
                QColor(128, 0, 128), QColor(255, 165, 0), QColor(0, 0, 0), QColor(255, 255, 255),
                QColor(255, 192, 203), QColor(0, 255, 255), QColor(165, 42, 42), QColor(128, 128, 128),
                QColor(0, 128, 0), QColor(0, 0, 128), QColor(128, 0, 0), QColor(211, 211, 211)
            ]
            self.color_combobox.addItems(colors)
            self.color_combobox.currentIndexChanged.connect(lambda index: self.changeColor(color_values[index]))
            toolbar.addWidget(self.color_combobox)
            
            # 线条粗细调整
            width_label = QLabel("线条粗细:")
            toolbar.addWidget(width_label)
            
            self.width_slider = QSlider(Qt.Horizontal)
            self.width_slider.setRange(1, 10)
            self.width_slider.setValue(3)
            self.width_slider.valueChanged.connect(self.changeLineWidth)
            toolbar.addWidget(self.width_slider)
            
            # 撤销/重做按钮
            self.undo_button = QPushButton("撤销")
            self.undo_button.clicked.connect(self.undo)
            toolbar.addWidget(self.undo_button)
            
            self.redo_button = QPushButton("重做")
            self.redo_button.clicked.connect(self.redo)
            toolbar.addWidget(self.redo_button)
            
            # 清除画布按钮
            self.clear_button = QPushButton("清除")
            self.clear_button.clicked.connect(self.clearCanvas)
            toolbar.addWidget(self.clear_button)
            
            # 保存按钮
            self.save_button = QPushButton("保存")
            self.save_button.clicked.connect(self.saveCanvas)
            toolbar.addWidget(self.save_button)
            
            # 退出按钮
            self.exit_button = QPushButton("退出")
            self.exit_button.clicked.connect(self.close)
            toolbar.addWidget(self.exit_button)
            
            # 将工具栏添加到主布局
            main_layout.addLayout(toolbar)
            
            # 设置窗口大小和位置
            from PyQt5.QtWidgets import QApplication
            screen = QApplication.desktop().screenGeometry()
            self.setGeometry(screen)
        except Exception as e:
            QMessageBox.warning(self, "错误", f"初始化UI错误: {e}")
    
    def changeTool(self, tool):
        """更改绘图工具
        
        Args:
            tool: 工具名称
        """
        self.current_tool = tool
    
    def changeColor(self, color):
        """更改绘图颜色
        
        Args:
            color: QColor对象
        """
        self.current_color = color
    
    def changeLineWidth(self, width):
        """更改线条粗细
        
        Args:
            width: 线条粗细值
        """
        self.line_width = width
    
    def saveState(self):
        """保存当前画布状态到撤销历史记录
        """
        # 添加当前状态到撤销历史记录
        self.undo_history.append(self.canvas.copy())
        
        # 限制撤销历史记录长度
        if len(self.undo_history) > self.max_history:
            self.undo_history.pop(0)
        
        # 清空重做历史记录
        self.redo_history = []
    
    def undo(self):
        """撤销操作
        """
        if self.undo_history:
            # 保存当前状态到重做历史记录
            self.redo_history.append(self.canvas.copy())
            
            # 恢复上一个状态
            self.canvas = self.undo_history.pop()
            self.update()
    
    def redo(self):
        """重做操作
        """
        if self.redo_history:
            # 保存当前状态到撤销历史记录
            self.undo_history.append(self.canvas.copy())
            
            # 恢复下一个状态
            self.canvas = self.redo_history.pop()
            self.update()
    
    def clearCanvas(self):
        """清除画布
        """
        # 保存当前状态到撤销历史记录
        self.saveState()
        
        # 清除画布
        self.canvas.fill(Qt.transparent)
        self.update()
    
    def saveCanvas(self):
        """保存画布
        
        将画布保存为图片文件
        """
        # 显示文件保存对话框
        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "保存绘图",
            "",
            "PNG 文件 (*.png);;JPG 文件 (*.jpg);;所有文件 (*.*)"
        )
        
        if file_path:
            # 保存画布
            if self.canvas.save(file_path):
                QMessageBox.information(self, "保存成功", f"绘图已保存到:\n{file_path}")
            else:
                QMessageBox.error(self, "保存失败", "保存绘图时发生错误")
    
    def mousePressEvent(self, event):
        """鼠标按下事件处理
        
        Args:
            event: 鼠标事件对象
        """
        try:
            if event.button() == Qt.LeftButton:
                self.drawing = True
                self.last_point = event.pos()
                self.current_point = event.pos()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"鼠标按下事件处理错误: {e}")
    
    def mouseMoveEvent(self, event):
        """鼠标移动事件处理
        
        Args:
            event: 鼠标事件对象
        """
        try:
            if event.buttons() & Qt.LeftButton and self.drawing:
                if self.current_tool == "铅笔" or self.current_tool == "橡皮擦":
                    painter = QPainter(self.canvas)
                    if self.current_tool == "橡皮擦":
                        # 橡皮擦使用透明颜色
                        painter.setPen(QPen(Qt.transparent, self.line_width, Qt.SolidLine, Qt.RoundCap, Qt.RoundJoin))
                        # 使用擦除模式
                        painter.setCompositionMode(QPainter.CompositionMode_Clear)
                    else:
                        painter.setPen(QPen(self.current_color, self.line_width, Qt.SolidLine, Qt.RoundCap, Qt.RoundJoin))
                    painter.drawLine(self.last_point, event.pos())
                    painter.end()
                    self.last_point = event.pos()
                    self.update()
                else:
                    # 对于直线、矩形和圆形工具，只更新当前点并触发重绘
                    self.current_point = event.pos()
                    self.update()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"鼠标移动事件处理错误: {e}")
    
    def mouseReleaseEvent(self, event):
        """鼠标释放事件处理
        
        Args:
            event: 鼠标事件对象
        """
        try:
            if event.button() == Qt.LeftButton and self.drawing:
                self.drawing = False
                
                # 对于直线、矩形和圆形工具，保存最终绘制结果
                if self.current_tool in ["直线", "矩形", "圆形"]:
                    painter = QPainter(self.canvas)
                    if self.current_tool == "橡皮擦":
                        # 橡皮擦使用透明颜色
                        painter.setPen(QPen(Qt.transparent, self.line_width, Qt.SolidLine, Qt.RoundCap, Qt.RoundJoin))
                        # 使用擦除模式
                        painter.setCompositionMode(QPainter.CompositionMode_Clear)
                    else:
                        painter.setPen(QPen(self.current_color, self.line_width, Qt.SolidLine, Qt.RoundCap, Qt.RoundJoin))
                    
                    if self.current_tool == "直线":
                        painter.drawLine(self.last_point, event.pos())
                    elif self.current_tool == "矩形":
                        painter.drawRect(min(self.last_point.x(), event.pos().x()), 
                                       min(self.last_point.y(), event.pos().y()), 
                                       abs(self.last_point.x() - event.pos().x()), 
                                       abs(self.last_point.y() - event.pos().y()))
                    elif self.current_tool == "圆形":
                        painter.drawEllipse(min(self.last_point.x(), event.pos().x()), 
                                          min(self.last_point.y(), event.pos().y()), 
                                          abs(self.last_point.x() - event.pos().x()), 
                                          abs(self.last_point.y() - event.pos().y()))
                    
                    painter.end()
                    self.update()
                
                # 保存当前状态到撤销历史记录
                self.saveState()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"鼠标释放事件处理错误: {e}")
    
    def paintEvent(self, event):
        """绘制事件处理
        
        Args:
            event: 绘制事件对象
        """
        try:
            painter = QPainter(self)
            # 绘制画布内容
            painter.drawImage(0, 0, self.canvas)
            
            # 绘制临时图形（直线、矩形、圆形）
            if self.drawing and self.current_tool in ["直线", "矩形", "圆形"]:
                painter.setPen(QPen(self.current_color, self.line_width, Qt.SolidLine, Qt.RoundCap, Qt.RoundJoin))
                
                if self.current_tool == "直线":
                    painter.drawLine(self.last_point, self.current_point)
                elif self.current_tool == "矩形":
                    painter.drawRect(min(self.last_point.x(), self.current_point.x()), 
                                   min(self.last_point.y(), self.current_point.y()), 
                                   abs(self.last_point.x() - self.current_point.x()), 
                                   abs(self.last_point.y() - self.current_point.y()))
                elif self.current_tool == "圆形":
                    painter.drawEllipse(min(self.last_point.x(), self.current_point.x()), 
                                      min(self.last_point.y(), self.current_point.y()), 
                                      abs(self.last_point.x() - self.current_point.x()), 
                                      abs(self.last_point.y() - self.current_point.y()))
            
            painter.end()
        except Exception as e:
            QMessageBox.warning(self, "错误", f"绘制事件处理错误: {e}")