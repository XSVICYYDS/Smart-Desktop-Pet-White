"""
系统工具模块 - 替代Windows系统自带程序
包含计算器、画图、记事本、截图、磁盘清理、控制面板、放大镜、便签、闹钟等功能
"""

import os
import sys
import math
import datetime
import subprocess
from PyQt5.QtWidgets import (
    QWidget, QDialog, QVBoxLayout, QHBoxLayout, QPushButton,
    QLineEdit, QTextEdit, QLabel, QMessageBox, QMenu, QToolBar,
    QStatusBar, QScrollArea, QFrame, QSplitter, QGridLayout,
    QTableWidget, QTableWidgetItem, QHeaderView, QCheckBox,
    QRadioButton, QGroupBox, QTabWidget, QSpinBox, QDoubleSpinBox,
    QDateTimeEdit, QListWidget, QListWidgetItem, QProgressDialog,
    QInputDialog, QColorDialog, QFontDialog
)
from PyQt5.QtGui import (
    QIcon, QPixmap, QImage, QPainter, QPen, QBrush,
    QColor, QFont, QCursor, QKeySequence
)
from PyQt5.QtCore import (
    Qt, QSize, QPoint, QTimer, QDateTime, QRect, pyqtSignal
)


class CalculatorDialog(QDialog):
    """计算器对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("计算器")
        self.resize(300, 400)
        self.init_ui()
    
    def init_ui(self):
        """初始化计算器界面"""
        layout = QVBoxLayout(self)
        
        self.display = QLineEdit()
        self.display.setReadOnly(True)
        self.display.setAlignment(Qt.AlignRight)
        self.display.setFont(QFont("Arial", 20))
        self.display.setText("0")
        layout.addWidget(self.display)
        
        buttons = [
            ["C", "(", ")", "/"],
            ["7", "8", "9", "*"],
            ["4", "5", "6", "-"],
            ["1", "2", "3", "+"],
            ["0", ".", "=", "%"]
        ]
        
        grid_layout = QGridLayout()
        
        for row, button_row in enumerate(buttons):
            for col, text in enumerate(button_row):
                btn = QPushButton(text)
                btn.setFont(QFont("Arial", 14))
                btn.clicked.connect(lambda checked, t=text: self.on_button_click(t))
                grid_layout.addWidget(btn, row, col)
        
        layout.addLayout(grid_layout)
    
    def on_button_click(self, text):
        """处理按钮点击"""
        if text == "C":
            self.display.setText("0")
        elif text == "=":
            try:
                expr = self.display.text().replace("%", "/100")
                result = str(eval(expr))
                self.display.setText(result)
            except Exception:
                self.display.setText("错误")
        elif text == "%":
            current = self.display.text()
            try:
                result = str(float(current) / 100)
                self.display.setText(result)
            except Exception:
                self.display.setText("错误")
        else:
            current = self.display.text()
            if current == "0" and text != ".":
                self.display.setText(text)
            else:
                self.display.setText(current + text)


class PaintDialog(QDialog):
    """画图工具对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("画图工具")
        self.resize(800, 600)
        self.init_ui()
    
    def init_ui(self):
        """初始化画图界面"""
        layout = QVBoxLayout(self)
        
        toolbar = QToolBar()
        
        self.pen_color_btn = QPushButton("颜色")
        self.pen_color_btn.clicked.connect(self.select_color)
        toolbar.addWidget(self.pen_color_btn)
        
        self.pen_size_spin = QSpinBox()
        self.pen_size_spin.setRange(1, 50)
        self.pen_size_spin.setValue(3)
        toolbar.addWidget(QLabel("画笔大小"))
        toolbar.addWidget(self.pen_size_spin)
        
        self.eraser_btn = QPushButton("橡皮擦")
        self.eraser_btn.clicked.connect(self.use_eraser)
        toolbar.addWidget(self.eraser_btn)
        
        self.clear_btn = QPushButton("清空")
        self.clear_btn.clicked.connect(self.clear_canvas)
        toolbar.addWidget(self.clear_btn)
        
        self.save_btn = QPushButton("保存")
        self.save_btn.clicked.connect(self.save_image)
        toolbar.addWidget(self.save_btn)
        
        layout.addWidget(toolbar)
        
        self.canvas = PaintCanvas()
        layout.addWidget(self.canvas)
    
    def select_color(self):
        """选择颜色"""
        color = QColorDialog.getColor(Qt.black, self)
        if color.isValid():
            self.canvas.set_pen_color(color)
            self.eraser_btn.setStyleSheet("")
    
    def use_eraser(self):
        """使用橡皮擦"""
        self.canvas.set_pen_color(Qt.white)
        self.eraser_btn.setStyleSheet("background-color: #888")
    
    def clear_canvas(self):
        """清空画布"""
        self.canvas.clear()
    
    def save_image(self):
        """保存图片"""
        from PyQt5.QtWidgets import QFileDialog
        file_path, _ = QFileDialog.getSaveFileName(self, "保存图片", "", "PNG图片 (*.png);;JPEG图片 (*.jpg)")
        if file_path:
            if self.canvas.save(file_path):
                QMessageBox.information(self, "成功", "图片保存成功！")
            else:
                QMessageBox.warning(self, "失败", "图片保存失败！")


class PaintCanvas(QWidget):
    """画图画布"""
    
    def __init__(self):
        super().__init__()
        self.image = QImage(800, 600, QImage.Format_RGB32)
        self.image.fill(Qt.white)
        self.drawing = False
        self.last_point = QPoint()
        self.pen_color = QColor(Qt.black)
        self.pen_size = 3
    
    def set_pen_color(self, color):
        """设置画笔颜色"""
        self.pen_color = color
    
    def set_pen_size(self, size):
        """设置画笔大小"""
        self.pen_size = size
    
    def clear(self):
        """清空画布"""
        self.image.fill(Qt.white)
        self.update()
    
    def save(self, file_path):
        """保存图片"""
        return self.image.save(file_path)
    
    def paintEvent(self, event):
        """绘制事件"""
        painter = QPainter(self)
        painter.drawImage(QPoint(0, 0), self.image)
    
    def mousePressEvent(self, event):
        """鼠标按下事件"""
        if event.button() == Qt.LeftButton:
            self.drawing = True
            self.last_point = event.pos()
    
    def mouseMoveEvent(self, event):
        """鼠标移动事件"""
        if event.buttons() & Qt.LeftButton and self.drawing:
            painter = QPainter(self.image)
            pen = QPen(self.pen_color, self.pen_size, Qt.SolidLine)
            painter.setPen(pen)
            painter.drawLine(self.last_point, event.pos())
            self.last_point = event.pos()
            self.update()
    
    def mouseReleaseEvent(self, event):
        """鼠标释放事件"""
        if event.button() == Qt.LeftButton:
            self.drawing = False
    
    def resizeEvent(self, event):
        """调整大小事件"""
        new_image = QImage(self.size(), QImage.Format_RGB32)
        new_image.fill(Qt.white)
        painter = QPainter(new_image)
        painter.drawImage(QPoint(0, 0), self.image)
        self.image = new_image
        self.update()


class NotepadDialog(QDialog):
    """记事本对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("记事本")
        self.resize(600, 400)
        self.init_ui()
    
    def init_ui(self):
        """初始化记事本界面"""
        layout = QVBoxLayout(self)
        
        toolbar = QToolBar()
        
        self.new_btn = QPushButton("新建")
        self.new_btn.clicked.connect(self.new_file)
        toolbar.addWidget(self.new_btn)
        
        self.open_btn = QPushButton("打开")
        self.open_btn.clicked.connect(self.open_file)
        toolbar.addWidget(self.open_btn)
        
        self.save_btn = QPushButton("保存")
        self.save_btn.clicked.connect(self.save_file)
        toolbar.addWidget(self.save_btn)
        
        self.save_as_btn = QPushButton("另存为")
        self.save_as_btn.clicked.connect(self.save_as_file)
        toolbar.addWidget(self.save_as_btn)
        
        layout.addWidget(toolbar)
        
        self.text_edit = QTextEdit()
        layout.addWidget(self.text_edit)
        
        self.current_file = None
    
    def new_file(self):
        """新建文件"""
        self.text_edit.clear()
        self.current_file = None
        self.setWindowTitle("记事本")
    
    def open_file(self):
        """打开文件"""
        file_path, _ = QFileDialog.getOpenFileName(self, "打开文件", "", "文本文件 (*.txt);;所有文件 (*)")
        if file_path:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    self.text_edit.setText(f.read())
                self.current_file = file_path
                self.setWindowTitle(f"记事本 - {file_path}")
            except Exception as e:
                QMessageBox.warning(self, "错误", f"打开文件失败: {e}")
    
    def save_file(self):
        """保存文件"""
        if self.current_file:
            try:
                with open(self.current_file, 'w', encoding='utf-8') as f:
                    f.write(self.text_edit.toPlainText())
                QMessageBox.information(self, "成功", "文件保存成功！")
            except Exception as e:
                QMessageBox.warning(self, "错误", f"保存文件失败: {e}")
        else:
            self.save_as_file()
    
    def save_as_file(self):
        """另存为"""
        file_path, _ = QFileDialog.getSaveFileName(self, "保存文件", "", "文本文件 (*.txt);;所有文件 (*)")
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(self.text_edit.toPlainText())
                self.current_file = file_path
                self.setWindowTitle(f"记事本 - {file_path}")
                QMessageBox.information(self, "成功", "文件保存成功！")
            except Exception as e:
                QMessageBox.warning(self, "错误", f"保存文件失败: {e}")


class SnippingToolDialog(QDialog):
    """截图工具对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("截图工具")
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setStyleSheet("background-color: rgba(0, 0, 0, 0.3)")
        self.showFullScreen()
        
        self.screen_image = QApplication.primaryScreen().grabWindow(0)
        self.drawing = False
        self.start_point = QPoint()
        self.end_point = QPoint()
    
    def paintEvent(self, event):
        """绘制遮罩和选区"""
        painter = QPainter(self)
        
        mask_color = QColor(0, 0, 0, 128)
        painter.fillRect(self.rect(), mask_color)
        
        if self.start_point != self.end_point:
            rect = QRect(self.start_point, self.end_point).normalized()
            painter.drawImage(rect, self.screen_image.toImage(), rect)
            
            pen = QPen(QColor(255, 0, 0), 2, Qt.DashLine)
            painter.setPen(pen)
            painter.drawRect(rect)
    
    def mousePressEvent(self, event):
        """鼠标按下事件"""
        if event.button() == Qt.LeftButton:
            self.drawing = True
            self.start_point = event.globalPos()
            self.end_point = event.start_point
    
    def mouseMoveEvent(self, event):
        """鼠标移动事件"""
        if self.drawing:
            self.end_point = event.globalPos()
            self.update()
    
    def mouseReleaseEvent(self, event):
        """鼠标释放事件"""
        if event.button() == Qt.LeftButton:
            self.drawing = False
            rect = QRect(self.start_point, self.end_point).normalized()
            
            if rect.width() > 10 and rect.height() > 10:
                captured_image = self.screen_image.copy(rect)
                self.show_save_dialog(captured_image)
            else:
                QMessageBox.warning(self, "提示", "选区太小，请重新选择")
            
            self.close()
    
    def show_save_dialog(self, image):
        """显示保存对话框"""
        dialog = QDialog(self)
        dialog.setWindowTitle("保存截图")
        dialog.resize(400, 300)
        
        layout = QVBoxLayout(dialog)
        
        label = QLabel()
        label.setPixmap(QPixmap.fromImage(image.toImage()))
        layout.addWidget(label)
        
        btn_layout = QHBoxLayout()
        save_btn = QPushButton("保存")
        copy_btn = QPushButton("复制到剪贴板")
        
        def save():
            file_path, _ = QFileDialog.getSaveFileName(dialog, "保存截图", "", "PNG图片 (*.png)")
            if file_path:
                image.save(file_path)
                QMessageBox.information(dialog, "成功", "截图保存成功！")
                dialog.close()
        
        def copy_to_clipboard():
            clipboard = QApplication.clipboard()
            clipboard.setPixmap(QPixmap.fromImage(image.toImage()))
            QMessageBox.information(dialog, "成功", "截图已复制到剪贴板！")
            dialog.close()
        
        save_btn.clicked.connect(save)
        copy_btn.clicked.connect(copy_to_clipboard)
        
        btn_layout.addWidget(save_btn)
        btn_layout.addWidget(copy_btn)
        layout.addLayout(btn_layout)
        
        dialog.exec_()


class DiskCleanupDialog(QDialog):
    """磁盘清理工具对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("磁盘清理")
        self.resize(600, 400)
        self.init_ui()
    
    def init_ui(self):
        """初始化磁盘清理界面"""
        layout = QVBoxLayout(self)
        
        drives_group = QGroupBox("选择驱动器")
        drives_layout = QVBoxLayout(drives_group)
        
        self.drive_list = QListWidget()
        for drive in self.get_drives():
            self.drive_list.addItem(drive)
        drives_layout.addWidget(self.drive_list)
        layout.addWidget(drives_group)
        
        self.scanned_label = QLabel("选择驱动器后点击扫描")
        layout.addWidget(self.scanned_label)
        
        self.cleanup_list = QTableWidget()
        self.cleanup_list.setColumnCount(3)
        self.cleanup_list.setHorizontalHeaderLabels(["项目", "大小", "是否清理"])
        self.cleanup_list.horizontalHeader().setStretchLastSection(True)
        layout.addWidget(self.cleanup_list)
        
        btn_layout = QHBoxLayout()
        self.scan_btn = QPushButton("扫描")
        self.clean_btn = QPushButton("清理")
        
        self.scan_btn.clicked.connect(self.scan_disk)
        self.clean_btn.clicked.connect(self.clean_disk)
        
        btn_layout.addWidget(self.scan_btn)
        btn_layout.addWidget(self.clean_btn)
        layout.addLayout(btn_layout)
    
    def get_drives(self):
        """获取可用驱动器"""
        drives = []
        for drive in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            path = f"{drive}:\\"
            if os.path.exists(path):
                drives.append(path)
        return drives
    
    def scan_disk(self):
        """扫描磁盘"""
        if not self.drive_list.currentItem():
            QMessageBox.warning(self, "提示", "请选择驱动器")
            return
        
        drive = self.drive_list.currentItem().text()
        self.scanned_label.setText(f"正在扫描 {drive}...")
        
        try:
            recycle_bin = os.path.join(drive, "$Recycle.Bin")
            temp_dir = os.path.join(os.environ.get("TEMP", ""))
            downloads_dir = os.path.join(os.environ.get("USERPROFILE", ""), "Downloads")
            
            items = []
            
            if os.path.exists(recycle_bin):
                size = self.get_directory_size(recycle_bin)
                if size > 0:
                    items.append(("回收站", self.format_size(size), True))
            
            if os.path.exists(temp_dir) and temp_dir.startswith(drive):
                size = self.get_directory_size(temp_dir)
                if size > 0:
                    items.append(("临时文件", self.format_size(size), True))
            
            if os.path.exists(downloads_dir) and downloads_dir.startswith(drive):
                size = self.get_directory_size(downloads_dir)
                if size > 0:
                    items.append(("下载文件夹", self.format_size(size), False))
            
            self.cleanup_list.setRowCount(len(items))
            for i, (name, size, checked) in enumerate(items):
                self.cleanup_list.setItem(i, 0, QTableWidgetItem(name))
                self.cleanup_list.setItem(i, 1, QTableWidgetItem(size))
                checkbox = QTableWidgetItem()
                checkbox.setCheckState(Qt.Checked if checked else Qt.Unchecked)
                self.cleanup_list.setItem(i, 2, checkbox)
            
            self.scanned_label.setText(f"扫描完成，找到 {len(items)} 个可清理项目")
        
        except Exception as e:
            QMessageBox.warning(self, "错误", f"扫描失败: {e}")
    
    def get_directory_size(self, path):
        """获取目录大小"""
        total_size = 0
        try:
            for dirpath, dirnames, filenames in os.walk(path):
                for filename in filenames:
                    try:
                        total_size += os.path.getsize(os.path.join(dirpath, filename))
                    except Exception:
                        continue
        except Exception:
            pass
        return total_size
    
    def format_size(self, size):
        """格式化文件大小"""
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.2f} KB"
        elif size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.2f} MB"
        else:
            return f"{size / (1024 * 1024 * 1024):.2f} GB"
    
    def clean_disk(self):
        """清理磁盘"""
        drive = self.drive_list.currentItem().text()
        
        for i in range(self.cleanup_list.rowCount()):
            checkbox = self.cleanup_list.item(i, 2)
            if checkbox and checkbox.checkState() == Qt.Checked:
                name = self.cleanup_list.item(i, 0).text()
                try:
                    if name == "回收站":
                        subprocess.run(["rd", "/s", "/q", os.path.join(drive, "$Recycle.Bin")], 
                                       shell=True, check=True)
                    elif name == "临时文件":
                        temp_dir = os.path.join(os.environ.get("TEMP", ""))
                        if temp_dir.startswith(drive):
                            for f in os.listdir(temp_dir):
                                try:
                                    os.remove(os.path.join(temp_dir, f))
                                except Exception:
                                    pass
                    QMessageBox.information(self, "成功", f"{name} 清理完成！")
                except Exception as e:
                    QMessageBox.warning(self, "错误", f"清理 {name} 失败: {e}")


class ControlPanelDialog(QDialog):
    """控制面板对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("控制面板")
        self.resize(600, 400)
        self.init_ui()
    
    def init_ui(self):
        """初始化控制面板界面"""
        layout = QVBoxLayout(self)
        
        self.tab_widget = QTabWidget()
        
        system_tab = QWidget()
        system_layout = QVBoxLayout(system_tab)
        
        system_items = [
            ("系统信息", self.show_system_info),
            ("环境变量", self.show_env_vars),
            ("网络设置", self.open_network_settings),
            ("显示设置", self.open_display_settings),
        ]
        
        for name, func in system_items:
            btn = QPushButton(name)
            btn.clicked.connect(func)
            system_layout.addWidget(btn)
        
        self.tab_widget.addTab(system_tab, "系统")
        
        apps_tab = QWidget()
        apps_layout = QVBoxLayout(apps_tab)
        
        apps_items = [
            ("已安装程序", self.show_installed_programs),
            ("默认应用", self.open_default_apps),
        ]
        
        for name, func in apps_items:
            btn = QPushButton(name)
            btn.clicked.connect(func)
            apps_layout.addWidget(btn)
        
        self.tab_widget.addTab(apps_tab, "应用")
        
        layout.addWidget(self.tab_widget)
    
    def show_system_info(self):
        """显示系统信息"""
        info = f"操作系统: {os.name}\n"
        info += f"平台: {sys.platform}\n"
        info += f"Python版本: {sys.version}\n"
        info += f"CPU核心: {os.cpu_count()}\n"
        info += f"当前目录: {os.getcwd()}\n"
        
        QMessageBox.information(self, "系统信息", info)
    
    def show_env_vars(self):
        """显示环境变量"""
        env_str = "\n".join([f"{k}={v}" for k, v in os.environ.items()])
        
        dialog = QDialog(self)
        dialog.setWindowTitle("环境变量")
        dialog.resize(600, 400)
        
        layout = QVBoxLayout(dialog)
        text_edit = QTextEdit()
        text_edit.setText(env_str)
        text_edit.setReadOnly(True)
        layout.addWidget(text_edit)
        
        dialog.exec_()
    
    def open_network_settings(self):
        """打开网络设置"""
        try:
            subprocess.run(["start", "ms-settings:network"], shell=True)
        except Exception:
            QMessageBox.warning(self, "提示", "无法打开网络设置")
    
    def open_display_settings(self):
        """打开显示设置"""
        try:
            subprocess.run(["start", "ms-settings:display"], shell=True)
        except Exception:
            QMessageBox.warning(self, "提示", "无法打开显示设置")
    
    def show_installed_programs(self):
        """显示已安装程序"""
        try:
            subprocess.run(["start", "appwiz.cpl"], shell=True)
        except Exception:
            QMessageBox.warning(self, "提示", "无法打开程序和功能")
    
    def open_default_apps(self):
        """打开默认应用"""
        try:
            subprocess.run(["start", "ms-settings:defaultapps"], shell=True)
        except Exception:
            QMessageBox.warning(self, "提示", "无法打开默认应用设置")


class MagnifierWidget(QWidget):
    """放大镜窗口"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("放大镜")
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.resize(300, 300)
        
        self.magnification = 2
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_magnifier)
        self.timer.start(50)
    
    def update_magnifier(self):
        """更新放大镜显示"""
        cursor_pos = QCursor.pos()
        screen = QApplication.primaryScreen()
        
        capture_rect = QRect(cursor_pos.x() - 50, cursor_pos.y() - 50, 100, 100)
        screenshot = screen.grabWindow(0, capture_rect.x(), capture_rect.y(), 
                                       capture_rect.width(), capture_rect.height())
        
        pixmap = screenshot.scaled(self.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation)
        
        painter = QPainter(self)
        painter.drawPixmap(self.rect(), pixmap)
        
        self.move(cursor_pos.x() + 50, cursor_pos.y() + 50)
    
    def closeEvent(self, event):
        """关闭事件"""
        self.timer.stop()
        super().closeEvent(event)


class StickyNotesDialog(QDialog):
    """便签对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("便签")
        self.resize(400, 300)
        self.init_ui()
    
    def init_ui(self):
        """初始化便签界面"""
        layout = QVBoxLayout(self)
        
        toolbar = QToolBar()
        
        self.new_note_btn = QPushButton("新建便签")
        self.new_note_btn.clicked.connect(self.new_note)
        toolbar.addWidget(self.new_note_btn)
        
        self.delete_note_btn = QPushButton("删除便签")
        self.delete_note_btn.clicked.connect(self.delete_note)
        toolbar.addWidget(self.delete_note_btn)
        
        layout.addWidget(toolbar)
        
        self.notes_list = QListWidget()
        self.notes_list.itemDoubleClicked.connect(self.edit_note)
        layout.addWidget(self.notes_list)
        
        self.load_notes()
    
    def load_notes(self):
        """加载便签"""
        self.notes_list.clear()
        notes_file = os.path.join(os.environ.get("USERPROFILE", ""), ".sticky_notes.txt")
        if os.path.exists(notes_file):
            try:
                with open(notes_file, 'r', encoding='utf-8') as f:
                    notes = f.readlines()
                    for note in notes:
                        note = note.strip()
                        if note:
                            self.notes_list.addItem(note)
            except Exception:
                pass
    
    def save_notes(self):
        """保存便签"""
        notes_file = os.path.join(os.environ.get("USERPROFILE", ""), ".sticky_notes.txt")
        try:
            with open(notes_file, 'w', encoding='utf-8') as f:
                for i in range(self.notes_list.count()):
                    f.write(self.notes_list.item(i).text() + "\n")
        except Exception:
            pass
    
    def new_note(self):
        """新建便签"""
        text, ok = QInputDialog.getText(self, "新建便签", "输入便签内容:")
        if ok and text:
            self.notes_list.addItem(text)
            self.save_notes()
    
    def edit_note(self, item):
        """编辑便签"""
        text, ok = QInputDialog.getText(self, "编辑便签", "修改便签内容:", text=item.text())
        if ok and text:
            item.setText(text)
            self.save_notes()
    
    def delete_note(self):
        """删除便签"""
        current = self.notes_list.currentItem()
        if current:
            reply = QMessageBox.question(self, "确认删除", "确定要删除这个便签吗？")
            if reply == QMessageBox.Yes:
                self.notes_list.takeItem(self.notes_list.row(current))
                self.save_notes()


class AlarmDialog(QDialog):
    """闹钟对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("闹钟")
        self.resize(400, 300)
        self.init_ui()
    
    def init_ui(self):
        """初始化闹钟界面"""
        layout = QVBoxLayout(self)
        
        self.alarm_list = QListWidget()
        layout.addWidget(self.alarm_list)
        
        btn_layout = QHBoxLayout()
        
        self.add_btn = QPushButton("添加闹钟")
        self.add_btn.clicked.connect(self.add_alarm)
        btn_layout.addWidget(self.add_btn)
        
        self.delete_btn = QPushButton("删除闹钟")
        self.delete_btn.clicked.connect(self.delete_alarm)
        btn_layout.addWidget(self.delete_btn)
        
        layout.addLayout(btn_layout)
        
        self.timer = QTimer()
        self.timer.timeout.connect(self.check_alarms)
        self.timer.start(1000)
        
        self.alarms = []
    
    def check_alarms(self):
        """检查闹钟"""
        now = datetime.datetime.now()
        for alarm in self.alarms[:]:
            if alarm['active'] and now >= alarm['time']:
                QMessageBox.information(self, "闹钟响了！", alarm['message'])
                alarm['active'] = False
    
    def add_alarm(self):
        """添加闹钟"""
        dialog = QDialog(self)
        dialog.setWindowTitle("添加闹钟")
        dialog.resize(300, 200)
        
        layout = QVBoxLayout(dialog)
        
        time_edit = QDateTimeEdit(QDateTime.currentDateTime())
        time_edit.setDisplayFormat("yyyy-MM-dd HH:mm:ss")
        layout.addWidget(time_edit)
        
        message_edit = QLineEdit()
        message_edit.setPlaceholderText("闹钟提示信息")
        layout.addWidget(message_edit)
        
        ok_btn = QPushButton("确定")
        ok_btn.clicked.connect(dialog.accept)
        layout.addWidget(ok_btn)
        
        if dialog.exec_() == QDialog.Accepted:
            alarm_time = time_edit.dateTime().toPyDateTime()
            message = message_edit.text() or "闹钟响了！"
            
            self.alarms.append({
                'time': alarm_time,
                'message': message,
                'active': True
            })
            
            self.alarm_list.addItem(f"{alarm_time.strftime('%Y-%m-%d %H:%M:%S')} - {message}")
    
    def delete_alarm(self):
        """删除闹钟"""
        current = self.alarm_list.currentRow()
        if current >= 0:
            self.alarm_list.takeItem(current)
            del self.alarms[current]
    
    def closeEvent(self, event):
        """关闭事件"""
        self.timer.stop()
        super().closeEvent(event)


def open_calculator(parent=None):
    """打开计算器"""
    dialog = CalculatorDialog(parent)
    dialog.exec_()


def open_paint(parent=None):
    """打开画图工具"""
    dialog = PaintDialog(parent)
    dialog.exec_()


def open_notepad(parent=None):
    """打开记事本"""
    dialog = NotepadDialog(parent)
    dialog.exec_()


def open_snipping_tool(parent=None):
    """打开截图工具"""
    dialog = SnippingToolDialog(parent)
    dialog.exec_()


def open_disk_cleanup(parent=None):
    """打开磁盘清理"""
    dialog = DiskCleanupDialog(parent)
    dialog.exec_()


def open_control_panel(parent=None):
    """打开控制面板"""
    dialog = ControlPanelDialog(parent)
    dialog.exec_()


def open_magnifier(parent=None):
    """打开放大镜"""
    widget = MagnifierWidget(parent)
    widget.show()


def open_sticky_notes(parent=None):
    """打开便签"""
    dialog = StickyNotesDialog(parent)
    dialog.exec_()


def open_alarm(parent=None):
    """打开闹钟"""
    dialog = AlarmDialog(parent)
    dialog.exec_()
