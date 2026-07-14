"""
《羊了个羊》游戏 - 优化版
经典的叠卡牌消除游戏，使用不同的表情卡片堆叠重叠
有四个技能：洗牌、移除、复活、撤回

两种模式：
1. 闯关模式：300-600张卡片，多关卡挑战
2. 无尽模式：无限张牌，挑战最高纪录
"""

import random
from PyQt5.QtWidgets import (
    QDialog, QLabel, QVBoxLayout, QHBoxLayout,
    QPushButton, QMessageBox, QWidget, QFrame,
    QScrollArea, QComboBox, QSpinBox, QProgressBar
)
from PyQt5.QtCore import Qt, QPoint, QRect, QTimer
from PyQt5.QtGui import QFont, QPainter, QColor, QBrush, QPen


# 卡片表情库（大量表情以支持300+张牌）
EMOJI_TYPES = [
    '🐑', '🐺', '🦊', '🐰', '🐔', '🦁', '🐯', '🐮',
    '🐷', '🐸', '🐵', '🦆', '🦉', '🐧', '🐢', '🐛',
    '🦋', '🐝', '🐞', '🐙', '🦀', '🐠', '🐬', '🐳',
    '🦓', '🦒', '🦘', '🐘', '🦏', '🦛', '🐪', '🐫',
    '🐅', '🐆', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏',
    '🐐', '🐀', '🐁', '🐿️', '🦔', '🐻', '🐼', '🦝',
    '🐨', '🐩', '🐕', '🐈', '🐇', '🐉', '🦄', '🐲',
    '🌵', '🌴', '🌲', '🌳', '🌺', '🌻', '🌼', '🌷',
    '🍎', '🍊', '🍋', '🍌', '🍇', '🍓', '🍑', '🍒',
    '⭐', '🌙', '☀️', '⚡', '❄️', '🔥', '💧', '🌈',
]

TOTAL_EMOJI_TYPES = len(EMOJI_TYPES)

# 闯关模式配置 - 每关卡片数均为3的倍数
LEVEL_CONFIGS = [
    {'cards_total': 300, 'layers': 8,  'emoji_count': 20, 'name': '第1关'},
    {'cards_total': 360, 'layers': 10, 'emoji_count': 25, 'name': '第2关'},
    {'cards_total': 420, 'layers': 12, 'emoji_count': 30, 'name': '第3关'},
    {'cards_total': 480, 'layers': 14, 'emoji_count': 35, 'name': '第4关'},
    {'cards_total': 540, 'layers': 16, 'emoji_count': 40, 'name': '第5关'},
    {'cards_total': 600, 'layers': 18, 'emoji_count': 50, 'name': '第6关'},
]

# 卡槽容量
SLOT_CAPACITY = 7

# 卡片尺寸
CARD_WIDTH = 48
CARD_HEIGHT = 48


class Card:
    """卡片类 - 表示一张可消除的表情卡片"""

    def __init__(self, emoji, x, y, width, height, layer=0, card_id=0):
        """初始化卡片
        
        Args:
            emoji: 表情符号
            x: 卡片x坐标
            y: 卡片y坐标
            width: 卡片宽度
            height: 卡片高度
            layer: 卡片所在的层（越大越靠前）
            card_id: 卡片唯一标识
        """
        self.emoji = emoji
        self.rect = QRect(x, y, width, height)
        self.layer = layer
        self.card_id = card_id
        self.state = 'on_board'  # on_board, in_slot, removed

    def contains(self, point):
        """检查点是否在卡片内"""
        return self.rect.contains(point)

    def draw(self, painter, dimmed=False):
        """绘制卡片
        
        Args:
            painter: QPainter对象
            dimmed: 是否暗显（被遮盖状态）
        """
        if self.state == 'removed':
            return

        # 阴影
        for i in range(1, 3):
            painter.fillRect(self.rect.adjusted(i, i, i, i), QColor(0, 0, 0, 25))

        # 背景颜色（根据层数）
        hue = (self.layer * 15) % 360
        base_color = QColor.fromHsv(hue, 40, 255)
        if dimmed:
            base_color = base_color.darker(150)

        painter.setBrush(QBrush(base_color))
        border_color = QColor(180, 180, 180) if not dimmed else QColor(120, 120, 120)
        painter.setPen(QPen(border_color, 2))
        painter.drawRoundedRect(self.rect, 6, 6)

        # 表情
        font = QFont('Segoe UI Emoji', int(self.rect.height() * 0.55))
        painter.setFont(font)
        text_color = QColor(60, 60, 60) if not dimmed else QColor(120, 120, 120)
        painter.setPen(text_color)
        painter.drawText(self.rect, Qt.AlignCenter, self.emoji)


class ModeSelectDialog(QDialog):
    """模式选择对话框"""

    def __init__(self, parent=None):
        """初始化模式选择对话框"""
        super(ModeSelectDialog, self).__init__(parent)
        self.setWindowTitle("🐑 羊了个羊 - 选择模式")
        self.setFixedSize(500, 400)
        self.setStyleSheet("background-color: #FFF5F8;")

        self.selected_mode = None
        self.selected_level = 0
        self.init_ui()

    def init_ui(self):
        """初始化界面"""
        layout = QVBoxLayout()
        layout.setSpacing(20)
        layout.setContentsMargins(40, 30, 40, 30)

        # 标题
        title = QLabel("🐑 羊了个羊")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet(
            "color: #FF1493; font-size: 32px; font-weight: bold;"
        )
        layout.addWidget(title)

        subtitle = QLabel("选择游戏模式开始挑战！")
        subtitle.setAlignment(Qt.AlignCenter)
        subtitle.setStyleSheet("color: #FF69B4; font-size: 14px;")
        layout.addWidget(subtitle)

        # 闯关模式按钮
        self.level_btn = QPushButton("🏆 闯关模式\n(300~600张卡牌 · 6个关卡)")
        self.level_btn.setMinimumHeight(80)
        self.level_btn.setStyleSheet(self._get_button_style('#FF69B4', '#FF1493'))
        self.level_btn.clicked.connect(self._on_level_mode)
        layout.addWidget(self.level_btn)

        # 无尽模式按钮
        self.endless_btn = QPushButton("♾️ 无尽模式\n(无限张牌 · 挑战最高纪录)")
        self.endless_btn.setMinimumHeight(80)
        self.endless_btn.setStyleSheet(self._get_button_style('#8B5CF6', '#7C3AED'))
        self.endless_btn.clicked.connect(self._on_endless_mode)
        layout.addWidget(self.endless_btn)

        # 关卡选择（默认隐藏，选择闯关模式后显示）
        self.level_select_widget = QWidget()
        level_layout = QHBoxLayout(self.level_select_widget)
        level_layout.setContentsMargins(0, 0, 0, 0)

        level_label = QLabel("选择关卡:")
        level_label.setStyleSheet("color: #FF69B4; font-weight: bold;")
        level_layout.addWidget(level_label)

        self.level_combo = QComboBox()
        for i, cfg in enumerate(LEVEL_CONFIGS):
            self.level_combo.addItem(
                f"{cfg['name']} - {cfg['cards_total']}张牌 ({cfg['layers']}层)",
                i
            )
        self.level_combo.setMinimumHeight(35)
        level_layout.addWidget(self.level_combo, 1)

        self.start_btn = QPushButton("开始游戏")
        self.start_btn.setMinimumHeight(35)
        self.start_btn.setMinimumWidth(100)
        self.start_btn.setStyleSheet(self._get_button_style('#FF69B4', '#FF1493'))
        self.start_btn.clicked.connect(self._on_start_level)
        level_layout.addWidget(self.start_btn)

        self.level_select_widget.setVisible(False)
        layout.addWidget(self.level_select_widget)

        layout.addStretch()

        # 说明
        tip = QLabel("💡 提示：点击牌桌上的卡片放入卡槽，集齐3张相同表情自动消除！")
        tip.setAlignment(Qt.AlignCenter)
        tip.setWordWrap(True)
        tip.setStyleSheet("color: #999; font-size: 11px;")
        layout.addWidget(tip)

        self.setLayout(layout)

    def _get_button_style(self, color1, color2):
        """获取按钮样式"""
        return f"""
            QPushButton {{
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 {color1}, stop:1 {color2});
                color: white;
                border: none;
                border-radius: 15px;
                font-size: 18px;
                font-weight: bold;
                padding: 15px;
            }}
            QPushButton:hover {{
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 {color1}DD, stop:1 {color2}DD);
            }}
            QPushButton:pressed {{
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 {color1}AA, stop:1 {color2}AA);
            }}
        """

    def _on_level_mode(self):
        """选择闯关模式"""
        self.selected_mode = 'level'
        self.level_select_widget.setVisible(True)
        self.level_btn.setStyleSheet(self._get_button_style('#FF69B4', '#FF1493'))

    def _on_endless_mode(self):
        """选择无尽模式"""
        self.selected_mode = 'endless'
        self.selected_level = 0
        self.accept()

    def _on_start_level(self):
        """开始闯关模式"""
        self.selected_level = self.level_combo.currentData()
        self.selected_mode = 'level'
        self.accept()


class SheepGame(QDialog):
    """羊了个羊游戏主类"""

    CARD_WIDTH = 48
    CARD_HEIGHT = 48
    SLOT_CAPACITY = 7

    def __init__(self, parent=None, level=0, mode='level'):
        """初始化游戏
        
        Args:
            parent: 父窗口
            level: 关卡索引（闯关模式）
            mode: 'level' 或 'endless'
        """
        super(SheepGame, self).__init__(parent)
        self.mode = mode
        self.level = level

        # 卡片相关
        self.cards = []
        self.board_cards = []
        self.slot_cards = []
        self.undo_stack = []
        self.game_over = False
        self.game_won = False

        # 统计
        self.removed_count = 0
        self.total_cards = 0

        # 技能次数
        self.skill_shuffle = 3
        self.skill_remove = 3
        self.skill_revoke = 1
        self.skill_undo = 3
        self.used_revoke = False

        # 无尽模式补充牌
        self.endless_spawned = 0

        self.setWindowTitle(f"🐑 羊了个羊 - {'无尽模式' if mode == 'endless' else LEVEL_CONFIGS[level]['name']}")
        self.setStyleSheet("background-color: #FFF5F8;")
        self.setWindowModality(Qt.NonModal)
        self.setMinimumSize(1000, 750)

        self.init_ui()
        self.start_game()

    def init_ui(self):
        """初始化UI"""
        main_layout = QVBoxLayout()
        main_layout.setSpacing(8)
        main_layout.setContentsMargins(10, 8, 10, 8)

        # 顶部信息栏
        info_layout = QHBoxLayout()

        if self.mode == 'endless':
            level_text = "♾️ 无尽模式"
        else:
            level_text = f"🏆 {LEVEL_CONFIGS[self.level]['name']}"

        level_label = QLabel(level_text)
        level_label.setStyleSheet(
            "color: #FF1493; font-size: 18px; font-weight: bold; padding: 5px;"
        )
        info_layout.addWidget(level_label)

        info_layout.addStretch()

        # 进度/统计
        self.board_count_label = QLabel("牌桌: 0")
        self.board_count_label.setStyleSheet(
            "color: #FF69B4; font-size: 12px; font-weight: bold;"
        )
        info_layout.addWidget(self.board_count_label)

        info_layout.addSpacing(15)

        self.slot_count_label = QLabel(f"卡槽: 0/{self.SLOT_CAPACITY}")
        self.slot_count_label.setStyleSheet(
            "color: #FF69B4; font-size: 12px; font-weight: bold;"
        )
        info_layout.addWidget(self.slot_count_label)

        info_layout.addSpacing(15)

        self.removed_label = QLabel("已消除: 0")
        self.removed_label.setStyleSheet(
            "color: #FF69B4; font-size: 12px; font-weight: bold;"
        )
        info_layout.addWidget(self.removed_label)

        if self.mode == 'level':
            info_layout.addSpacing(15)
            self.progress_bar = QProgressBar()
            self.progress_bar.setFixedWidth(150)
            self.progress_bar.setStyleSheet("""
                QProgressBar {
                    border: 2px solid #FFB6C1;
                    border-radius: 5px;
                    text-align: center;
                    height: 15px;
                    font-size: 10px;
                    color: white;
                }
                QProgressBar::chunk {
                    background-color: #FF69B4;
                    border-radius: 3px;
                }
            """)
            info_layout.addWidget(self.progress_bar)

        main_layout.addLayout(info_layout)

        # 滚动游戏画布
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("border: 2px solid #FFB6C1; border-radius: 8px;")

        self.game_canvas = GameCanvas(self)
        self.game_canvas.setMinimumSize(950, 450)
        self.game_canvas.setStyleSheet("background-color: #FFFAF0;")
        scroll.setWidget(self.game_canvas)
        main_layout.addWidget(scroll, 1)

        # 卡槽区域
        slot_layout = QHBoxLayout()
        slot_label = QLabel("🃏 卡槽:")
        slot_label.setStyleSheet("color: #FF1493; font-size: 13px; font-weight: bold;")
        slot_layout.addWidget(slot_label)

        self.slot_widget = SlotWidget(self)
        self.slot_widget.setMinimumHeight(65)
        self.slot_widget.setStyleSheet(
            "background-color: #FFE4E1; border: 2px dashed #FF69B4; border-radius: 8px;"
        )
        slot_layout.addWidget(self.slot_widget, 1)

        main_layout.addLayout(slot_layout)

        # 技能栏
        skill_layout = QHBoxLayout()
        skill_label = QLabel("🎯 技能:")
        skill_label.setStyleSheet("color: #FF1493; font-size: 13px; font-weight: bold;")
        skill_layout.addWidget(skill_label)

        # 洗牌
        self.shuffle_btn = QPushButton(f"🔀 洗牌 ({self.skill_shuffle})")
        self.shuffle_btn.setStyleSheet(self._get_skill_style('#3498DB'))
        self.shuffle_btn.setMinimumHeight(36)
        self.shuffle_btn.clicked.connect(self.use_shuffle)
        skill_layout.addWidget(self.shuffle_btn)

        # 移除
        self.remove_btn = QPushButton(f"🗑️ 移除 ({self.skill_remove})")
        self.remove_btn.setStyleSheet(self._get_skill_style('#E74C3C'))
        self.remove_btn.setMinimumHeight(36)
        self.remove_btn.clicked.connect(self.use_remove)
        skill_layout.addWidget(self.remove_btn)

        # 复活
        self.revoke_btn = QPushButton(f"♻️ 复活 ({self.skill_revoke})")
        self.revoke_btn.setStyleSheet(self._get_skill_style('#27AE60'))
        self.revoke_btn.setMinimumHeight(36)
        self.revoke_btn.clicked.connect(self.use_revoke)
        skill_layout.addWidget(self.revoke_btn)

        # 撤回
        self.undo_btn = QPushButton(f"↩️ 撤回 ({self.skill_undo})")
        self.undo_btn.setStyleSheet(self._get_skill_style('#F39C12'))
        self.undo_btn.setMinimumHeight(36)
        self.undo_btn.clicked.connect(self.use_undo)
        skill_layout.addWidget(self.undo_btn)

        skill_layout.addStretch()

        # 重新开始
        self.restart_btn = QPushButton("🔄 重新开始")
        self.restart_btn.setStyleSheet(self._get_skill_style('#9B59B6'))
        self.restart_btn.setMinimumHeight(36)
        self.restart_btn.clicked.connect(self.restart_game)
        skill_layout.addWidget(self.restart_btn)

        # 切换模式
        self.mode_btn = QPushButton("🎮 切换模式")
        self.mode_btn.setStyleSheet(self._get_skill_style('#1ABC9C'))
        self.mode_btn.setMinimumHeight(36)
        self.mode_btn.clicked.connect(self.switch_mode)
        skill_layout.addWidget(self.mode_btn)

        main_layout.addLayout(skill_layout)

        self.setLayout(main_layout)

    def _get_skill_style(self, color):
        """获取技能按钮样式"""
        return f"""
            QPushButton {{
                background-color: {color};
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 5px;
                font-size: 12px;
                font-weight: bold;
            }}
            QPushButton:hover {{
                background-color: {color}DD;
            }}
            QPushButton:pressed {{
                background-color: {color}AA;
            }}
            QPushButton:disabled {{
                background-color: #CCCCCC;
                color: #666666;
            }}
        """

    def start_game(self):
        """开始新游戏"""
        self.cards.clear()
        self.board_cards.clear()
        self.slot_cards.clear()
        self.undo_stack.clear()
        self.game_over = False
        self.game_won = False
        self.used_revoke = False
        self.removed_count = 0
        self.endless_spawned = 0

        # 重置技能
        self.skill_shuffle = 3
        self.skill_remove = 3
        self.skill_revoke = 1
        self.skill_undo = 3

        self._generate_board()
        self._update_ui()
        self.game_canvas.update()
        self.slot_widget.update()

    def restart_game(self):
        """重新开始"""
        reply = QMessageBox.question(
            self, "确认", "确定要重新开始吗？\n当前进度将丢失！",
            QMessageBox.Yes | QMessageBox.No, QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            self.start_game()

    def switch_mode(self):
        """切换模式"""
        reply = QMessageBox.question(
            self, "切换模式", "确定要切换游戏模式吗？\n当前进度将丢失！",
            QMessageBox.Yes | QMessageBox.No, QMessageBox.No
        )
        if reply == QMessageBox.Yes:
            self.close()

    def _generate_board(self):
        """生成牌桌"""
        if self.mode == 'level':
            self._generate_level_board()
        else:
            self._generate_endless_board()

    def _generate_level_board(self):
        """生成闯关模式牌桌"""
        cfg = LEVEL_CONFIGS[self.level]
        total_cards = cfg['cards_total']
        layers = cfg['layers']
        emoji_count = min(cfg['emoji_count'], TOTAL_EMOJI_TYPES)

        # 计算每种表情的张数（必须是3的倍数）
        cards_per_type = total_cards // emoji_count
        # 确保是3的倍数
        cards_per_type = (cards_per_type // 3) * 3
        if cards_per_type < 3:
            cards_per_type = 3

        # 生成所有表情
        all_emojis = []
        used_emojis = EMOJI_TYPES[:emoji_count]
        for emoji in used_emojis:
            for _ in range(cards_per_type):
                all_emojis.append(emoji)

        # 调整到正好 total_cards 张（必须是3的倍数）
        while len(all_emojis) < total_cards:
            all_emojis.append(random.choice(used_emojis))
            all_emojis.append(random.choice(used_emojis))
            all_emojis.append(random.choice(used_emojis))
        while len(all_emojis) > total_cards:
            all_emojis.pop()
            all_emojis.pop()
            all_emojis.pop()

        random.shuffle(all_emojis)
        self.total_cards = len(all_emojis)

        # 生成各层的卡片
        self._place_cards(all_emojis, layers)

    def _generate_endless_board(self):
        """生成无尽模式初始牌桌（先放300张，后续动态补充）"""
        initial_count = 300
        layers = 10
        emoji_count = 30

        used_emojis = EMOJI_TYPES[:emoji_count]
        all_emojis = []
        for _ in range(initial_count):
            all_emojis.append(random.choice(used_emojis))

        # 确保是3的倍数
        while len(all_emojis) % 3 != 0:
            all_emojis.append(random.choice(used_emojis))

        random.shuffle(all_emojis)
        self.total_cards = len(all_emojis)
        self.endless_spawned = self.total_cards

        self._place_cards(all_emojis, layers)

    def _place_cards(self, all_emojis, layers):
        """将卡片放置到画布上
        
        Args:
            all_emojis: 表情列表
            layers: 层数
        """
        card_id = 0
        canvas_width = 920
        canvas_height = max(200, layers * 45 + 200)
        self.game_canvas.setMinimumSize(canvas_width, canvas_height)

        cards_per_layer = max(10, len(all_emojis) // layers)

        idx = 0
        for layer in range(layers):
            offset_x = layer * 8
            offset_y = layer * 6

            # 计算本层卡片数量
            layer_count = min(cards_per_layer, len(all_emojis) - idx)
            if layer == layers - 1:
                layer_count = len(all_emojis) - idx

            positions = self._generate_layer_positions(
                layer_count, canvas_width, canvas_height,
                self.CARD_WIDTH, self.CARD_HEIGHT,
                offset_x, offset_y, layer
            )

            for pos in positions:
                if idx >= len(all_emojis):
                    break
                card = Card(
                    emoji=all_emojis[idx],
                    x=pos[0],
                    y=pos[1],
                    width=self.CARD_WIDTH,
                    height=self.CARD_HEIGHT,
                    layer=layer,
                    card_id=card_id
                )
                card.state = 'on_board'
                self.cards.append(card)
                self.board_cards.append(card)
                card_id += 1
                idx += 1

    def _generate_layer_positions(self, count, canvas_w, canvas_h, card_w, card_h,
                                   offset_x, offset_y, layer):
        """生成某一层的随机位置
        
        Args:
            count: 卡片数量
            canvas_w: 画布宽度
            canvas_h: 画布高度
            card_w: 卡片宽度
            card_h: 卡片高度
            offset_x: X偏移
            offset_y: Y偏移
            layer: 层级
        """
        positions = []
        max_attempts = 300

        area_padding = 10 + offset_x
        usable_w = canvas_w - card_w - 2 * area_padding
        usable_h = canvas_h - card_h - 2 * area_padding - offset_y

        for _ in range(count):
            placed = False
            for _ in range(max_attempts):
                x = random.randint(area_padding, area_padding + usable_w)
                y = random.randint(area_padding + offset_y, area_padding + offset_y + usable_h)
                new_rect = QRect(x, y, card_w, card_h)

                # 允许适度重叠（增加堆叠感）
                overlap_ok = True
                overlap_count = 0
                for (px, py) in positions:
                    existing = QRect(px, py, card_w, card_h)
                    inter = existing.intersected(new_rect)
                    if not inter.isEmpty():
                        inter_area = inter.width() * inter.height()
                        min_area = min(card_w * card_h, card_w * card_h)
                        if min_area > 0 and inter_area / min_area > 0.6:
                            overlap_ok = False
                            break
                        overlap_count += 1

                if overlap_ok:
                    positions.append((x, y))
                    placed = True
                    break

            if not placed:
                # 找不到合适位置就随便放
                x = random.randint(area_padding, area_padding + usable_w)
                y = random.randint(area_padding + offset_y, area_padding + offset_y + usable_h)
                positions.append((x, y))

        return positions

    def on_canvas_click(self, point):
        """画布点击事件"""
        if self.game_over or self.game_won:
            return

        clicked_card = self._find_top_card_at(point)
        if clicked_card is None:
            return

        if len(self.slot_cards) >= self.SLOT_CAPACITY:
            self._check_game_over()
            return

        # 记录撤回
        self.undo_stack.append({
            'type': 'move',
            'card': clicked_card,
            'slot_index': len(self.slot_cards)
        })

        # 从牌桌移到卡槽
        clicked_card.state = 'in_slot'
        if clicked_card in self.board_cards:
            self.board_cards.remove(clicked_card)
        self.slot_cards.append(clicked_card)

        self._update_ui()
        self.game_canvas.update()
        self.slot_widget.update()

        QTimer.singleShot(100, self._check_and_remove)

    def _find_top_card_at(self, point):
        """查找点击位置最上层的可点击卡片"""
        candidates = []
        for card in self.cards:
            if card.state == 'on_board' and card.contains(point):
                candidates.append(card)

        if not candidates:
            return None

        # 过滤掉被更高层遮盖超过60%的
        clickable = []
        for card in candidates:
            blocked = False
            for other in self.cards:
                if other.state == 'on_board' and other.layer > card.layer:
                    inter = other.rect.intersected(card.rect)
                    if not inter.isEmpty():
                        inter_area = inter.width() * inter.height()
                        card_area = card.rect.width() * card.rect.height()
                        if card_area > 0 and inter_area / card_area > 0.01:
                            blocked = True
                            break
            if not blocked:
                clickable.append(card)

        if not clickable:
            return None

        return max(clickable, key=lambda c: c.layer)

    def _check_and_remove(self):
        """检查卡槽中是否有3张相同表情的卡片并消除"""
        if self.game_over or self.game_won:
            return

        emoji_count = {}
        for card in self.slot_cards:
            emoji_count[card.emoji] = emoji_count.get(card.emoji, 0) + 1

        removable = [e for e, c in emoji_count.items() if c >= 3]
        if not removable:
            self._check_game_over()
            return

        for emoji in removable:
            removed = 0
            new_slot = []
            for card in self.slot_cards:
                if card.emoji == emoji and removed < 3:
                    card.state = 'removed'
                    removed += 1
                    self.removed_count += 1
                else:
                    new_slot.append(card)
            self.slot_cards = new_slot

        self.undo_stack.append({
            'type': 'remove',
            'emojis': removable,
            'count': 3 * len(removable)
        })

        self._update_ui()
        self.slot_widget.update()

        # 无尽模式：补充新牌
        if self.mode == 'endless':
            self._maybe_spawn_more()

        QTimer.singleShot(300, self._check_win)

    def _maybe_spawn_more(self):
        """无尽模式：牌桌少时补充新牌"""
        if len(self.board_cards) < 100:
            # 补充60张
            self._spawn_more_cards(60)

    def _spawn_more_cards(self, count):
        """补充更多卡片（无尽模式）"""
        # 确保是3的倍数
        while count % 3 != 0:
            count += 1

        used_emojis = EMOJI_TYPES[:30]
        new_emojis = [random.choice(used_emojis) for _ in range(count)]

        # 找一个较高的层放置
        max_layer = max([c.layer for c in self.board_cards]) if self.board_cards else 5
        new_layer = max_layer + 1

        canvas_w = self.game_canvas.minimumWidth()
        canvas_h = self.game_canvas.minimumHeight()
        positions = self._generate_layer_positions(
            count, canvas_w, canvas_h,
            self.CARD_WIDTH, self.CARD_HEIGHT,
            new_layer * 8, new_layer * 6, new_layer
        )

        start_id = len(self.cards)
        for i, pos in enumerate(positions):
            card = Card(
                emoji=new_emojis[i],
                x=pos[0],
                y=pos[1],
                width=self.CARD_WIDTH,
                height=self.CARD_HEIGHT,
                layer=new_layer,
                card_id=start_id + i
            )
            card.state = 'on_board'
            self.cards.append(card)
            self.board_cards.append(card)

        self.total_cards += count
        self.endless_spawned += count

        # 调整画布高度
        new_h = max(canvas_h, (new_layer + 3) * 45 + 200)
        self.game_canvas.setMinimumHeight(new_h)

    def _check_game_over(self):
        """检查游戏是否失败"""
        if self.game_won or self.game_over:
            return

        if len(self.slot_cards) >= self.SLOT_CAPACITY:
            emoji_count = {}
            for card in self.slot_cards:
                emoji_count[card.emoji] = emoji_count.get(card.emoji, 0) + 1
            if not any(c >= 3 for c in emoji_count.values()):
                self.game_over = True
                self._show_game_over_dialog()

    def _check_win(self):
        """检查游戏是否胜利"""
        if self.mode == 'level':
            if not self.board_cards and not self.slot_cards:
                self.game_won = True
                self._show_win_dialog()
        else:
            # 无尽模式没有胜利，继续挑战
            if not self.board_cards and len(self.slot_cards) < 3:
                # 牌桌清空了，自动补充
                self._spawn_more_cards(120)

    def _show_game_over_dialog(self):
        """显示游戏失败对话框"""
        if self.mode == 'endless':
            msg = (
                f"😢 游戏结束！\n\n"
                f"📊 本局统计：\n"
                f"   总牌数：{self.endless_spawned} 张\n"
                f"   已消除：{self.removed_count} 张\n"
                f"   剩余牌桌：{len(self.board_cards)} 张\n\n"
                f"再来一局挑战更高纪录？"
            )
        else:
            msg = (
                f"😢 游戏失败！\n\n"
                f"进度：{self.removed_count}/{self.total_cards}\n\n"
                f"是否重新开始？"
            )

        reply = QMessageBox.question(
            self, "游戏结束", msg,
            QMessageBox.Yes | QMessageBox.No, QMessageBox.Yes
        )
        if reply == QMessageBox.Yes:
            self.start_game()
        else:
            self.close()

    def _show_win_dialog(self):
        """显示游戏胜利对话框"""
        if self.level < len(LEVEL_CONFIGS) - 1:
            reply = QMessageBox.question(
                self, "🎉 胜利！",
                f"🎉🎉 恭喜通过{LEVEL_CONFIGS[self.level]['name']}！\n\n"
                f"总卡牌数：{self.total_cards} 张\n"
                f"已消除：{self.removed_count} 张\n\n"
                f"是否挑战下一关？",
                QMessageBox.Yes | QMessageBox.No, QMessageBox.Yes
            )
            if reply == QMessageBox.Yes:
                self.level += 1
                self.setWindowTitle(f"🐑 羊了个羊 - {LEVEL_CONFIGS[self.level]['name']}")
                self.start_game()
            else:
                self.close()
        else:
            QMessageBox.information(
                self, "🏆 通关！",
                f"🏆🏆🏆 恭喜你通关全部关卡！\n\n"
                f"总卡牌数：{self.total_cards} 张\n"
                f"你太厉害了！"
            )
            self.close()

    def _update_ui(self):
        """更新UI显示"""
        board_count = len(self.board_cards)
        self.board_count_label.setText(f"牌桌: {board_count}")

        slot_count = len(self.slot_cards)
        self.slot_count_label.setText(f"卡槽: {slot_count}/{self.SLOT_CAPACITY}")

        if self.mode == 'endless':
            self.removed_label.setText(f"已消除: {self.removed_count}")
        else:
            self.removed_label.setText(f"已消除: {self.removed_count}/{self.total_cards}")
            if self.total_cards > 0:
                percent = int(self.removed_count * 100 / self.total_cards)
                self.progress_bar.setValue(percent)

        self.shuffle_btn.setText(f"🔀 洗牌 ({self.skill_shuffle})")
        self.remove_btn.setText(f"🗑️ 移除 ({self.skill_remove})")
        self.revoke_btn.setText(f"♻️ 复活 ({self.skill_revoke})")
        self.undo_btn.setText(f"↩️ 撤回 ({self.skill_undo})")

        self.shuffle_btn.setEnabled(self.skill_shuffle > 0 and not self.game_over)
        self.remove_btn.setEnabled(self.skill_remove > 0 and not self.game_over)
        self.revoke_btn.setEnabled(self.skill_revoke > 0 and not self.used_revoke)
        self.undo_btn.setEnabled(self.skill_undo > 0 and len(self.undo_stack) > 0)

    def use_shuffle(self):
        """洗牌技能"""
        if self.skill_shuffle <= 0 or self.game_over:
            return

        emojis = [c.emoji for c in self.board_cards]
        if not emojis:
            return

        random.shuffle(emojis)
        for i, card in enumerate(self.board_cards):
            if i < len(emojis):
                card.emoji = emojis[i]

        self.skill_shuffle -= 1
        self.undo_stack.clear()
        self._update_ui()
        self.game_canvas.update()

    def use_remove(self):
        """移除技能 - 移除卡槽中3张相同的"""
        if self.skill_remove <= 0 or self.game_over:
            return

        if not self.slot_cards:
            QMessageBox.information(self, "提示", "卡槽是空的！")
            return

        emoji_count = {}
        for card in self.slot_cards:
            emoji_count[card.emoji] = emoji_count.get(card.emoji, 0) + 1

        target = None
        for e, c in emoji_count.items():
            if c >= 3:
                target = e
                break

        if target is None:
            QMessageBox.information(
                self, "提示",
                "卡槽中没有3张相同的卡片！\n先收集3张相同表情再使用。"
            )
            return

        removed = 0
        new_slot = []
        for card in self.slot_cards:
            if card.emoji == target and removed < 3:
                card.state = 'removed'
                removed += 1
                self.removed_count += 1
            else:
                new_slot.append(card)
        self.slot_cards = new_slot

        self.skill_remove -= 1
        self.undo_stack.clear()
        self._update_ui()
        self.slot_widget.update()
        self._check_win()

    def use_revoke(self):
        """复活技能"""
        if self.skill_revoke <= 0 or self.used_revoke:
            return

        removed_cards = [c for c in self.cards if c.state == 'removed']
        if not removed_cards:
            QMessageBox.information(self, "提示", "没有可复活的卡片！")
            return

        if len(self.slot_cards) >= self.SLOT_CAPACITY:
            QMessageBox.information(self, "提示", "卡槽已满，无法复活！")
            return

        # 复活3张相同表情的
        emoji_count = {}
        for c in removed_cards:
            emoji_count[c.emoji] = emoji_count.get(c.emoji, 0) + 1

        # 找数量>=3的
        target_emoji = None
        for e, c in emoji_count.items():
            if c >= 3:
                target_emoji = e
                break

        if target_emoji is None:
            # 没有3张的，就复活3张不同的
            to_revive = removed_cards[:3]
        else:
            to_revive = [c for c in removed_cards if c.emoji == target_emoji][:3]

        for card in to_revive:
            if len(self.slot_cards) >= self.SLOT_CAPACITY:
                break
            card.state = 'in_slot'
            self.slot_cards.append(card)
            self.removed_count -= 1

        self.skill_revoke -= 1
        self.used_revoke = True
        self.undo_stack.clear()
        self._update_ui()
        self.slot_widget.update()

    def use_undo(self):
        """撤回技能"""
        if self.skill_undo <= 0 or not self.undo_stack:
            return

        last = self.undo_stack.pop()

        if last['type'] == 'move':
            card = last['card']
            if card in self.slot_cards:
                self.slot_cards.remove(card)
            card.state = 'on_board'
            if card not in self.board_cards:
                self.board_cards.append(card)

            self.skill_undo -= 1
            self._update_ui()
            self.game_canvas.update()
            self.slot_widget.update()
        else:
            QMessageBox.information(self, "提示", "消除操作无法撤回（移动操作可撤回）")
            self.undo_stack.append(last)


class GameCanvas(QWidget):
    """游戏画布"""

    def __init__(self, game):
        """初始化画布"""
        super(GameCanvas, self).__init__()
        self.game = game
        self.setMouseTracking(True)

    def mousePressEvent(self, event):
        """鼠标按下事件"""
        if event.button() == Qt.LeftButton:
            self.game.on_canvas_click(event.pos())

    def paintEvent(self, event):
        """绘制事件"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        painter.fillRect(self.rect(), QColor(255, 250, 240))

        # 按层绘制
        sorted_cards = sorted(
            [c for c in self.game.cards if c.state == 'on_board'],
            key=lambda c: c.layer
        )

        for card in sorted_cards:
            # 检查是否被遮盖
            dimmed = False
            for other in self.game.cards:
                if other.state == 'on_board' and other.layer > card.layer:
                    inter = other.rect.intersected(card.rect)
                    if not inter.isEmpty():
                        inter_area = inter.width() * inter.height()
                        card_area = card.rect.width() * card.rect.height()
                        if card_area > 0 and inter_area / card_area > 0.01:
                            dimmed = True
                            break
            card.draw(painter, dimmed)

        # 层数提示
        max_layer = max([c.layer for c in sorted_cards]) if sorted_cards else 0
        painter.setPen(QColor(200, 200, 200, 80))
        painter.setFont(QFont('Arial', 10))
        painter.drawText(self.rect().adjusted(0, 5, -5, 0),
                         Qt.AlignTop | Qt.AlignRight,
                         f"{max_layer + 1}层堆叠")


class SlotWidget(QWidget):
    """卡槽组件"""

    def __init__(self, game):
        super(SlotWidget, self).__init__()
        self.game = game
        self.setMinimumHeight(65)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        painter.fillRect(self.rect(), QColor(255, 228, 225))

        x = 8
        y = 5
        card_size = 52
        spacing = 6

        for i, card in enumerate(self.game.slot_cards):
            rect = QRect(x + i * (card_size + spacing), y, card_size, card_size)

            for j in range(1, 3):
                painter.fillRect(rect.adjusted(j, j, j, j), QColor(0, 0, 0, 25))

            painter.setBrush(QBrush(QColor(255, 230, 240)))
            painter.setPen(QPen(QColor(255, 105, 180), 2))
            painter.drawRoundedRect(rect, 6, 6)

            font = QFont('Segoe UI Emoji', int(card_size * 0.55))
            painter.setFont(font)
            painter.setPen(QColor(60, 60, 60))
            painter.drawText(rect, Qt.AlignCenter, card.emoji)

        for i in range(len(self.game.slot_cards), self.game.SLOT_CAPACITY):
            rect = QRect(x + i * (card_size + spacing), y, card_size, card_size)
            painter.setBrush(QBrush(QColor(255, 255, 255, 50)))
            painter.setPen(QPen(QColor(200, 200, 200), 1, Qt.DashLine))
            painter.drawRoundedRect(rect, 6, 6)
