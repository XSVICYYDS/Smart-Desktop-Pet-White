"""
检查更新模块

提供从 GitHub Releases 检查最新版本的功能
支持手动检查和自动检查（启动时）
"""

import json
import urllib.request
import urllib.error
from datetime import datetime

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTextEdit, QMessageBox
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont


# 当前软件版本号
CURRENT_VERSION = "0.4.43"
# GitHub 仓库信息
GITHUB_OWNER = "XSVICYYDS"
GITHUB_REPO = "Smart-Desktop-Pet-White"
# GitHub API 地址
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest"


class UpdateCheckThread(QThread):
    """在后台线程中执行更新检查，避免阻塞 UI"""
    finished = pyqtSignal(dict)
    error = pyqtSignal(str)

    def run(self):
        """执行网络请求获取最新版本信息"""
        try:
            # 设置请求头，模拟浏览器访问
            headers = {
                "User-Agent": "Smart-Desktop-Pet-White-UpdateChecker/1.0",
                "Accept": "application/vnd.github.v3+json"
            }
            req = urllib.request.Request(GITHUB_API_URL, headers=headers)

            # 设置超时时间为 10 秒
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode("utf-8"))

                # 解析关键信息
                result = {
                    "success": True,
                    "version": data.get("tag_name", "").lstrip("v"),
                    "name": data.get("name", ""),
                    "published_at": data.get("published_at", ""),
                    "html_url": data.get("html_url", ""),
                    "body": data.get("body", ""),
                    "current_version": CURRENT_VERSION,
                }
                self.finished.emit(result)

        except urllib.error.HTTPError as e:
            self.error.emit(f"服务器返回错误: HTTP {e.code}")
        except urllib.error.URLError as e:
            self.error.emit(f"网络连接失败: {e.reason}")
        except Exception as e:
            self.error.emit(f"检查更新时发生错误: {str(e)}")


class UpdateResultDialog(QDialog):
    """更新检查结果对话框"""

    def __init__(self, result, parent=None):
        """初始化对话框

        Args:
            result: 更新检查结果字典
            parent: 父窗口
        """
        super().__init__(parent)
        self.result = result
        self.setWindowTitle("检查更新")
        self.setFixedSize(500, 400)
        self.init_ui()

    def init_ui(self):
        """初始化界面"""
        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(25, 25, 25, 25)

        # 标题
        title = QLabel("🔄 检查更新")
        title.setFont(QFont("Microsoft YaHei", 18, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("color: #FF69B4;")
        layout.addWidget(title)

        # 当前版本信息
        current_label = QLabel(f"当前版本: v{self.result['current_version']}")
        current_label.setFont(QFont("Microsoft YaHei", 12))
        current_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(current_label)

        # 检查是否有新版本
        latest_version = self.result.get("version", "")
        has_update = self._compare_versions(latest_version, self.result["current_version"])

        if has_update:
            # 有新版本
            status_label = QLabel("🎉 发现新版本！")
            status_label.setFont(QFont("Microsoft YaHei", 14, QFont.Bold))
            status_label.setAlignment(Qt.AlignCenter)
            status_label.setStyleSheet("color: #4CAF50;")
            layout.addWidget(status_label)

            latest_label = QLabel(f"最新版本: v{latest_version}")
            latest_label.setFont(QFont("Microsoft YaHei", 12))
            latest_label.setAlignment(Qt.AlignCenter)
            layout.addWidget(latest_label)

            # 发布日期
            if self.result.get("published_at"):
                try:
                    dt = datetime.fromisoformat(self.result["published_at"].replace("Z", "+00:00"))
                    date_str = dt.strftime("%Y-%m-%d %H:%M")
                    date_label = QLabel(f"发布日期: {date_str}")
                    date_label.setAlignment(Qt.AlignCenter)
                    layout.addWidget(date_label)
                except ValueError:
                    pass

            # 更新内容摘要
            if self.result.get("body"):
                body_text = QTextEdit()
                body_text.setReadOnly(True)
                body_text.setPlainText(self.result["body"])
                body_text.setMaximumHeight(120)
                body_text.setStyleSheet("""
                    QTextEdit {
                        border: 1px solid #FF69B4;
                        border-radius: 8px;
                        padding: 8px;
                        background-color: #FFF5F8;
                    }
                """)
                layout.addWidget(QLabel("📋 更新内容:"))
                layout.addWidget(body_text)

            # 按钮区域
            btn_layout = QHBoxLayout()

            download_btn = QPushButton("⬇️ 前往下载")
            download_btn.setStyleSheet("""
                QPushButton {
                    background-color: #FF69B4;
                    color: white;
                    border: none;
                    border-radius: 20px;
                    padding: 10px 25px;
                    font-size: 14px;
                    font-weight: bold;
                }
                QPushButton:hover {
                    background-color: #FF1493;
                }
            """)
            download_btn.clicked.connect(self.open_download_page)
            btn_layout.addWidget(download_btn)

            ok_btn = QPushButton("稍后提醒")
            ok_btn.setStyleSheet("""
                QPushButton {
                    background-color: #f0f0f0;
                    color: #333;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    padding: 10px 25px;
                    font-size: 14px;
                }
                QPushButton:hover {
                    background-color: #e0e0e0;
                }
            """)
            ok_btn.clicked.connect(self.accept)
            btn_layout.addWidget(ok_btn)

            layout.addLayout(btn_layout)

        else:
            # 已是最新版
            status_label = QLabel("✅ 已是最新版本")
            status_label.setFont(QFont("Microsoft YaHei", 14, QFont.Bold))
            status_label.setAlignment(Qt.AlignCenter)
            status_label.setStyleSheet("color: #4CAF50;")
            layout.addWidget(status_label)

            info_label = QLabel("当前已是最新版本，无需更新。")
            info_label.setAlignment(Qt.AlignCenter)
            layout.addWidget(info_label)

            # 确定按钮
            ok_btn = QPushButton("确定")
            ok_btn.setStyleSheet("""
                QPushButton {
                    background-color: #FF69B4;
                    color: white;
                    border: none;
                    border-radius: 20px;
                    padding: 10px 25px;
                    font-size: 14px;
                    font-weight: bold;
                }
                QPushButton:hover {
                    background-color: #FF1493;
                }
            """)
            ok_btn.clicked.connect(self.accept)
            layout.addWidget(ok_btn, alignment=Qt.AlignCenter)

        layout.addStretch()

        # 对话框整体样式
        self.setStyleSheet("""
            QDialog {
                background-color: white;
            }
            QLabel {
                color: #333;
            }
        """)

    def _compare_versions(self, v1, v2):
        """比较两个版本号

        Args:
            v1: 版本号1
            v2: 版本号2

        Returns:
            bool: v1 是否大于 v2
        """
        try:
            parts1 = [int(x) for x in v1.split(".")]
            parts2 = [int(x) for x in v2.split(".")]

            # 补齐长度
            while len(parts1) < len(parts2):
                parts1.append(0)
            while len(parts2) < len(parts1):
                parts2.append(0)

            for p1, p2 in zip(parts1, parts2):
                if p1 > p2:
                    return True
                elif p1 < p2:
                    return False
            return False
        except (ValueError, AttributeError):
            return False

    def open_download_page(self):
        """打开下载页面"""
        import webbrowser
        url = self.result.get("html_url", "")
        if url:
            webbrowser.open(url)
        self.accept()


class UpdateChecker:
    """更新检查器

    提供检查更新的公共接口
    """

    def __init__(self, parent=None):
        """初始化更新检查器

        Args:
            parent: 父窗口，用于显示对话框
        """
        self.parent = parent
        self.thread = None

    def check_update(self, show_no_update=True):
        """执行更新检查

        Args:
            show_no_update: 当没有更新时是否显示提示
        """
        # 创建进度对话框
        self.progress_dialog = QMessageBox(self.parent)
        self.progress_dialog.setWindowTitle("检查更新")
        self.progress_dialog.setText("正在连接 GitHub 检查最新版本...")
        self.progress_dialog.setStandardButtons(QMessageBox.NoButton)
        self.progress_dialog.show()

        # 创建并启动后台线程
        self.thread = UpdateCheckThread()
        self.thread.finished.connect(lambda result: self._on_check_finished(result, show_no_update))
        self.thread.error.connect(self._on_check_error)
        self.thread.finished.connect(self.progress_dialog.close)
        self.thread.error.connect(self.progress_dialog.close)
        self.thread.start()

    def _on_check_finished(self, result, show_no_update):
        """检查完成回调

        Args:
            result: 检查结果字典
            show_no_update: 是否显示"已是最新"提示
        """
        dialog = UpdateResultDialog(result, self.parent)
        dialog.exec_()

    def _on_check_error(self, error_msg):
        """检查出错回调

        Args:
            error_msg: 错误信息
        """
        QMessageBox.warning(
            self.parent,
            "检查更新失败",
            f"无法连接到更新服务器。\n\n错误信息: {error_msg}\n\n"
            "请检查网络连接，或稍后重试。",
            QMessageBox.Ok
        )


def check_update(parent=None, show_no_update=True):
    """便捷的更新检查函数

    Args:
        parent: 父窗口
        show_no_update: 无更新时是否显示提示
    """
    checker = UpdateChecker(parent)
    checker.check_update(show_no_update)
