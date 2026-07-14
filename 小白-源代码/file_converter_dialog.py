"""
文件格式转换对话框 - 小白桌面宠物集成版
提供Word/Excel/PPT/PDF/图片等格式的转换功能
"""

import os
from pathlib import Path
from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QComboBox, QFileDialog, QListWidget, QProgressBar,
    QMessageBox, QGroupBox, QFrame, QScrollArea, QGridLayout,
    QApplication
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QSize
from PyQt5.QtGui import QFont, QColor

from file_converter import FileConverter


class ConvertWorkerThread(QThread):
    """转换工作线程
    
    在后台执行文件转换任务，避免界面卡顿
    """
    finished_signal = pyqtSignal(bool, str)
    progress_signal = pyqtSignal(int, int, str)

    def __init__(self, converter, conv_type, source_paths, target_path):
        """初始化转换线程
        
        Args:
            converter: FileConverter实例
            conv_type: 转换类型
            source_paths: 源文件路径列表
            target_path: 目标文件路径
        """
        super().__init__()
        self.converter = converter
        self.conv_type = conv_type
        self.source_paths = source_paths
        self.target_path = target_path

    def run(self):
        """执行转换任务"""
        try:
            success, msg = self.converter.convert(
                self.conv_type,
                self.source_paths,
                self.target_path,
                progress_callback=self._on_progress
            )
            self.finished_signal.emit(success, msg)
        except Exception as e:
            self.finished_signal.emit(False, f"转换出错: {str(e)}")

    def _on_progress(self, current, total, message):
        """进度回调"""
        self.progress_signal.emit(current, total, message)


class FileConverterDialog(QDialog):
    """文件格式转换对话框"""

    def __init__(self, parent=None):
        """初始化文件转换对话框
        
        Args:
            parent: 父窗口对象
        """
        super().__init__(parent)
        self.converter = FileConverter()
        self.worker = None
        self.selected_conversion = None
        self.source_files = []
        self.target_path = ""
        self.init_ui()
        self.apply_style()

    def init_ui(self):
        """初始化界面"""
        self.setWindowTitle("📄 文件格式转换 - 小白桌面宠物")
        self.setMinimumSize(700, 600)
        self.setGeometry(100, 100, 700, 600)

        layout = QVBoxLayout()
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # 标题
        title = QLabel("📄 文件格式转换工具")
        title.setFont(QFont("Microsoft YaHei", 18, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("color: #FF69B4;")
        layout.addWidget(title)

        subtitle = QLabel("支持 Word / Excel / PPT / PDF / 图片 等格式互转")
        subtitle.setAlignment(Qt.AlignCenter)
        subtitle.setStyleSheet("color: #888; font-size: 12px;")
        layout.addWidget(subtitle)

        # 转换类型选择区
        type_group = QGroupBox("① 选择转换类型")
        type_layout = QVBoxLayout()

        self.type_combo = QComboBox()
        self.type_combo.setFont(QFont("Microsoft YaHei", 11))
        for key, info in self.converter.CONVERSIONS.items():
            self.type_combo.addItem(f"{info['name']} - {info['description']}", key)
        self.type_combo.currentIndexChanged.connect(self.on_type_changed)
        type_layout.addWidget(self.type_combo)

        # 转换类型说明
        self.type_desc_label = QLabel("")
        self.type_desc_label.setStyleSheet("color: #666; font-size: 11px; padding: 5px;")
        self.type_desc_label.setWordWrap(True)
        type_layout.addWidget(self.type_desc_label)

        type_group.setLayout(type_layout)
        layout.addWidget(type_group)

        # 源文件选择区
        src_group = QGroupBox("② 选择源文件（可多选）")
        src_layout = QVBoxLayout()

        btn_layout = QHBoxLayout()
        add_btn = QPushButton("➕ 添加文件")
        add_btn.clicked.connect(self.add_source_files)
        btn_layout.addWidget(add_btn)

        add_dir_btn = QPushButton("📁 添加文件夹")
        add_dir_btn.clicked.connect(self.add_source_folder)
        btn_layout.addWidget(add_dir_btn)

        clear_btn = QPushButton("🗑️ 清空列表")
        clear_btn.clicked.connect(self.clear_source_files)
        btn_layout.addWidget(clear_btn)

        btn_layout.addStretch()
        src_layout.addLayout(btn_layout)

        self.file_list = QListWidget()
        self.file_list.setMinimumHeight(120)
        self.file_list.setStyleSheet("font-size: 10px;")
        src_layout.addWidget(self.file_list)

        src_group.setLayout(src_layout)
        layout.addWidget(src_group)

        # 目标文件设置
        target_group = QGroupBox("③ 设置输出路径")
        target_layout = QHBoxLayout()

        self.target_label = QLabel("未设置输出路径")
        self.target_label.setStyleSheet("color: #666; padding: 5px;")
        target_layout.addWidget(self.target_label, 1)

        target_btn = QPushButton("📂 选择")
        target_btn.clicked.connect(self.select_target_path)
        target_layout.addWidget(target_btn)

        target_group.setLayout(target_layout)
        layout.addWidget(target_group)

        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setTextVisible(True)
        layout.addWidget(self.progress_bar)

        # 状态标签
        self.status_label = QLabel("请选择转换类型并添加文件")
        self.status_label.setAlignment(Qt.AlignCenter)
        self.status_label.setStyleSheet("color: #999; font-size: 11px;")
        layout.addWidget(self.status_label)

        # 按钮区
        btn_layout2 = QHBoxLayout()
        btn_layout2.addStretch()

        self.convert_btn = QPushButton("🔄 开始转换")
        self.convert_btn.setMinimumHeight(45)
        self.convert_btn.setMinimumWidth(150)
        self.convert_btn.setFont(QFont("Microsoft YaHei", 12, QFont.Bold))
        self.convert_btn.clicked.connect(self.start_convert)
        btn_layout2.addWidget(self.convert_btn)

        close_btn = QPushButton("关闭")
        close_btn.setMinimumHeight(45)
        close_btn.setMinimumWidth(80)
        close_btn.clicked.connect(self.close)
        btn_layout2.addWidget(close_btn)

        btn_layout2.addStretch()
        layout.addLayout(btn_layout2)

        self.setLayout(layout)

        # 初始化类型说明
        self.on_type_changed(0)

    def on_type_changed(self, index):
        """转换类型变更回调
        
        Args:
            index: 选择的索引
        """
        key = self.type_combo.itemData(index)
        if key:
            info = self.converter.CONVERSIONS[key]
            self.type_desc_label.setText(
                f"  支持的源文件: {', '.join(info['source_ext'])}  →  "
                f"输出格式: {info['target_ext']}"
            )
            self.selected_conversion = key
            # 清空已选文件（因为类型变了）
            self.file_list.clear()
            self.source_files = []
            self.target_path = ""
            self.target_label.setText("未设置输出路径")
            self.target_label.setStyleSheet("color: #666; padding: 5px;")

    def add_source_files(self):
        """添加源文件"""
        if not self.selected_conversion:
            QMessageBox.warning(self, "提示", "请先选择转换类型！")
            return

        info = self.converter.CONVERSIONS[self.selected_conversion]
        ext_filter = " ".join([f"*{e}" for e in info["source_ext"]])
        filter_str = f"支持的文件 ({ext_filter});;所有文件 (*.*)"

        files, _ = QFileDialog.getOpenFileNames(
            self, "选择源文件", "", filter_str
        )

        if files:
            self.source_files.extend(files)
            self.update_file_list()

    def add_source_folder(self):
        """从文件夹添加源文件"""
        if not self.selected_conversion:
            QMessageBox.warning(self, "提示", "请先选择转换类型！")
            return

        folder = QFileDialog.getExistingDirectory(self, "选择文件夹")
        if not folder:
            return

        info = self.converter.CONVERSIONS[self.selected_conversion]
        exts = [e.lower() for e in info["source_ext"]]

        found = []
        for f in os.listdir(folder):
            ext = os.path.splitext(f)[1].lower()
            if ext in exts:
                found.append(os.path.join(folder, f))

        if found:
            self.source_files.extend(found)
            self.update_file_list()
            QMessageBox.information(self, "提示", f"从文件夹中找到并添加了 {len(found)} 个文件。")
        else:
            QMessageBox.warning(self, "提示", "文件夹中没有找到匹配的文件。")

    def clear_source_files(self):
        """清空源文件列表"""
        self.file_list.clear()
        self.source_files = []
        self.status_label.setText("已清空文件列表")

    def update_file_list(self):
        """更新文件列表显示"""
        self.file_list.clear()
        for f in self.source_files:
            name = os.path.basename(f)
            size = os.path.getsize(f) / 1024
            size_str = f"{size:.1f} KB" if size < 1024 else f"{size / 1024:.1f} MB"
            self.file_list.addItem(f"📄 {name}  ({size_str})")

        self.status_label.setText(f"已添加 {len(self.source_files)} 个文件")

    def select_target_path(self):
        """选择目标输出路径"""
        if not self.selected_conversion:
            QMessageBox.warning(self, "提示", "请先选择转换类型！")
            return

        info = self.converter.CONVERSIONS[self.selected_conversion]
        target_ext = info["target_ext"]

        # PDF拆分特殊处理 - 选择文件夹
        if self.selected_conversion == "pdf_split":
            folder = QFileDialog.getExistingDirectory(self, "选择输出文件夹")
            if folder:
                if self.source_files:
                    base = os.path.splitext(os.path.basename(self.source_files[0]))[0]
                    self.target_path = os.path.join(folder, f"{base}.pdf")
                else:
                    self.target_path = os.path.join(folder, "output.pdf")
                self.target_label.setText(self.target_path)
                self.target_label.setStyleSheet("color: #27ae60; padding: 5px;")
            return

        # 默认目标文件名
        if self.source_files:
            default_name = os.path.splitext(os.path.basename(self.source_files[0]))[0]
            default_name += target_ext
        else:
            default_name = f"输出{target_ext}"

        target, _ = QFileDialog.getSaveFileName(
            self, "选择输出路径", default_name,
            f"输出文件 (*{target_ext});;所有文件 (*.*)"
        )

        if target:
            if not target.lower().endswith(target_ext):
                target += target_ext
            self.target_path = target
            self.target_label.setText(target)
            self.target_label.setStyleSheet("color: #27ae60; padding: 5px;")

    def start_convert(self):
        """开始转换"""
        if not self.selected_conversion:
            QMessageBox.warning(self, "提示", "请先选择转换类型！")
            return

        if not self.source_files:
            QMessageBox.warning(self, "提示", "请先添加要转换的文件！")
            return

        if not self.target_path:
            QMessageBox.warning(self, "提示", "请先设置输出路径！")
            return

        # Office相关转换需要检查是否安装了Office
        if self.selected_conversion in ("word_to_pdf", "excel_to_pdf", "ppt_to_pdf"):
            office_status = FileConverter.check_office_available()
            app_map = {"word_to_pdf": "word", "excel_to_pdf": "excel", "ppt_to_pdf": "ppt"}
            app_name_map = {"word": "Word", "excel": "Excel", "ppt": "PowerPoint"}
            app_key = app_map[self.selected_conversion]
            if not office_status.get(app_key):
                QMessageBox.warning(self, "提示",
                    f"未检测到 {app_name_map[app_key]}，无法执行此转换。\n"
                    f"请确保已安装 Microsoft Office。")
                return

        # 禁用按钮，显示进度条
        self.convert_btn.setEnabled(False)
        self.convert_btn.setText("⏳ 转换中...")
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.status_label.setText("开始转换...")
        QApplication.processEvents()

        # 启动转换线程
        self.worker = ConvertWorkerThread(
            self.converter,
            self.selected_conversion,
            self.source_files,
            self.target_path
        )
        self.worker.progress_signal.connect(self.on_progress)
        self.worker.finished_signal.connect(self.on_finished)
        self.worker.start()

    def on_progress(self, current, total, message):
        """转换进度回调
        
        Args:
            current: 当前进度
            total: 总数
            message: 进度消息
        """
        if total > 0:
            percent = int((current / total) * 100)
            self.progress_bar.setValue(percent)
        self.status_label.setText(message)

    def on_finished(self, success, message):
        """转换完成回调
        
        Args:
            success: 是否成功
            message: 结果消息
        """
        self.progress_bar.setVisible(False)
        self.convert_btn.setEnabled(True)
        self.convert_btn.setText("🔄 开始转换")

        if success:
            self.status_label.setText("✅ " + message)
            self.status_label.setStyleSheet("color: #27ae60; font-size: 12px;")
            # 询问是否打开输出文件
            reply = QMessageBox.question(
                self, "转换成功",
                f"{message}\n\n是否打开输出文件所在文件夹？",
                QMessageBox.Yes | QMessageBox.No
            )
            if reply == QMessageBox.Yes:
                folder = os.path.dirname(self.target_path)
                if os.path.exists(folder):
                    os.startfile(folder)
        else:
            self.status_label.setText("❌ " + message)
            self.status_label.setStyleSheet("color: #e74c3c; font-size: 12px;")
            QMessageBox.critical(self, "转换失败", message)

    def apply_style(self):
        """应用样式"""
        style = """
            QDialog {
                background-color: #f5f7fa;
            }
            QGroupBox {
                border: 1px solid #dcdfe6;
                border-radius: 8px;
                margin-top: 12px;
                padding-top: 12px;
                font-weight: bold;
                color: #333;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 12px;
                padding: 0 5px;
                color: #FF69B4;
            }
            QComboBox {
                border: 1px solid #dcdfe6;
                border-radius: 5px;
                padding: 8px;
                background: white;
            }
            QComboBox:focus {
                border: 1px solid #FF69B4;
            }
            QComboBox QAbstractItemView {
                background: white;
                selection-background-color: #FF69B4;
                selection-color: white;
                outline: none;
            }
            QPushButton {
                background-color: #FF69B4;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 8px 16px;
            }
            QPushButton:hover {
                background-color: #FF85C1;
            }
            QPushButton:pressed {
                background-color: #E65A9E;
            }
            QPushButton:disabled {
                background-color: #FFB3D9;
            }
            QListWidget {
                border: 1px solid #dcdfe6;
                border-radius: 5px;
                background: white;
                padding: 5px;
            }
            QListWidget::item {
                padding: 3px;
            }
            QListWidget::item:hover {
                background: #fff5f8;
            }
            QProgressBar {
                border: none;
                border-radius: 5px;
                background: #ebeef5;
                text-align: center;
                height: 12px;
            }
            QProgressBar::chunk {
                border-radius: 5px;
                background: #FF69B4;
            }
        """
        self.setStyleSheet(style)
