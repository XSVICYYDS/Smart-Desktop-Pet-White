"""
用户信息展示区 - 头像、用户名、状态
"""

from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
                             QPushButton, QFileDialog, QMessageBox)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont, QPixmap
from components import CardWidget, ImageCropper


class UserProfileWidget(QWidget):
    """
    用户信息展示组件
    """
    def __init__(self, user_model, parent=None):
        super().__init__(parent)
        self.user_model = user_model
        
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 使用CardWidget作为容器
        self.card = CardWidget()
        content_layout = QVBoxLayout()
        content_layout.setSpacing(20)
        
        # 顶部区域：头像 + 用户信息
        top_layout = QHBoxLayout()
        top_layout.setSpacing(20)
        
        # 头像
        avatar_layout = QVBoxLayout()
        self.avatar_label = QLabel()
        self.avatar_label.setFixedSize(100, 100)
        self.avatar_label.setAlignment(Qt.AlignCenter)
        self.avatar_label.setStyleSheet("""
            QLabel {
                background-color: #F0F0F0;
                border-radius: 50px;
                border: 2px solid #E0E0E0;
            }
        """)
        self._update_avatar_display()
        avatar_layout.addWidget(self.avatar_label)
        
        # 更换头像按钮
        self.change_avatar_btn = QPushButton("更换头像")
        self.change_avatar_btn.setMinimumSize(44, 44)
        self.change_avatar_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #FF85C2;
            }
        """)
        self.change_avatar_btn.clicked.connect(self._change_avatar)
        avatar_layout.addWidget(self.change_avatar_btn)
        
        top_layout.addLayout(avatar_layout)
        
        # 用户信息
        info_layout = QVBoxLayout()
        info_layout.setSpacing(8)
        
        self.username_label = QLabel(self.user_model.username)
        self.username_label.setFont(QFont("Microsoft YaHei", 18, QFont.Bold))
        self.username_label.setStyleSheet("color: #333333;")
        self.username_label.setCursor(Qt.PointingHandCursor)
        self.username_label.mousePressEvent = self._show_full_info
        info_layout.addWidget(self.username_label)
        
        # 状态标签
        self.status_label = QLabel()
        self._update_status_display()
        info_layout.addWidget(self.status_label)
        
        info_layout.addStretch()
        top_layout.addLayout(info_layout)
        top_layout.addStretch()
        
        content_layout.addLayout(top_layout)
        
        self.card.layout.addLayout(content_layout)
        layout.addWidget(self.card)
    
    def _update_avatar_display(self):
        """更新头像显示"""
        avatar_path = self.user_model.avatar
        if avatar_path:
            try:
                pixmap = QPixmap(avatar_path)
                if not pixmap.isNull():
                    scaled = pixmap.scaled(100, 100, Qt.KeepAspectRatioByExpanding, Qt.SmoothTransformation)
                    self.avatar_label.setPixmap(scaled)
                    return
            except:
                pass
        
        # 默认头像
        self.avatar_label.setText("👤")
        self.avatar_label.setStyleSheet("""
            QLabel {
                background-color: #F0F0F0;
                border-radius: 50px;
                border: 2px solid #E0E0E0;
                font-size: 40px;
            }
        """)
    
    def _update_status_display(self):
        """更新状态显示"""
        status = self.user_model.status
        status_info = {
            "active": ("活跃", "#4CAF50"),
            "pending": ("待验证", "#FF9800"),
            "inactive": ("已停用", "#9E9E9E")
        }
        
        text, color = status_info.get(status, ("未知", "#999999"))
        
        self.status_label.setText(f"状态: {text}")
        self.status_label.setFont(QFont("Microsoft YaHei", 12))
        self.status_label.setStyleSheet(f"color: {color}; padding: 4px 12px; background-color: {color}20; border-radius: 4px;")
    
    def _change_avatar(self):
        """更换头像"""
        from components import ImageCropper
        from PyQt5.QtWidgets import QDialog, QVBoxLayout
        
        dialog = QDialog(self)
        dialog.setWindowTitle("更换头像")
        dialog.setFixedSize(400, 500)
        
        layout = QVBoxLayout(dialog)
        
        cropper = ImageCropper()
        layout.addWidget(cropper)
        
        btn_layout = QHBoxLayout()
        
        cancel_btn = QPushButton("取消")
        cancel_btn.setMinimumSize(44, 44)
        cancel_btn.clicked.connect(dialog.reject)
        btn_layout.addWidget(cancel_btn)
        
        ok_btn = QPushButton("确定")
        ok_btn.setMinimumSize(44, 44)
        ok_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border-radius: 6px;
                padding: 10px 20px;
            }
            QPushButton:hover {
                background-color: #FF85C2;
            }
        """)
        
        def on_ok():
            pixmap = cropper.get_pixmap()
            if pixmap:
                save_path, _ = QFileDialog.getSaveFileName(dialog, "保存头像", "", "PNG Files (*.png)")
                if save_path:
                    pixmap.save(save_path)
                    self.user_model.avatar = save_path
                    self.user_model.save()
                    self._update_avatar_display()
            dialog.accept()
        
        ok_btn.clicked.connect(on_ok)
        btn_layout.addWidget(ok_btn)
        
        layout.addLayout(btn_layout)
        dialog.exec_()
    
    def _show_full_info(self, event):
        """显示完整用户信息"""
        info = self.user_model.get_full_info()
        
        msg = f"""用户名: {info['username']}
邮箱: {info['email'] or '未设置'}
电话: {info['phone'] or '未设置'}
状态: {info['status']}
简介: {info['bio'] or '未设置'}"""
        
        QMessageBox.information(self, "用户信息", msg)
    
    def refresh(self):
        """刷新显示"""
        self.username_label.setText(self.user_model.username)
        self._update_avatar_display()
        self._update_status_display()
