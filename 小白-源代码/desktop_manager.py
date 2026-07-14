"""
桌面管理器模块 - 简化版
提供文件浏览、搜索、预览、操作和系统控制功能
使用PyQt5实现
"""

import os
import sys
import shutil
import subprocess
import datetime
import threading
from typing import List, Dict, Any, Tuple

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QTreeView, QWidget,
    QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QLineEdit,
    QFileDialog, QMessageBox, QProgressDialog, QMenu, QSplitter,
    QGroupBox, QCheckBox, QStatusBar, QToolBar, QInputDialog,
    QScrollArea, QListWidget, QListWidgetItem, QDialog, 
    QTableWidget, QTableWidgetItem, QHeaderView, QTextEdit,
    QAction
)
from PyQt5.QtGui import (
    QIcon, QPixmap, QFont, QColor, QPalette,
    QStandardItemModel, QStandardItem, QImage
)
from PyQt5.QtCore import (
    Qt, QObject, QSize, QPoint,
    QSortFilterProxyModel, pyqtSignal, pyqtSlot, QTimer,
    QModelIndex, QThread
)


class FileLoadThread(QThread):
    """文件加载线程类，用于后台加载目录内容
    
    Attributes:
        progress_updated: 进度更新信号
        load_completed: 加载完成信号
    """
    
    progress_updated = pyqtSignal(int, str)
    load_completed = pyqtSignal(bool, list, str)
    
    def __init__(self, directory: str, show_hidden: bool = False):
        """初始化文件加载线程
        
        Args:
            directory: 要加载的目录路径
            show_hidden: 是否显示隐藏文件
        """
        super().__init__()
        self.directory = directory
        self.show_hidden = show_hidden
        self.is_running = True
    
    def run(self):
        """执行文件加载任务"""
        try:
            if not os.path.exists(self.directory) or not os.path.isdir(self.directory):
                self.load_completed.emit(False, [], "目录不存在或不是有效的目录")
                return
            
            dirs = []
            files = []
            
            self.progress_updated.emit(10, "开始扫描目录...")
            
            try:
                with os.scandir(self.directory) as scandir_iter:
                    entries = list(scandir_iter)
                
                total_entries = len(entries)
                processed = 0
                
                for entry in entries:
                    if not self.is_running:
                        return
                    
                    try:
                        if entry.name.startswith('.') and not self.show_hidden:
                            continue
                        
                        if entry.is_dir(follow_symlinks=False):
                            dirs.append((entry.name, entry.path, True))
                        else:
                            files.append((entry.name, entry.path, False))
                        
                        processed += 1
                        if processed % 100 == 0:
                            progress = min(80, 10 + (processed / total_entries) * 70)
                            self.progress_updated.emit(int(progress), f"扫描中: {processed} 项")
                            
                    except Exception:
                        continue
                        
            except PermissionError:
                self.load_completed.emit(False, [], "权限不足，无法访问目录")
                return
            except Exception as e:
                self.load_completed.emit(False, [], f"访问目录错误: {str(e)}")
                return
            
            self.progress_updated.emit(85, "排序项目...")
            dirs.sort(key=lambda x: x[0].lower())
            files.sort(key=lambda x: x[0].lower())
            all_items = dirs + files
            
            self.progress_updated.emit(95, "完成加载...")
            self.load_completed.emit(True, all_items, self.directory)
            
        except Exception as e:
            self.load_completed.emit(False, [], f"线程错误: {str(e)}")
    
    def stop(self):
        """停止线程运行"""
        self.is_running = False
        self.wait(1000)


class FilePreviewer:
    """文件预览器类，支持多种文件类型的预览"""
    
    def __init__(self):
        """初始化文件预览器"""
        self.supported_types = {
            'image': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico'],
            'text': ['.txt', '.md', '.py', '.java', '.cpp', '.c', '.h', 
                    '.html', '.css', '.js', '.json', '.xml', '.yaml', '.yml', 
                    '.csv', '.log', '.ini', '.config'],
            'pdf': ['.pdf']
        }
        self.preview_max_size = 10485760  # 10MB
    
    def can_preview(self, file_path: str) -> bool:
        """检查文件是否支持预览
        
        Args:
            file_path: 要检查的文件路径
            
        Returns:
            bool: 如果文件支持预览返回True
        """
        try:
            if not os.path.isfile(file_path):
                return False
            
            ext = os.path.splitext(file_path)[1].lower()
            for file_type in self.supported_types.values():
                if ext in file_type:
                    return True
            return False
        except Exception:
            return False
    
    def preview_file(self, file_path: str) -> QWidget:
        """预览文件内容
        
        Args:
            file_path: 要预览的文件路径
            
        Returns:
            QWidget: 包含文件预览内容的QWidget
        """
        try:
            if not self.can_preview(file_path):
                return None
            
            file_size = os.path.getsize(file_path)
            if file_size > self.preview_max_size:
                return self._create_error_widget(f"文件过大 ({self._format_size(file_size)})")
            
            ext = os.path.splitext(file_path)[1].lower()
            
            if ext in self.supported_types['image']:
                return self._create_image_preview(file_path)
            elif ext in self.supported_types['text']:
                return self._create_text_preview(file_path)
            elif ext in self.supported_types['pdf']:
                return self._create_pdf_preview(file_path)
            
            return None
        except Exception as e:
            return self._create_error_widget(f"预览错误: {str(e)}")
    
    def _create_image_preview(self, file_path: str) -> QWidget:
        """创建图片预览
        
        Args:
            file_path: 图片文件路径
            
        Returns:
            QWidget: 包含图片预览的QWidget
        """
        try:
            preview_widget = QWidget()
            preview_layout = QVBoxLayout(preview_widget)
            
            image_label = QLabel()
            pixmap = QPixmap(file_path)
            
            if pixmap.isNull():
                return self._create_error_widget("无法加载图片")
            
            # 缩放图片以适应预览窗口
            max_width = 600
            max_height = 400
            scaled_pixmap = pixmap.scaled(
                QSize(max_width, max_height),
                Qt.KeepAspectRatio,
                Qt.SmoothTransformation
            )
            image_label.setPixmap(scaled_pixmap)
            image_label.setAlignment(Qt.AlignCenter)
            preview_layout.addWidget(image_label)
            
            # 添加图片信息
            image_info = QLabel(
                f"文件名: {os.path.basename(file_path)}\n"
                f"尺寸: {scaled_pixmap.width()} x {scaled_pixmap.height()} px\n"
                f"大小: {self._format_size(os.path.getsize(file_path))}"
            )
            image_info.setAlignment(Qt.AlignLeft)
            preview_layout.addWidget(image_info)
            
            return preview_widget
        except Exception as e:
            return self._create_error_widget(f"图片预览错误: {str(e)}")
    
    def _create_text_preview(self, file_path: str) -> QWidget:
        """创建文本预览
        
        Args:
            file_path: 文本文件路径
            
        Returns:
            QWidget: 包含文本预览的QWidget
        """
        try:
            preview_widget = QWidget()
            preview_layout = QVBoxLayout(preview_widget)
            
            text_edit = QTextEdit()
            text_edit.setReadOnly(True)
            
            file_size = os.path.getsize(file_path)
            max_preview_size = 1024 * 1024  # 1MB
            
            content = ""
            truncated = False
            
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                if file_size > max_preview_size:
                    content = f.read(max_preview_size)
                    truncated = True
                else:
                    content = f.read()
            
            text_edit.setPlainText(content)
            preview_layout.addWidget(text_edit)
            
            # 添加文件信息
            text_info = QLabel(
                f"文件名: {os.path.basename(file_path)}\n"
                f"大小: {self._format_size(file_size)}\n"
                f"行数: {len(content.splitlines())}\n"
                f"{f'注意: 文件过大，仅显示部分内容' if truncated else ''}"
            )
            text_info.setAlignment(Qt.AlignLeft)
            preview_layout.addWidget(text_info)
            
            return preview_widget
        except Exception as e:
            return self._create_error_widget(f"文本预览错误: {str(e)}")
    
    def _create_pdf_preview(self, file_path: str) -> QWidget:
        """创建PDF预览
        
        Args:
            file_path: PDF文件路径
            
        Returns:
            QWidget: 包含PDF预览的QWidget
        """
        preview_widget = QWidget()
        preview_layout = QVBoxLayout(preview_widget)
        
        pdf_info = QLabel(
            f"文件名: {os.path.basename(file_path)}\n"
            f"大小: {self._format_size(os.path.getsize(file_path))}\n"
            f"格式: PDF文件\n"
            f"提示: 使用外部程序打开查看完整内容"
        )
        pdf_info.setAlignment(Qt.AlignCenter)
        pdf_info.setStyleSheet("font-size: 14px; padding: 20px;")
        preview_layout.addWidget(pdf_info)
        
        return preview_widget
    
    def _create_error_widget(self, error_message: str) -> QWidget:
        """创建错误信息部件
        
        Args:
            error_message: 错误信息文本
            
        Returns:
            QWidget: 显示错误信息的QWidget
        """
        error_widget = QWidget()
        error_layout = QVBoxLayout(error_widget)
        
        error_label = QLabel(error_message)
        error_label.setAlignment(Qt.AlignCenter)
        error_label.setStyleSheet("color: red; font-weight: bold; padding: 20px;")
        error_layout.addWidget(error_label)
        
        return error_widget
    
    def _format_size(self, size_bytes: int) -> str:
        """格式化文件大小
        
        Args:
            size_bytes: 文件大小（字节）
            
        Returns:
            str: 格式化后的文件大小字符串
        """
        if size_bytes < 0:
            return "0 B"
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"


class FileOperations:
    """文件操作类，提供文件复制、移动、删除等操作"""
    
    def __init__(self):
        """初始化文件操作类"""
        self._last_operation_time = 0
        self._operation_cooldown = 0.5
    
    def _check_cooldown(self) -> bool:
        """检查是否在冷却期内"""
        import time
        current_time = time.time()
        if current_time - self._last_operation_time < self._operation_cooldown:
            return True
        self._last_operation_time = current_time
        return False
    
    def delete_files(self, file_paths: List[str], progress_callback=None) -> Tuple[bool, List[str]]:
        """删除文件
        
        Args:
            file_paths: 要删除的文件路径列表
            progress_callback: 进度回调函数
            
        Returns:
            Tuple[bool, List[str]]: (是否全部成功, 失败的文件列表)
        """
        failed = []
        total = len(file_paths)
        
        for i, file_path in enumerate(file_paths):
            try:
                if not os.path.exists(file_path):
                    failed.append(f"{os.path.basename(file_path)}: 文件不存在")
                    continue
                
                if os.path.isfile(file_path):
                    os.remove(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                
                if progress_callback:
                    progress_callback(int((i + 1) / total * 100), os.path.basename(file_path))
                    
            except PermissionError:
                failed.append(f"{os.path.basename(file_path)}: 权限不足")
            except OSError as e:
                failed.append(f"{os.path.basename(file_path)}: {str(e)}")
            except Exception as e:
                failed.append(f"{os.path.basename(file_path)}: {str(e)}")
        
        return len(failed) == 0, failed
    
    def copy_files(self, source_paths: List[str], target_dir: str, progress_callback=None) -> Tuple[bool, List[str]]:
        """复制文件
        
        Args:
            source_paths: 源文件路径列表
            target_dir: 目标目录
            progress_callback: 进度回调函数
            
        Returns:
            Tuple[bool, List[str]]: (是否全部成功, 失败的文件列表)
        """
        if self._check_cooldown():
            return False, ["操作过于频繁"]
        
        failed = []
        total = len(source_paths)
        
        # 检查目标目录
        if not os.path.exists(target_dir) or not os.path.isdir(target_dir):
            return False, ["目标目录不存在"]
        
        if not os.access(target_dir, os.W_OK):
            return False, ["没有写入权限"]
        
        for i, source_path in enumerate(source_paths):
            try:
                if not os.path.exists(source_path):
                    failed.append(f"{os.path.basename(source_path)}: 文件不存在")
                    continue
                
                target_path = os.path.join(target_dir, os.path.basename(source_path))
                
                if os.path.exists(target_path):
                    failed.append(f"{os.path.basename(source_path)}: 文件已存在")
                    continue
                
                if os.path.isfile(source_path):
                    shutil.copy2(source_path, target_path)
                elif os.path.isdir(source_path):
                    shutil.copytree(source_path, target_path)
                
                if progress_callback:
                    progress_callback(int((i + 1) / total * 100), os.path.basename(source_path))
                    
            except PermissionError:
                failed.append(f"{os.path.basename(source_path)}: 权限不足")
            except OSError as e:
                failed.append(f"{os.path.basename(source_path)}: {str(e)}")
            except Exception as e:
                failed.append(f"{os.path.basename(source_path)}: {str(e)}")
        
        return len(failed) == 0, failed
    
    def move_files(self, source_paths: List[str], target_dir: str, progress_callback=None) -> Tuple[bool, List[str]]:
        """移动文件
        
        Args:
            source_paths: 源文件路径列表
            target_dir: 目标目录
            progress_callback: 进度回调函数
            
        Returns:
            Tuple[bool, List[str]]: (是否全部成功, 失败的文件列表)
        """
        if self._check_cooldown():
            return False, ["操作过于频繁"]
        
        failed = []
        total = len(source_paths)
        
        if not os.path.exists(target_dir) or not os.path.isdir(target_dir):
            return False, ["目标目录不存在"]
        
        if not os.access(target_dir, os.W_OK):
            return False, ["没有写入权限"]
        
        for i, source_path in enumerate(source_paths):
            try:
                if not os.path.exists(source_path):
                    failed.append(f"{os.path.basename(source_path)}: 文件不存在")
                    continue
                
                target_path = os.path.join(target_dir, os.path.basename(source_path))
                
                if os.path.exists(target_path):
                    failed.append(f"{os.path.basename(source_path)}: 文件已存在")
                    continue
                
                shutil.move(source_path, target_dir)
                
                if progress_callback:
                    progress_callback(int((i + 1) / total * 100), os.path.basename(source_path))
                    
            except PermissionError:
                failed.append(f"{os.path.basename(source_path)}: 权限不足")
            except OSError as e:
                failed.append(f"{os.path.basename(source_path)}: {str(e)}")
            except Exception as e:
                failed.append(f"{os.path.basename(source_path)}: {str(e)}")
        
        return len(failed) == 0, failed
    
    def create_directory(self, path: str) -> bool:
        """创建目录
        
        Args:
            path: 目录路径
            
        Returns:
            bool: 是否成功创建
        """
        try:
            os.makedirs(path)
            return True
        except Exception:
            return False
    
    def get_file_type(self, filename: str) -> str:
        """获取文件类型
        
        Args:
            filename: 文件名
            
        Returns:
            str: 文件类型描述
        """
        _, ext = os.path.splitext(filename.lower())
        if not ext:
            return "未知文件"
        
        file_types = {
            ".txt": "文本文件",
            ".doc": "Word文档", ".docx": "Word文档",
            ".pdf": "PDF文档",
            ".xls": "Excel表格", ".xlsx": "Excel表格",
            ".jpg": "JPEG图像", ".jpeg": "JPEG图像", ".png": "PNG图像",
            ".mp3": "MP3音频",
            ".mp4": "MP4视频",
            ".zip": "ZIP压缩包", ".rar": "RAR压缩包",
            ".py": "Python文件",
            ".exe": "可执行文件"
        }
        
        return file_types.get(ext, "未知文件")
    
    def format_size(self, size_bytes: int) -> str:
        """格式化文件大小
        
        Args:
            size_bytes: 文件大小（字节）
            
        Returns:
            str: 格式化后的文件大小字符串
        """
        if size_bytes < 0:
            return "未知"
        
        units = ['B', 'KB', 'MB', 'GB', 'TB']
        unit_index = 0
        size = float(size_bytes)
        
        while size >= 1024 and unit_index < len(units) - 1:
            size /= 1024
            unit_index += 1
        
        return f"{size:.2f} {units[unit_index]}"


class SystemController:
    """系统控制类，提供系统操作功能"""
    
    def __init__(self):
        """初始化系统控制类"""
        self.system = self._get_system()
    
    def _get_system(self) -> str:
        """获取当前系统类型
        
        Returns:
            str: 系统类型（Windows/Linux/Darwin）
        """
        if sys.platform.startswith('win'):
            return "Windows"
        elif sys.platform.startswith('linux'):
            return "Linux"
        elif sys.platform.startswith('darwin'):
            return "Darwin"
        else:
            return "Unknown"
    
    def open_file(self, file_path: str) -> bool:
        """打开文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            bool: 是否成功打开
        """
        try:
            if self.system == "Windows":
                os.startfile(file_path)
            elif self.system == "Darwin":
                subprocess.run(["open", file_path])
            else:
                subprocess.run(["xdg-open", file_path])
            return True
        except Exception:
            return False
    
    def open_terminal(self, directory: str, terminal_type: str = "cmd", admin: bool = False) -> bool:
        """打开终端
        
        Args:
            directory: 终端启动的目录路径
            terminal_type: 终端类型（cmd/powershell）
            admin: 是否以管理员身份打开
            
        Returns:
            bool: 是否成功打开
        """
        try:
            if self.system == "Windows":
                if terminal_type == "cmd":
                    if admin:
                        subprocess.Popen([
                            "powershell.exe", "-Command",
                            f"Start-Process cmd.exe -ArgumentList '/k', 'cd /d', '{directory}' -Verb RunAs"
                        ])
                    else:
                        subprocess.Popen(["cmd.exe", "/k", "cd", "/d", directory])
                elif terminal_type == "powershell":
                    if admin:
                        subprocess.Popen([
                            "powershell.exe", "-Command",
                            f"Start-Process powershell.exe -ArgumentList '-NoExit', 'Set-Location', '{directory}' -Verb RunAs"
                        ])
                    else:
                        subprocess.Popen(["powershell.exe", "-NoExit", "Set-Location", directory])
                return True
            elif self.system == "Darwin":
                subprocess.Popen(["open", "-a", "Terminal", directory])
                return True
            else:
                subprocess.Popen(["x-terminal-emulator", "-e", f"cd '{directory}' && bash"])
                return True
        except Exception:
            return False
    
    def open_task_manager(self) -> bool:
        """打开任务管理器
        
        Returns:
            bool: 是否成功打开
        """
        try:
            if self.system == "Windows":
                subprocess.Popen(["taskmgr.exe"])
            elif self.system == "Darwin":
                subprocess.Popen(["open", "-a", "Activity Monitor"])
            else:
                subprocess.Popen(["gnome-system-monitor"])
            return True
        except Exception:
            return False
    
    def lock_screen(self) -> bool:
        """锁定屏幕
        
        Returns:
            bool: 是否成功锁定
        """
        try:
            if self.system == "Windows":
                subprocess.Popen(["rundll32.exe", "user32.dll,LockWorkStation"])
            elif self.system == "Darwin":
                subprocess.Popen(["pmset", "displaysleepnow"])
            else:
                subprocess.Popen(["gnome-screensaver-command", "-l"])
            return True
        except Exception:
            return False
    
    def shutdown(self) -> bool:
        """关机
        
        Returns:
            bool: 是否成功执行
        """
        try:
            if self.system == "Windows":
                subprocess.Popen(["shutdown", "/s", "/t", "0"])
            elif self.system == "Darwin":
                subprocess.Popen(["shutdown", "-h", "now"])
            else:
                subprocess.Popen(["shutdown", "-h", "now"])
            return True
        except Exception:
            return False
    
    def restart(self) -> bool:
        """重启
        
        Returns:
            bool: 是否成功执行
        """
        try:
            if self.system == "Windows":
                subprocess.Popen(["shutdown", "/r", "/t", "0"])
            elif self.system == "Darwin":
                subprocess.Popen(["shutdown", "-r", "now"])
            else:
                subprocess.Popen(["shutdown", "-r", "now"])
            return True
        except Exception:
            return False
    
    def sleep(self) -> bool:
        """休眠
        
        Returns:
            bool: 是否成功执行
        """
        try:
            if self.system == "Windows":
                subprocess.Popen(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"])
            elif self.system == "Darwin":
                subprocess.Popen(["pmset", "sleepnow"])
            else:
                subprocess.Popen(["systemctl", "suspend"])
            return True
        except Exception:
            return False


class CustomFileSystemModel(QStandardItemModel):
    """自定义文件系统模型类"""
    
    # 文件类型图标映射
    FILE_TYPE_ICONS = {
        ".txt": "📄", ".doc": "📝", ".docx": "📝", ".pdf": "📚",
        ".xls": "📊", ".xlsx": "📊", ".ppt": "📑", ".pptx": "📑",
        ".jpg": "🖼️", ".jpeg": "🖼️", ".png": "🖼️", ".gif": "🖼️",
        ".mp3": "🎵", ".wav": "🎵", ".mp4": "🎬", ".avi": "🎬",
        ".zip": "🗜️", ".rar": "🗜️", ".exe": "⚙️", ".py": "🐍"
    }
    
    DEFAULT_FILE_ICON = "📄"
    FOLDER_ICON = "📁"
    
    def __init__(self, parent=None):
        """初始化文件系统模型
        
        Args:
            parent: 父对象
        """
        super().__init__(parent)
        self.setColumnCount(4)
        self.setHorizontalHeaderLabels(['名称', '类型', '大小', '修改日期'])
        self.show_hidden = False
    
    def load_directory(self, path: str) -> bool:
        """加载指定目录的内容
        
        Args:
            path: 目录路径
            
        Returns:
            bool: 是否成功加载
        """
        self.clear()
        self.setHorizontalHeaderLabels(['名称', '类型', '大小', '修改日期'])
        
        try:
            if not os.path.exists(path) or not os.path.isdir(path):
                return False
            
            # 添加返回上级目录的项目
            parent_dir = os.path.dirname(path)
            if parent_dir:
                parent_item = QStandardItem('📁 ..')
                parent_item.setData(parent_dir, Qt.UserRole)
                self.appendRow([parent_item, QStandardItem('目录'), QStandardItem(''), QStandardItem('')])
            
            # 使用os.scandir获取目录内容
            dirs = []
            files = []
            
            with os.scandir(path) as entries:
                for entry in entries:
                    try:
                        if entry.name.startswith('.') and not self.show_hidden:
                            continue
                        
                        if entry.is_dir(follow_symlinks=False):
                            dirs.append((entry.name, entry.path, True))
                        else:
                            files.append((entry.name, entry.path, False))
                    except Exception:
                        continue
            
            # 排序
            dirs.sort(key=lambda x: x[0].lower())
            files.sort(key=lambda x: x[0].lower())
            
            # 添加项目
            for name, file_path, is_dir in dirs + files:
                self._add_item(name, file_path, is_dir)
            
            return True
        except Exception:
            return False
    
    def _add_item(self, name: str, path: str, is_dir: bool):
        """添加一个项目到模型
        
        Args:
            name: 文件/目录名称
            path: 文件/目录路径
            is_dir: 是否为目录
        """
        if is_dir:
            item = QStandardItem('📁 ' + name)
            type_text = '目录'
            size_text = ''
        else:
            _, ext = os.path.splitext(name.lower())
            icon = self.FILE_TYPE_ICONS.get(ext, self.DEFAULT_FILE_ICON)
            item = QStandardItem(icon + ' ' + name)
            type_text = self._get_file_type_name(ext)
            try:
                size_text = self._format_size(os.path.getsize(path))
            except:
                size_text = '无法获取'
        
        item.setData(path, Qt.UserRole)
        
        try:
            mtime = os.path.getmtime(path)
            date_text = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')
        except:
            date_text = '无法获取'
        
        self.appendRow([
            item,
            QStandardItem(type_text),
            QStandardItem(size_text),
            QStandardItem(date_text)
        ])
    
    def _get_file_type_name(self, ext: str) -> str:
        """获取文件类型名称
        
        Args:
            ext: 文件扩展名
            
        Returns:
            str: 文件类型名称
        """
        file_type_names = {
            ".txt": "文本文档",
            ".doc": "Word文档", ".docx": "Word文档",
            ".pdf": "PDF文档",
            ".jpg": "JPEG图像", ".png": "PNG图像",
            ".mp3": "MP3音频",
            ".mp4": "MP4视频",
            ".zip": "ZIP压缩包",
            ".py": "Python文件",
            ".exe": "可执行文件"
        }
        return file_type_names.get(ext, "文件")
    
    def _format_size(self, size_bytes: int) -> str:
        """格式化文件大小
        
        Args:
            size_bytes: 文件大小（字节）
            
        Returns:
            str: 格式化后的文件大小字符串
        """
        if size_bytes < 0:
            return '无法获取'
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.2f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.2f} TB"


class DesktopManagerMainWindow(QMainWindow):
    """桌面管理器主窗口类"""
    
    # 定义信号
    update_progress = pyqtSignal(int, str)
    update_status = pyqtSignal(str)
    operation_complete = pyqtSignal(bool, str, list)
    
    def __init__(self, parent=None):
        """初始化主窗口
        
        Args:
            parent: 父窗口对象
        """
        super().__init__(parent)
        
        # 初始化组件
        self.file_operations = FileOperations()
        self.system_controller = SystemController()
        self.file_previewer = FilePreviewer()
        
        # 初始化变量
        self.current_path = os.path.expanduser("~")
        self.clipboard = []
        self.clipboard_operation = ""
        self.show_hidden_files = False
        
        # 文件加载线程
        self.file_load_thread = None
        self.file_load_progress = None
        
        # 搜索相关变量
        self.search_cancelled = False
        self.search_thread = None
        
        # 设置窗口属性
        self.setWindowTitle("桌面管理器")
        self.resize(900, 600)
        
        # 初始化UI
        self.init_ui()
        
        # 连接信号槽
        self.update_progress.connect(self._on_progress_update)
        self.update_status.connect(self._on_status_update)
        self.operation_complete.connect(self._on_operation_complete)
        
        # 加载文件
        self.load_files()
    
    def init_ui(self):
        """初始化用户界面"""
        # 创建中央部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 创建主布局
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(5, 5, 5, 5)
        
        # 启用拖拽功能
        self.setAcceptDrops(True)
        
        # 创建导航栏
        self.create_navigation_bar(main_layout)
        
        # 创建文件视图
        self.create_file_view(main_layout)
        
        # 创建状态栏
        self.create_status_bar()
        
        # 创建菜单
        self.create_menus()
        
        # 创建工具栏
        self.create_toolbars()
    
    def create_navigation_bar(self, parent_layout):
        """创建导航栏
        
        Args:
            parent_layout: 父布局对象
        """
        nav_layout = QHBoxLayout()
        nav_layout.setContentsMargins(0, 0, 0, 5)
        
        # 向上按钮
        self.up_button = QPushButton("↑")
        self.up_button.setToolTip("返回上级目录")
        self.up_button.clicked.connect(self.go_up)
        nav_layout.addWidget(self.up_button)
        
        # 刷新按钮
        self.refresh_button = QPushButton("🔄")
        self.refresh_button.setToolTip("刷新")
        self.refresh_button.clicked.connect(self.refresh)
        nav_layout.addWidget(self.refresh_button)
        
        # 当前路径显示
        self.path_line_edit = QLineEdit()
        self.path_line_edit.setText(self.current_path)
        self.path_line_edit.returnPressed.connect(self.navigate_to_path)
        nav_layout.addWidget(self.path_line_edit, 1)
        
        # 搜索框
        self.search_line_edit = QLineEdit()
        self.search_line_edit.setPlaceholderText("搜索文件...")
        self.search_line_edit.setMaximumWidth(200)
        self.search_line_edit.returnPressed.connect(self.search_files)
        nav_layout.addWidget(self.search_line_edit)
        
        parent_layout.addLayout(nav_layout)
    
    def create_file_view(self, parent_layout):
        """创建文件视图
        
        Args:
            parent_layout: 父布局对象
        """
        # 创建水平分割器
        main_splitter = QSplitter(Qt.Horizontal)
        main_splitter.setSizes([600, 300])
        
        # 创建文件树视图
        self.file_view = QTreeView()
        self.file_view.setAlternatingRowColors(True)
        
        # 创建文件系统模型
        self.file_model = CustomFileSystemModel()
        self.file_view.setModel(self.file_model)
        
        # 设置视图属性
        self.file_view.setSortingEnabled(True)
        self.file_view.setContextMenuPolicy(Qt.CustomContextMenu)
        self.file_view.customContextMenuRequested.connect(self.show_context_menu)
        self.file_view.doubleClicked.connect(self.on_file_double_clicked)
        
        # 创建代理模型用于搜索
        self.proxy_model = QSortFilterProxyModel()
        self.proxy_model.setSourceModel(self.file_model)
        self.proxy_model.setFilterCaseSensitivity(Qt.CaseInsensitive)
        self.file_view.setModel(self.proxy_model)
        
        # 隐藏部分列
        for col_idx in [1, 2, 3]:
            self.file_view.hideColumn(col_idx)
        
        main_splitter.addWidget(self.file_view)
        
        # 创建右侧文件预览区域
        self.preview_widget = QWidget()
        self.preview_layout = QVBoxLayout(self.preview_widget)
        self.preview_layout.setContentsMargins(10, 10, 10, 10)
        
        self.preview_title = QLabel("预览")
        font = self.preview_title.font()
        font.setBold(True)
        self.preview_title.setFont(font)
        self.preview_layout.addWidget(self.preview_title)
        
        self.preview_content_widget = QWidget()
        self.preview_content_layout = QVBoxLayout(self.preview_content_widget)
        self.preview_content_layout.setAlignment(Qt.AlignCenter)
        
        self.preview_placeholder = QLabel("选择文件以预览")
        self.preview_placeholder.setAlignment(Qt.AlignCenter)
        self.preview_content_layout.addWidget(self.preview_placeholder)
        
        self.preview_layout.addWidget(self.preview_content_widget, 1)
        
        main_splitter.addWidget(self.preview_widget)
        
        parent_layout.addWidget(main_splitter, 1)
        
        # 连接选择变更信号
        if self.file_view.selectionModel():
            self.file_view.selectionModel().selectionChanged.connect(self.on_selection_changed)
    
    def create_status_bar(self):
        """创建状态栏"""
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        
        self.status_label = QLabel("就绪")
        self.status_bar.addWidget(self.status_label, 1)
        
        self.path_status_label = QLabel(f"当前路径: {self.current_path}")
        self.path_status_label.setAlignment(Qt.AlignRight)
        self.status_bar.addWidget(self.path_status_label, 2)
    
    def create_menus(self):
        """创建菜单栏"""
        # 文件菜单
        file_menu = self.menuBar().addMenu("文件")
        
        new_folder_action = QAction("新建文件夹", self)
        new_folder_action.setShortcut("Ctrl+Shift+N")
        new_folder_action.triggered.connect(self.create_new_folder)
        file_menu.addAction(new_folder_action)
        
        file_menu.addSeparator()
        
        paste_action = QAction("粘贴", self)
        paste_action.setShortcut("Ctrl+V")
        paste_action.triggered.connect(self.paste_files)
        file_menu.addAction(paste_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("退出", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 编辑菜单
        edit_menu = self.menuBar().addMenu("编辑")
        
        copy_action = QAction("复制", self)
        copy_action.setShortcut("Ctrl+C")
        copy_action.triggered.connect(self.copy_files)
        edit_menu.addAction(copy_action)
        
        cut_action = QAction("剪切", self)
        cut_action.setShortcut("Ctrl+X")
        cut_action.triggered.connect(self.cut_files)
        edit_menu.addAction(cut_action)
        
        rename_action = QAction("重命名", self)
        rename_action.setShortcut("F2")
        rename_action.triggered.connect(self.rename_file)
        edit_menu.addAction(rename_action)
        
        delete_action = QAction("删除", self)
        delete_action.setShortcut("Delete")
        delete_action.triggered.connect(self.delete_files)
        edit_menu.addAction(delete_action)
        
        # 视图菜单
        view_menu = self.menuBar().addMenu("视图")
        
        show_hidden_action = QAction("显示隐藏文件", self)
        show_hidden_action.setCheckable(True)
        show_hidden_action.setChecked(self.show_hidden_files)
        show_hidden_action.triggered.connect(self.toggle_show_hidden)
        view_menu.addAction(show_hidden_action)
        
        # 工具菜单
        tools_menu = self.menuBar().addMenu("工具")
        
        terminal_menu = tools_menu.addMenu("打开终端")
        
        cmd_action = QAction("命令提示符", self)
        cmd_action.triggered.connect(lambda: self.open_command_prompt("cmd"))
        terminal_menu.addAction(cmd_action)
        
        powershell_action = QAction("PowerShell", self)
        powershell_action.triggered.connect(lambda: self.open_command_prompt("powershell"))
        terminal_menu.addAction(powershell_action)
        
        terminal_menu.addSeparator()
        
        admin_cmd_action = QAction("管理员CMD", self)
        admin_cmd_action.triggered.connect(lambda: self.open_command_prompt("cmd", admin=True))
        terminal_menu.addAction(admin_cmd_action)
        
        task_manager_action = QAction("任务管理器", self)
        task_manager_action.triggered.connect(self.open_task_manager)
        tools_menu.addAction(task_manager_action)
        
        # 系统菜单
        system_menu = self.menuBar().addMenu("系统")
        
        lock_action = QAction("锁定屏幕", self)
        lock_action.triggered.connect(self.lock_screen)
        system_menu.addAction(lock_action)
        
        sleep_action = QAction("休眠", self)
        sleep_action.triggered.connect(self.sleep_system)
        system_menu.addAction(sleep_action)
        
        system_menu.addSeparator()
        
        restart_action = QAction("重启", self)
        restart_action.triggered.connect(self.restart_system)
        system_menu.addAction(restart_action)
        
        shutdown_action = QAction("关机", self)
        shutdown_action.triggered.connect(self.shutdown_system)
        system_menu.addAction(shutdown_action)
    
    def create_toolbars(self):
        """创建工具栏"""
        file_toolbar = QToolBar("文件操作")
        file_toolbar.setIconSize(QSize(24, 24))
        self.addToolBar(file_toolbar)
        
        new_folder_action = QAction("📁", self)
        new_folder_action.setToolTip("新建文件夹")
        new_folder_action.triggered.connect(self.create_new_folder)
        file_toolbar.addAction(new_folder_action)
        
        file_toolbar.addSeparator()
        
        copy_action = QAction("📋", self)
        copy_action.setToolTip("复制")
        copy_action.triggered.connect(self.copy_files)
        file_toolbar.addAction(copy_action)
        
        cut_action = QAction("✂️", self)
        cut_action.setToolTip("剪切")
        cut_action.triggered.connect(self.cut_files)
        file_toolbar.addAction(cut_action)
        
        paste_action = QAction("📎", self)
        paste_action.setToolTip("粘贴")
        paste_action.triggered.connect(self.paste_files)
        file_toolbar.addAction(paste_action)
        
        file_toolbar.addSeparator()
        
        delete_action = QAction("🗑️", self)
        delete_action.setToolTip("删除")
        delete_action.triggered.connect(self.delete_files)
        file_toolbar.addAction(delete_action)
        
        # 系统工具栏
        system_toolbar = QToolBar("系统操作")
        system_toolbar.setIconSize(QSize(24, 24))
        self.addToolBar(system_toolbar)
        
        cmd_action = QAction("💻", self)
        cmd_action.setToolTip("打开命令行")
        cmd_action.triggered.connect(self.open_command_prompt)
        system_toolbar.addAction(cmd_action)
        
        task_manager_action = QAction("📊", self)
        task_manager_action.setToolTip("任务管理器")
        task_manager_action.triggered.connect(self.open_task_manager)
        system_toolbar.addAction(task_manager_action)
    
    def load_files(self):
        """加载当前目录的文件"""
        try:
            if not os.path.exists(self.current_path):
                QMessageBox.critical(self, "错误", "路径不存在")
                return
            
            if not os.path.isdir(self.current_path):
                QMessageBox.critical(self, "错误", "不是有效的目录")
                return
            
            # 停止之前的加载线程
            if self.file_load_thread and self.file_load_thread.isRunning():
                self.file_load_thread.stop()
            
            # 创建进度对话框
            self.file_load_progress = QProgressDialog("加载文件...", "取消", 0, 100, self)
            self.file_load_progress.setWindowModality(Qt.WindowModal)
            self.file_load_progress.setMinimumDuration(500)
            self.file_load_progress.canceled.connect(self._cancel_file_load)
            
            # 创建并启动加载线程
            self.file_load_thread = FileLoadThread(self.current_path, self.show_hidden_files)
            self.file_load_thread.progress_updated.connect(self._on_file_load_progress)
            self.file_load_thread.load_completed.connect(self._on_file_load_completed)
            self.file_load_thread.start()
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"加载失败: {str(e)}")
    
    def _cancel_file_load(self):
        """取消文件加载"""
        if self.file_load_thread and self.file_load_thread.isRunning():
            self.file_load_thread.stop()
        if self.file_load_progress:
            self.file_load_progress.cancel()
    
    def _on_file_load_progress(self, progress: int, message: str):
        """文件加载进度更新
        
        Args:
            progress: 进度值
            message: 进度消息
        """
        if self.file_load_progress:
            self.file_load_progress.setValue(progress)
            self.file_load_progress.setLabelText(message)
    
    def _on_file_load_completed(self, success: bool, items: list, directory: str):
        """文件加载完成
        
        Args:
            success: 是否成功
            items: 文件项目列表
            directory: 目录路径
        """
        if self.file_load_progress:
            self.file_load_progress.accept()
            self.file_load_progress = None
        
        if not success:
            error_msg = items if isinstance(items, str) else "未知错误"
            QMessageBox.critical(self, "错误", error_msg)
            return
        
        # 加载完成，更新模型
        try:
            self.file_model.clear()
            self.file_model.setHorizontalHeaderLabels(['名称', '类型', '大小', '修改日期'])
            
            # 添加返回上级目录的项目
            parent_dir = os.path.dirname(directory)
            if parent_dir:
                parent_item = QStandardItem('📁 ..')
                parent_item.setData(parent_dir, Qt.UserRole)
                self.file_model.appendRow([parent_item, QStandardItem('目录'), QStandardItem(''), QStandardItem('')])
            
            # 添加所有项目
            for name, path, is_dir in items:
                self.file_model._add_item(name, path, is_dir)
            
            # 设置表头
            self.file_model.setHorizontalHeaderLabels(['名称', '类型', '大小', '修改日期'])
            
            # 更新路径显示
            self.path_line_edit.setText(directory)
            self.path_status_label.setText(f"当前路径: {directory}")
            self.current_path = directory
            
            # 更新代理模型
            self.proxy_model.setSourceModel(self.file_model)
            self.file_view.setModel(self.proxy_model)
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"处理结果失败: {str(e)}")
    
    def go_up(self):
        """返回上级目录"""
        parent_dir = os.path.dirname(self.current_path)
        if parent_dir and os.path.exists(parent_dir):
            self.current_path = parent_dir
            self.load_files()
    
    def refresh(self):
        """刷新文件列表"""
        self.load_files()
    
    def navigate_to_path(self):
        """导航到指定路径"""
        path = self.path_line_edit.text().strip()
        
        if not path:
            return
        
        if not os.path.exists(path):
            QMessageBox.warning(self, "错误", "路径不存在")
            self.path_line_edit.setText(self.current_path)
            return
        
        if not os.path.isdir(path):
            QMessageBox.warning(self, "错误", "不是有效的目录")
            self.path_line_edit.setText(self.current_path)
            return
        
        self.current_path = path
        self.load_files()
    
    def search_files(self):
        """搜索文件"""
        search_text = self.search_line_edit.text().strip()
        if not search_text:
            self.load_files()
            return
        
        self.search_cancelled = False
        
        # 在后台线程中搜索
        self.search_thread = threading.Thread(
            target=self._search_files_thread,
            args=(search_text,),
            daemon=True
        )
        self.search_thread.start()
    
    def _search_files_thread(self, search_text: str):
        """搜索文件的线程函数
        
        Args:
            search_text: 搜索文本
        """
        results = []
        
        try:
            for root, dirs, files in os.walk(self.current_path):
                if self.search_cancelled:
                    break
                
                # 过滤隐藏文件
                if not self.show_hidden_files:
                    dirs[:] = [d for d in dirs if not d.startswith('.')]
                
                for name in files + dirs:
                    if self.search_cancelled:
                        break
                    
                    if search_text.lower() in name.lower():
                        full_path = os.path.join(root, name)
                        results.append((name, full_path, name in files))
        
        except Exception:
            pass
        
        # 更新搜索结果
        if not self.search_cancelled:
            self._update_search_results(results)
    
    def _update_search_results(self, results: list):
        """更新搜索结果
        
        Args:
            results: 搜索结果列表
        """
        if results:
            # 清空模型并显示搜索结果
            self.file_model.clear()
            self.file_model.setHorizontalHeaderLabels(['名称', '类型', '大小', '修改日期'])
            
            for name, path, is_file in results:
                self.file_model._add_item(name, path, not is_file)
            
            self.proxy_model.setSourceModel(self.file_model)
            self.file_view.setModel(self.proxy_model)
            
            self.status_label.setText(f"找到 {len(results)} 个匹配项")
        else:
            self.status_label.setText("未找到匹配项")
    
    def show_context_menu(self, position):
        """显示上下文菜单
        
        Args:
            position: 菜单显示位置
        """
        selected_indexes = self.file_view.selectionModel().selectedIndexes()
        if not selected_indexes:
            return
        
        context_menu = QMenu()
        
        open_action = context_menu.addAction("打开")
        open_action.triggered.connect(self.open_selected_file)
        
        context_menu.addSeparator()
        
        copy_action = context_menu.addAction("复制")
        copy_action.triggered.connect(self.copy_files)
        
        cut_action = context_menu.addAction("剪切")
        cut_action.triggered.connect(self.cut_files)
        
        if self.clipboard:
            paste_action = context_menu.addAction("粘贴")
            paste_action.triggered.connect(self.paste_files)
        
        context_menu.addSeparator()
        
        selected_count = len({idx.row() for idx in selected_indexes})
        
        if selected_count == 1:
            rename_action = context_menu.addAction("重命名")
            rename_action.triggered.connect(self.rename_file)
        
        delete_action = context_menu.addAction("删除")
        delete_action.triggered.connect(self.delete_files)
        
        context_menu.exec(self.file_view.mapToGlobal(position))
    
    def on_file_double_clicked(self, index):
        """双击文件事件
        
        Args:
            index: 点击的索引
        """
        source_index = self.proxy_model.mapToSource(index)
        file_path = source_index.data(Qt.UserRole)
        
        if file_path and os.path.exists(file_path):
            if os.path.isdir(file_path):
                self.current_path = file_path
                self.load_files()
            else:
                self.system_controller.open_file(file_path)
    
    def on_selection_changed(self, selected, deselected):
        """处理文件选择变化事件
        
        Args:
            selected: 选中的索引
            deselected: 取消选中的索引
        """
        self.clear_preview()
        
        indexes = selected.indexes()
        if not indexes:
            return
        
        index = indexes[0]
        source_index = self.proxy_model.mapToSource(index)
        file_path = source_index.data(Qt.UserRole)
        
        if file_path and os.path.isfile(file_path):
            self.preview_title.setText(f"预览: {os.path.basename(file_path)}")
            preview_widget = self.file_previewer.preview_file(file_path)
            if preview_widget:
                self.preview_content_layout.addWidget(preview_widget)
    
    def clear_preview(self):
        """清除预览内容"""
        while self.preview_content_layout.count() > 0:
            item = self.preview_content_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()
    
    def get_selected_file_paths(self) -> List[str]:
        """获取选中的文件路径
        
        Returns:
            List[str]: 文件路径列表
        """
        selected_indexes = self.file_view.selectionModel().selectedIndexes()
        if not selected_indexes:
            return []
        
        file_paths = []
        for index in selected_indexes:
            if index.column() == 0:
                source_index = self.proxy_model.mapToSource(index)
                file_path = source_index.data(Qt.UserRole)
                if file_path and file_path not in file_paths and os.path.exists(file_path):
                    file_paths.append(file_path)
        
        return file_paths
    
    def open_selected_file(self):
        """打开选中的文件"""
        file_paths = self.get_selected_file_paths()
        if file_paths:
            for file_path in file_paths:
                self.system_controller.open_file(file_path)
    
    def create_new_folder(self):
        """创建新文件夹"""
        folder_name, ok = QInputDialog.getText(self, "新建文件夹", "请输入文件夹名称:")
        
        if ok and folder_name:
            invalid_chars = '/\\:*?"<>|'
            if any(char in folder_name for char in invalid_chars):
                QMessageBox.warning(self, "警告", f"名称不能包含: {invalid_chars}")
                return
            
            folder_path = os.path.join(self.current_path, folder_name)
            
            if os.path.exists(folder_path):
                QMessageBox.warning(self, "警告", "文件夹已存在")
                return
            
            if self.file_operations.create_directory(folder_path):
                self.refresh()
                self.status_label.setText(f"已创建: {folder_name}")
            else:
                QMessageBox.critical(self, "错误", "创建失败")
    
    def copy_files(self):
        """复制文件"""
        file_paths = self.get_selected_file_paths()
        if not file_paths:
            QMessageBox.information(self, "提示", "请选择文件")
            return
        
        self.clipboard = file_paths
        self.clipboard_operation = "copy"
        self.status_label.setText(f"已复制 {len(file_paths)} 个项目")
    
    def cut_files(self):
        """剪切文件"""
        file_paths = self.get_selected_file_paths()
        if not file_paths:
            QMessageBox.information(self, "提示", "请选择文件")
            return
        
        self.clipboard = file_paths
        self.clipboard_operation = "cut"
        self.status_label.setText(f"已剪切 {len(file_paths)} 个项目")
    
    def paste_files(self):
        """粘贴文件"""
        if not self.clipboard:
            QMessageBox.information(self, "提示", "剪贴板为空")
            return
        
        # 检查是否有冲突
        for source_path in self.clipboard:
            target_path = os.path.join(self.current_path, os.path.basename(source_path))
            if os.path.exists(target_path):
                reply = QMessageBox.question(
                    self, "确认",
                    f"文件 '{os.path.basename(source_path)}' 已存在，是否替换？",
                    QMessageBox.Yes | QMessageBox.No
                )
                if reply == QMessageBox.No:
                    return
        
        # 显示进度对话框
        operation = "复制" if self.clipboard_operation == "copy" else "移动"
        self.progress_dialog = QProgressDialog(f"正在{operation}...", "取消", 0, 100, self)
        self.progress_dialog.setWindowTitle(f"{operation}文件")
        self.progress_dialog.setWindowModality(Qt.WindowModal)
        self.progress_dialog.setValue(0)
        self.progress_dialog.show()
        
        # 在后台线程中执行
        threading.Thread(
            target=self._paste_files_thread,
            args=(operation,),
            daemon=True
        ).start()
    
    def _paste_files_thread(self, operation: str):
        """粘贴文件的线程函数
        
        Args:
            operation: 操作类型
        """
        try:
            if self.clipboard_operation == "copy":
                success, failed = self.file_operations.copy_files(
                    self.clipboard,
                    self.current_path,
                    self._progress_callback
                )
            else:
                success, failed = self.file_operations.move_files(
                    self.clipboard,
                    self.current_path,
                    self._progress_callback
                )
            
            self.operation_complete.emit(success, operation, failed)
            
            if self.clipboard_operation == "cut" and success:
                self.clipboard = []
        except Exception as e:
            self.operation_complete.emit(False, operation, [str(e)])
    
    def rename_file(self):
        """重命名文件"""
        file_paths = self.get_selected_file_paths()
        if len(file_paths) != 1:
            QMessageBox.information(self, "提示", "请选择一个文件")
            return
        
        file_path = file_paths[0]
        file_name = os.path.basename(file_path)
        
        new_name, ok = QInputDialog.getText(self, "重命名", "新名称:", text=file_name)
        
        if ok and new_name and new_name != file_name:
            invalid_chars = '/\\:*?"<>|'
            if any(char in new_name for char in invalid_chars):
                QMessageBox.warning(self, "警告", f"名称不能包含: {invalid_chars}")
                return
            
            new_path = os.path.join(os.path.dirname(file_path), new_name)
            
            if os.path.exists(new_path):
                QMessageBox.warning(self, "警告", "文件已存在")
                return
            
            try:
                os.rename(file_path, new_path)
                self.refresh()
                self.status_label.setText(f"已重命名为: {new_name}")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"重命名失败: {str(e)}")
    
    def delete_files(self):
        """删除文件"""
        file_paths = self.get_selected_file_paths()
        if not file_paths:
            QMessageBox.information(self, "提示", "请选择文件")
            return
        
        count = len(file_paths)
        reply = QMessageBox.question(
            self, "确认删除",
            f"确定删除 {count} 个项目？此操作不可恢复！",
            QMessageBox.Yes | QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            self.progress_dialog = QProgressDialog("正在删除...", "取消", 0, 100, self)
            self.progress_dialog.setWindowTitle("删除文件")
            self.progress_dialog.setWindowModality(Qt.WindowModal)
            self.progress_dialog.setValue(0)
            self.progress_dialog.show()
            
            threading.Thread(
                target=self._delete_files_thread,
                args=(file_paths,),
                daemon=True
            ).start()
    
    def _delete_files_thread(self, file_paths: List[str]):
        """删除文件的线程函数
        
        Args:
            file_paths: 文件路径列表
        """
        try:
            success, failed = self.file_operations.delete_files(
                file_paths,
                self._progress_callback
            )
            self.operation_complete.emit(success, "删除", failed)
        except Exception as e:
            self.operation_complete.emit(False, "删除", [str(e)])
    
    def _progress_callback(self, progress: int, message: str):
        """进度回调函数
        
        Args:
            progress: 进度值
            message: 进度消息
        """
        self.update_progress.emit(progress, message)
    
    def _on_progress_update(self, progress: int, message: str):
        """进度更新处理
        
        Args:
            progress: 进度值
            message: 进度消息
        """
        if self.progress_dialog:
            self.progress_dialog.setValue(progress)
            self.progress_dialog.setLabelText(message)
    
    def _on_status_update(self, status: str):
        """状态更新处理
        
        Args:
            status: 状态消息
        """
        self.status_label.setText(status)
    
    def _on_operation_complete(self, success: bool, operation: str, failed: List[str]):
        """操作完成处理
        
        Args:
            success: 是否成功
            operation: 操作类型
            failed: 失败列表
        """
        if self.progress_dialog:
            self.progress_dialog.close()
        
        self.refresh()
        
        if success:
            self.status_label.setText(f"{operation}完成")
        else:
            if failed:
                QMessageBox.warning(self, "部分失败", f"{operation}操作部分失败:\n" + "\n".join(failed))
            else:
                QMessageBox.critical(self, "错误", f"{operation}失败")
    
    def toggle_show_hidden(self):
        """切换显示隐藏文件"""
        self.show_hidden_files = not self.show_hidden_files
        self.file_model.show_hidden = self.show_hidden_files
        self.load_files()
    
    def open_command_prompt(self, terminal_type: str = "cmd", admin: bool = False):
        """打开命令提示符
        
        Args:
            terminal_type: 终端类型
            admin: 是否以管理员身份打开
        """
        self.system_controller.open_terminal(self.current_path, terminal_type, admin)
    
    def open_task_manager(self):
        """打开任务管理器"""
        self.system_controller.open_task_manager()
    
    def lock_screen(self):
        """锁定屏幕"""
        self.system_controller.lock_screen()
    
    def shutdown_system(self):
        """关机"""
        reply = QMessageBox.question(
            self, "确认关机",
            "确定要关机吗？",
            QMessageBox.Yes | QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            self.system_controller.shutdown()
    
    def restart_system(self):
        """重启"""
        reply = QMessageBox.question(
            self, "确认重启",
            "确定要重启吗？",
            QMessageBox.Yes | QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            self.system_controller.restart()
    
    def sleep_system(self):
        """休眠"""
        self.system_controller.sleep()


def open_desktop_manager(parent=None):
    """打开桌面管理器的便捷函数
    
    Args:
        parent: 父窗口对象
        
    Returns:
        DesktopManagerMainWindow: 桌面管理器窗口实例
    """
    window = DesktopManagerMainWindow(parent)
    window.show()
    return window


# 模块导出
__all__ = ['DesktopManagerMainWindow', 'open_desktop_manager']