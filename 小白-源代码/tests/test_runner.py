#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
小白桌面宠物 - 统一测试运行器
用于运行所有测试和检查
"""
import sys
import os

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(TESTS_DIR)
sys.path.insert(0, BASE_DIR)

from PyQt5.QtWidgets import QApplication, QMessageBox, QDialog, QVBoxLayout, QPushButton, QLabel, QScrollArea, QWidget
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont


class TestRunner(QDialog):
    """测试运行器界面"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("小白桌面宠物 - 测试运行器")
        self.setFixedSize(600, 500)
        self.setStyleSheet("background-color: #2C3E50;")
        self.init_ui()
    
    def init_ui(self):
        """初始化UI"""
        layout = QVBoxLayout()
        
        # 标题
        title = QLabel("🎯 小白桌面宠物测试运行器")
        title.setFont(QFont("Microsoft YaHei", 18, QFont.Bold))
        title.setStyleSheet("color: #FF69B4;")
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)
        
        # 说明
        info = QLabel("选择要运行的测试：")
        info.setStyleSheet("color: #ECF0F1; font-size: 14px;")
        layout.addWidget(info)
        
        # 滚动区域
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("border: none;")
        
        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        scroll_layout.setSpacing(10)
        
        # 测试按钮
        tests = [
            ("🎮 测试新游戏", self.run_test_games),
            ("⚙️ 测试配置对话框", self.run_test_config),
            ("📋 测试功能选择列表", self.run_test_feature_list),
            ("🖥️ 测试主程序", self.run_main_app),
            ("📸 测试截屏功能", self.run_test_screenshot),
        ]
        
        for name, func in tests:
            btn = QPushButton(name)
            btn.setFixedHeight(40)
            btn.setStyleSheet("""
                QPushButton {
                    background-color: #3498DB;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 14px;
                }
                QPushButton:hover {
                    background-color: #2980B9;
                }
            """)
            btn.clicked.connect(func)
            scroll_layout.addWidget(btn)
        
        scroll_layout.addStretch()
        scroll.setWidget(scroll_content)
        layout.addWidget(scroll)
        
        # 状态标签
        self.status_label = QLabel("就绪")
        self.status_label.setStyleSheet("color: #2ECC71; font-size: 12px;")
        self.status_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.status_label)
        
        self.setLayout(layout)
    
    def run_test_games(self):
        """测试游戏模块"""
        self.status_label.setText("正在启动游戏测试...")
        try:
            from test_games import GameTestWindow
            game_test = GameTestWindow()
            game_test.exec_()
            self.status_label.setText("游戏测试完成")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"启动游戏测试失败:\n{str(e)}")
            self.status_label.setText(f"错误: {str(e)}")
    
    def run_test_config(self):
        """测试配置对话框"""
        self.status_label.setText("正在启动配置测试...")
        try:
            from config import Config
            from config_ui import ConfigDialog
            config = Config(BASE_DIR)
            dialog = ConfigDialog(config, BASE_DIR)
            dialog.exec_()
            self.status_label.setText("配置测试完成")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"启动配置测试失败:\n{str(e)}")
            self.status_label.setText(f"错误: {str(e)}")
    
    def run_test_feature_list(self):
        """测试功能选择列表"""
        self.status_label.setText("正在启动功能列表测试...")
        try:
            from config import Config
            from feature_list_component import FeatureSelectionList
            from PyQt5.QtWidgets import QMainWindow
            config = Config(BASE_DIR)
            window = QMainWindow()
            window.setWindowTitle("功能选择列表测试")
            feature_list = FeatureSelectionList(BASE_DIR, config)
            window.setCentralWidget(feature_list)
            window.resize(800, 600)
            window.show()
            self.status_label.setText("功能列表测试完成")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"启动功能列表测试失败:\n{str(e)}")
            self.status_label.setText(f"错误: {str(e)}")
    
    def run_main_app(self):
        """测试主程序"""
        self.status_label.setText("正在启动主程序...")
        try:
            QMessageBox.information(self, "提示", "将启动完整的小白桌面宠物\n点击确定继续")
            # 由于是单例程序，这里只是提示
            self.status_label.setText("主程序已提示")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"启动主程序失败:\n{str(e)}")
            self.status_label.setText(f"错误: {str(e)}")
    
    def run_test_screenshot(self):
        """测试截屏功能"""
        self.status_label.setText("正在启动截屏测试...")
        try:
            from test_screen_capture import main
            QMessageBox.information(self, "提示", "请手动运行 test_screen_capture.py")
            self.status_label.setText("截屏测试已提示")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"启动截屏测试失败:\n{str(e)}")
            self.status_label.setText(f"错误: {str(e)}")


def main():
    app = QApplication(sys.argv)
    runner = TestRunner()
    runner.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
