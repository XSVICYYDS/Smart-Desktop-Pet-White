"""
图片裁剪组件 - 支持图片预览和裁剪
"""

import os
from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, 
                             QFileDialog, QScrollArea)
from PyQt5.QtCore import Qt, QRect, QPoint
from PyQt5.QtGui import QPixmap, QPainter, QColor, QPen, QFont


class ImageCropper(QWidget):
    """
    图片裁剪组件
    """
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    ACCEPTED_FORMATS = ('.jpg', '.jpeg', '.png')

    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.original_pixmap = None
        self.current_pixmap = None
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(16)
        
        # 图片预览区域
        self.image_label = QLabel("点击上传图片")
        self.image_label.setAlignment(Qt.AlignCenter)
        self.image_label.setMinimumSize(200, 200)
        self.image_label.setStyleSheet("""
            QLabel {
                border: 2px dashed #E0E0E0;
                border-radius: 8px;
                background-color: #F9F9F9;
                color: #999999;
                font-size: 14px;
            }
        """)
        self.image_label.setMinimumSize(200, 200)
        layout.addWidget(self.image_label)
        
        # 按钮区域
        button_layout = QHBoxLayout()
        
        self.upload_btn = QPushButton("上传/更换图片")
        self.upload_btn.setMinimumSize(44, 44)
        self.upload_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #FF85C2;
            }
        """)
        self.upload_btn.clicked.connect(self._upload_image)
        button_layout.addWidget(self.upload_btn)
        
        layout.addLayout(button_layout)
    
    def _upload_image(self):
        """上传图片"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "选择头像图片",
            "",
            "图片文件 (*.jpg *.jpeg *.png)"
        )
        
        if file_path:
            file_ext = os.path.splitext(file_path)[1].lower()
            
            if file_ext not in self.ACCEPTED_FORMATS:
                from PyQt5.QtWidgets import QMessageBox
                QMessageBox.warning(self, "格式错误", 
                    "仅支持 JPG、JPEG、PNG 格式的图片")
                return
            
            file_size = os.path.getsize(file_path)
            if file_size > self.MAX_FILE_SIZE:
                from PyQt5.QtWidgets import QMessageBox
                QMessageBox.warning(self, "文件过大", 
                    "图片文件不能超过5MB")
                return
            
            self.original_pixmap = QPixmap(file_path)
            self._display_image()
    
    def _display_image(self):
        """显示图片"""
        if self.original_pixmap:
            scaled_pixmap = self.original_pixmap.scaled(
                200, 200,
                Qt.KeepAspectRatio,
                Qt.SmoothTransformation
            )
            self.image_label.setPixmap(scaled_pixmap)
            self.image_label.setStyleSheet("""
                QLabel {
                    border: 2px solid #FF69B4;
                    border-radius: 8px;
                    background-color: #F9F9F9;
                }
            """)
    
    def get_pixmap(self):
        """获取当前图片"""
        return self.original_pixmap
