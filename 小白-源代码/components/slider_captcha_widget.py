"""
滑块拼图验证组件
机制：显示带缺口的背景图 + 可拖动的拼图块，拖动到正确位置误差 <= 8px 判定成功
发出信号: slider_passed() / slider_failed(str)
"""

import random
import math
from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLabel, QSlider, QPushButton)
from PyQt5.QtCore import Qt, QPoint, QRect, pyqtSignal
from PyQt5.QtGui import QPainter, QColor, QPen, QPixmap, QBrush, QFont, QLinearGradient


class SliderCaptchaWidget(QWidget):
    """滑块拼图验证组件"""

    slider_passed = pyqtSignal()
    slider_failed = pyqtSignal(str)

    PIECE_SIZE = 50
    BG_WIDTH = 280
    BG_HEIGHT = 150
    TOLERANCE = 8

    def __init__(self, parent=None):
        super().__init__(parent)
        self._passed = False
        self._target_x = random.randint(80, 220)
        self._target_y = random.randint(20, 80)
        self._bg_pixmap = QPixmap(self.BG_WIDTH, self.BG_HEIGHT)
        self._piece_pixmap = QPixmap(self.PIECE_SIZE, self.PIECE_SIZE)
        self._generate_background_and_piece()
        self._init_ui()

    # ================= UI 初始化 =================

    def _init_ui(self):
        """初始化 UI 布局"""
        self.setFixedWidth(self.BG_WIDTH + 40)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)

        # 提示文字
        self.hint_label = QLabel("← 拖动左侧拼图块到缺口位置完成验证 →")
        self.hint_label.setAlignment(Qt.AlignCenter)
        self.hint_label.setStyleSheet("font-size: 12px; color: #666;")
        layout.addWidget(self.hint_label)

        # 背景容器
        self.bg_container = QWidget()
        self.bg_container.setFixedSize(self.BG_WIDTH + 20, self.BG_HEIGHT + self.PIECE_SIZE + 20)
        self.bg_container.setStyleSheet("background: transparent;")
        layout.addWidget(self.bg_container, alignment=Qt.AlignCenter)

        # 拼图块标签（随滑块移动）
        self.piece_label = QLabel(self.bg_container)
        self.piece_label.setPixmap(self._piece_pixmap)
        self.piece_label.setAttribute(Qt.WA_TranslucentBackground)
        self.piece_label.setGeometry(10, self.BG_HEIGHT + 15, self.PIECE_SIZE, self.PIECE_SIZE)
        self.piece_label.setStyleSheet("background: transparent;")

        # 背景标签
        self.bg_label = QLabel(self.bg_container)
        self.bg_label.setPixmap(self._bg_pixmap)
        self.bg_label.setGeometry(10, 10, self.BG_WIDTH, self.BG_HEIGHT)
        self.bg_label.setStyleSheet("background: transparent; border: 1px solid #FFB6C1; border-radius: 8px;")

        # 滑块控制条
        slider_box = QWidget()
        slider_box.setStyleSheet("background: #FFF0F5; border-radius: 20px; padding: 4px;")
        slider_layout = QHBoxLayout(slider_box)
        slider_layout.setContentsMargins(8, 0, 8, 0)

        self.slider = QSlider(Qt.Horizontal)
        self.slider.setMinimum(0)
        self.slider.setMaximum(self.BG_WIDTH - self.PIECE_SIZE)
        self.slider.setValue(0)
        self.slider.setStyleSheet("""
            QSlider::groove:horizontal {
                height: 8px; background: #FFE4E1; border-radius: 4px;
            }
            QSlider::handle:horizontal {
                width: 36px; margin: -8px 0;
                border-radius: 18px;
                background: qlineargradient(x1:0,y1:0,x2:1,y2:1,
                    stop:0 #FF69B4, stop:1 #FF1493);
            }
        """)
        self.slider.valueChanged.connect(self._on_slider_move)
        self.slider.sliderReleased.connect(self._on_slider_release)
        slider_layout.addWidget(self.slider)

        layout.addWidget(slider_box)

        # 刷新按钮
        refresh_box = QHBoxLayout()
        self.refresh_btn = QPushButton("🔄 换一张")
        self.refresh_btn.setCursor(Qt.PointingHandCursor)
        self.refresh_btn.setStyleSheet("""
            QPushButton {
                padding: 6px 14px; border: 1px solid #FFB6C1;
                color: #FF69B4; border-radius: 14px; background: #FFF;
            }
            QPushButton:hover { background: #FFF0F5; }
        """)
        self.refresh_btn.clicked.connect(self.reset)
        refresh_box.addStretch()
        refresh_box.addWidget(self.refresh_btn)
        refresh_box.addStretch()
        layout.addLayout(refresh_box)

    # ================= 背景与拼图生成 =================

    def _generate_background_and_piece(self):
        """用 QPainter 生成带缺口的彩色噪点背景和拼图块"""
        # 绘制背景（渐变色 + 随机形状装饰）
        painter_bg = QPainter(self._bg_pixmap)
        painter_bg.setRenderHint(QPainter.Antialiasing)
        gradient = QLinearGradient(0, 0, self.BG_WIDTH, self.BG_HEIGHT)
        hue = random.randint(0, 359)
        gradient.setColorAt(0, QColor.fromHsl(hue, 220, 220))
        gradient.setColorAt(1, QColor.fromHsl((hue + 60) % 360, 200, 240))
        painter_bg.fillRect(0, 0, self.BG_WIDTH, self.BG_HEIGHT, QBrush(gradient))

        # 随机装饰
        for _ in range(12):
            painter_bg.setPen(QPen(QColor.fromHsl(random.randint(0, 360), 180, 200, 120), 2))
            if random.choice([True, False]):
                painter_bg.drawEllipse(
                    random.randint(0, self.BG_WIDTH),
                    random.randint(0, self.BG_HEIGHT),
                    random.randint(10, 40),
                    random.randint(10, 40)
                )
            else:
                painter_bg.drawLine(
                    random.randint(0, self.BG_WIDTH),
                    random.randint(0, self.BG_HEIGHT),
                    random.randint(0, self.BG_WIDTH),
                    random.randint(0, self.BG_HEIGHT),
                )
        # 水印
        painter_bg.setPen(QColor(255, 255, 255, 160))
        painter_bg.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        painter_bg.drawText(QRect(0, 10, self.BG_WIDTH - 8, 20), Qt.AlignRight, "小白 · 安全验证")

        # 挖缺口（画白色方块，模拟遮罩）
        tx, ty = self._target_x, self._target_y
        gap_rect = QRect(tx, ty, self.PIECE_SIZE, self.PIECE_SIZE)
        painter_bg.fillRect(gap_rect, QColor(0, 0, 0, 70))
        painter_bg.setPen(QPen(QColor(255, 105, 180), 2))
        painter_bg.drawRect(gap_rect)
        painter_bg.end()

        # 绘制拼图块（复制背景对应区域 + 边框）
        self._piece_pixmap.fill(Qt.transparent)
        painter_piece = QPainter(self._piece_pixmap)
        painter_piece.setRenderHint(QPainter.Antialiasing)
        # 从背景中截取对应区域
        source_rect = QRect(tx, ty, self.PIECE_SIZE, self.PIECE_SIZE)
        painter_piece.drawPixmap(0, 0, self._bg_pixmap.copy(source_rect))
        # 重新绘制缺口的深色（避免取到空背景）
        painter_piece.fillRect(0, 0, self.PIECE_SIZE, self.PIECE_SIZE, QColor(0, 0, 0, 30))
        painter_piece.setPen(QPen(QColor(255, 105, 180), 2))
        painter_piece.drawRect(0, 0, self.PIECE_SIZE - 1, self.PIECE_SIZE - 1)
        painter_piece.end()

    # ================= 交互事件 =================

    def _on_slider_move(self, value: int):
        """拖动滑块：移动拼图块位置"""
        new_x = 10 + value
        self.piece_label.move(new_x, self.piece_label.y())

    def _on_slider_release(self):
        """松开滑块：验证结果"""
        if self._passed:
            return
        value = self.slider.value()
        actual_x = 10 + value
        expected_x = 10 + self._target_x
        diff = abs(actual_x - expected_x)
        if diff <= self.TOLERANCE:
            # 成功：拼图块贴到缺口位置
            self.piece_label.move(expected_x, 10 + self._target_y)
            self._passed = True
            self.hint_label.setText("✅ 验证通过，您是真人！")
            self.hint_label.setStyleSheet("font-size: 13px; color: #10B981; font-weight: bold;")
            self.slider.setEnabled(False)
            self.slider_passed.emit()
        else:
            msg = f"❌ 位置偏差 {diff} 像素，请重试"
            self.hint_label.setText(msg)
            self.hint_label.setStyleSheet("font-size: 12px; color: #EF4444;")
            self.slider_failed.emit(msg)
            # 1秒后复位
            from PyQt5.QtCore import QTimer
            QTimer.singleShot(800, lambda: self.slider.setValue(0))

    def is_passed(self) -> bool:
        """外部判断是否已通过"""
        return self._passed

    def reset(self):
        """重置：重新生成新的背景 + 缺口位置"""
        self._passed = False
        self._target_x = random.randint(80, 220)
        self._target_y = random.randint(20, 80)
        self._generate_background_and_piece()
        self.bg_label.setPixmap(self._bg_pixmap)
        self.piece_label.setPixmap(self._piece_pixmap)
        self.slider.setValue(0)
        self.slider.setEnabled(True)
        self.hint_label.setText("← 拖动左侧拼图块到缺口位置完成验证 →")
        self.hint_label.setStyleSheet("font-size: 12px; color: #666;")
