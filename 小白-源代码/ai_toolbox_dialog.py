"""
AI多功能工具箱 - 小白桌面宠物集成版
基于 public-apis 项目中的免费API开发
包含翻译、天气查询、名言、词典、笑话、文本分析等功能
"""

import sys
import os
from PyQt5.QtWidgets import (
    QDialog, QTabWidget, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QTextEdit, QPushButton, QComboBox, QLineEdit, QMessageBox,
    QProgressBar, QSplitter, QFrame, QScrollArea, QGridLayout, QGroupBox
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QIcon, QPalette, QColor

from ai_toolbox import (
    TranslationAPI, WeatherAPI, QuoteAPI, DictionaryAPI, JokeAPI, TextAnalyzer
)


class WorkerThread(QThread):
    """
    工作线程类
    用于在后台执行耗时的API请求，避免界面卡顿
    """
    finished = pyqtSignal(dict)
    error = pyqtSignal(str)

    def __init__(self, func, *args, **kwargs):
        """
        初始化工作线程
        
        Args:
            func: 要执行的函数
            *args: 函数位置参数
            **kwargs: 函数关键字参数
        """
        super().__init__()
        self.func = func
        self.args = args
        self.kwargs = kwargs

    def run(self):
        """线程执行函数"""
        try:
            result = self.func(*self.args, **self.kwargs)
            self.finished.emit(result)
        except Exception as e:
            self.error.emit(str(e))


class TranslationTab(QWidget):
    """翻译功能标签页"""

    def __init__(self):
        """初始化翻译标签页"""
        super().__init__()
        self.translator = TranslationAPI()
        self.worker = None
        self.init_ui()

    def init_ui(self):
        """初始化界面"""
        layout = QVBoxLayout()

        # 标题
        title = QLabel("🌐 智能翻译")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        # 语言选择区域
        lang_layout = QHBoxLayout()

        # 源语言选择
        src_layout = QVBoxLayout()
        src_label = QLabel("源语言:")
        self.src_combo = QComboBox()
        self.src_combo.addItem("自动检测")
        self.src_combo.addItems(self.translator.get_language_names())
        src_layout.addWidget(src_label)
        src_layout.addWidget(self.src_combo)
        lang_layout.addLayout(src_layout)

        # 交换按钮
        swap_btn = QPushButton("⇄")
        swap_btn.setFixedWidth(50)
        swap_btn.clicked.connect(self.swap_languages)
        lang_layout.addWidget(swap_btn)

        # 目标语言选择
        tgt_layout = QVBoxLayout()
        tgt_label = QLabel("目标语言:")
        self.tgt_combo = QComboBox()
        self.tgt_combo.addItems(self.translator.get_language_names())
        self.tgt_combo.setCurrentText("中文")
        tgt_layout.addWidget(tgt_label)
        tgt_layout.addWidget(self.tgt_combo)
        lang_layout.addLayout(tgt_layout)

        layout.addLayout(lang_layout)

        # 文本输入输出区域
        splitter = QSplitter(Qt.Vertical)

        # 输入框
        input_group = QGroupBox("输入文本")
        input_layout = QVBoxLayout()
        self.input_text = QTextEdit()
        self.input_text.setPlaceholderText("请输入要翻译的文本...")
        input_layout.addWidget(self.input_text)
        input_group.setLayout(input_layout)
        splitter.addWidget(input_group)

        # 输出框
        output_group = QGroupBox("翻译结果")
        output_layout = QVBoxLayout()
        self.output_text = QTextEdit()
        self.output_text.setReadOnly(True)
        self.output_text.setPlaceholderText("翻译结果将显示在这里...")
        output_layout.addWidget(self.output_text)
        output_group.setLayout(output_layout)
        splitter.addWidget(output_group)

        splitter.setSizes([200, 200])
        layout.addWidget(splitter)

        # 按钮区域
        btn_layout = QHBoxLayout()

        self.translate_btn = QPushButton("🔄 翻译")
        self.translate_btn.clicked.connect(self.do_translate)
        self.translate_btn.setMinimumHeight(40)
        btn_layout.addWidget(self.translate_btn)

        clear_btn = QPushButton("🗑️ 清空")
        clear_btn.clicked.connect(self.clear_texts)
        clear_btn.setMinimumHeight(40)
        btn_layout.addWidget(clear_btn)

        layout.addLayout(btn_layout)

        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setRange(0, 0)
        layout.addWidget(self.progress_bar)

        self.setLayout(layout)

    def swap_languages(self):
        """交换源语言和目标语言"""
        if self.src_combo.currentText() != "自动检测":
            src_text = self.src_combo.currentText()
            tgt_text = self.tgt_combo.currentText()
            self.src_combo.setCurrentText(tgt_text)
            self.tgt_combo.setCurrentText(src_text)

            # 同时交换输入输出文本
            input_text = self.input_text.toPlainText()
            output_text = self.output_text.toPlainText()
            self.input_text.setPlainText(output_text)
            self.output_text.setPlainText(input_text)

    def do_translate(self):
        """执行翻译"""
        text = self.input_text.toPlainText().strip()
        if not text:
            QMessageBox.warning(self, "提示", "请输入要翻译的文本！")
            return

        src_lang = self.src_combo.currentText()
        tgt_lang = self.tgt_combo.currentText()

        if src_lang == tgt_lang:
            QMessageBox.warning(self, "提示", "源语言和目标语言不能相同！")
            return

        # 显示进度条，禁用按钮
        self.progress_bar.setVisible(True)
        self.translate_btn.setEnabled(False)

        # 在后台线程执行翻译
        self.worker = WorkerThread(
            self.translator.translate,
            text,
            src_lang,
            tgt_lang
        )
        self.worker.finished.connect(self.on_translate_finished)
        self.worker.error.connect(self.on_translate_error)
        self.worker.start()

    def on_translate_finished(self, result):
        """翻译完成回调"""
        self.progress_bar.setVisible(False)
        self.translate_btn.setEnabled(True)

        if result.get("success"):
            self.output_text.setPlainText(result["translated_text"])
        else:
            QMessageBox.critical(self, "翻译失败", result.get("error", "未知错误"))

    def on_translate_error(self, error_msg):
        """翻译错误回调"""
        self.progress_bar.setVisible(False)
        self.translate_btn.setEnabled(True)
        QMessageBox.critical(self, "错误", f"翻译出错: {error_msg}")

    def clear_texts(self):
        """清空输入输出"""
        self.input_text.clear()
        self.output_text.clear()


class WeatherTab(QWidget):
    """天气查询功能标签页"""

    def __init__(self):
        """初始化天气标签页"""
        super().__init__()
        self.weather_api = WeatherAPI()
        self.worker = None
        self.init_ui()

    def init_ui(self):
        """初始化界面"""
        layout = QVBoxLayout()

        # 标题
        title = QLabel("🌤️ 天气查询")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        # 城市输入区域
        city_layout = QHBoxLayout()
        city_label = QLabel("城市名称:")
        self.city_input = QLineEdit()
        self.city_input.setPlaceholderText("请输入城市名称（如: Beijing, Shanghai）")
        self.city_input.returnPressed.connect(self.get_weather)
        query_btn = QPushButton("🔍 查询")
        query_btn.clicked.connect(self.get_weather)
        query_btn.setMinimumHeight(35)

        city_layout.addWidget(city_label)
        city_layout.addWidget(self.city_input)
        city_layout.addWidget(query_btn)
        layout.addLayout(city_layout)

        # 快捷城市按钮
        quick_layout = QHBoxLayout()
        quick_label = QLabel("快捷查询:")
        quick_layout.addWidget(quick_label)

        for city in ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Hangzhou"]:
            btn = QPushButton(city)
            btn.clicked.connect(lambda checked, c=city: self.query_city(c))
            quick_layout.addWidget(btn)

        quick_layout.addStretch()
        layout.addLayout(quick_layout)

        # 结果显示区域
        self.result_area = QScrollArea()
        self.result_area.setWidgetResizable(True)
        self.result_content = QWidget()
        self.result_layout = QVBoxLayout(self.result_content)
        self.result_area.setWidget(self.result_content)

        # 初始提示
        hint_label = QLabel("👆 请输入城市名称查询天气")
        hint_label.setAlignment(Qt.AlignCenter)
        hint_label.setStyleSheet("color: gray; font-size: 14px;")
        self.result_layout.addWidget(hint_label)

        layout.addWidget(self.result_area)

        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setRange(0, 0)
        layout.addWidget(self.progress_bar)

        self.setLayout(layout)

    def query_city(self, city):
        """查询指定城市天气"""
        self.city_input.setText(city)
        self.get_weather()

    def get_weather(self):
        """获取天气信息"""
        city = self.city_input.text().strip()
        if not city:
            QMessageBox.warning(self, "提示", "请输入城市名称！")
            return

        # 显示进度条
        self.progress_bar.setVisible(True)

        # 清空结果
        self.clear_result()
        loading_label = QLabel("⏳ 正在获取天气数据...")
        loading_label.setAlignment(Qt.AlignCenter)
        self.result_layout.addWidget(loading_label)

        # 后台线程查询
        self.worker = WorkerThread(self.weather_api.get_weather, city)
        self.worker.finished.connect(self.on_weather_finished)
        self.worker.error.connect(self.on_weather_error)
        self.worker.start()

    def clear_result(self):
        """清空结果区域"""
        while self.result_layout.count():
            item = self.result_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

    def on_weather_finished(self, result):
        """天气查询完成回调"""
        self.progress_bar.setVisible(False)
        self.clear_result()

        if not result.get("success"):
            error_label = QLabel(f"❌ 获取天气失败: {result.get('error', '未知错误')}")
            error_label.setAlignment(Qt.AlignCenter)
            error_label.setStyleSheet("color: red;")
            self.result_layout.addWidget(error_label)
            return

        # 显示天气信息
        current = result["current"]

        # 城市名称
        city_label = QLabel(f"📍 {result['city']}")
        city_label.setFont(QFont("Microsoft YaHei", 14, QFont.Bold))
        city_label.setAlignment(Qt.AlignCenter)
        self.result_layout.addWidget(city_label)

        # 主要天气信息
        main_frame = QFrame()
        main_frame.setFrameShape(QFrame.StyledPanel)
        main_layout = QGridLayout(main_frame)

        main_layout.addWidget(QLabel("🌤️ 天气:"), 0, 0)
        main_layout.addWidget(QLabel(current["description"]), 0, 1)

        main_layout.addWidget(QLabel("🌡️ 温度:"), 1, 0)
        temp_label = QLabel(f"{current['temperature']}°C")
        temp_label.setFont(QFont("Arial", 12, QFont.Bold))
        temp_label.setStyleSheet("color: #e74c3c;")
        main_layout.addWidget(temp_label, 1, 1)

        main_layout.addWidget(QLabel("🌡️ 体感温度:"), 2, 0)
        main_layout.addWidget(QLabel(f"{current['feels_like']}°C"), 2, 1)

        main_layout.addWidget(QLabel("💧 湿度:"), 3, 0)
        main_layout.addWidget(QLabel(f"{current['humidity']}%"), 3, 1)

        main_layout.addWidget(QLabel("💨 风速:"), 4, 0)
        main_layout.addWidget(QLabel(f"{current['wind_speed']} km/h ({current['wind_direction']})"), 4, 1)

        main_layout.addWidget(QLabel("👁️ 能见度:"), 5, 0)
        main_layout.addWidget(QLabel(f"{current['visibility']} km"), 5, 1)

        main_layout.addWidget(QLabel("🔵 气压:"), 0, 2)
        main_layout.addWidget(QLabel(f"{current['pressure']} hPa"), 0, 3)

        main_layout.addWidget(QLabel("☀️ UV指数:"), 1, 2)
        main_layout.addWidget(QLabel(current["uv_index"]), 1, 3)

        self.result_layout.addWidget(main_frame)

        # 未来预报
        if result.get("forecast"):
            forecast_label = QLabel("📅 未来天气预报")
            forecast_label.setFont(QFont("Microsoft YaHei", 12, QFont.Bold))
            self.result_layout.addWidget(forecast_label)

            for i, day in enumerate(result["forecast"][:3]):
                day_frame = QFrame()
                day_frame.setFrameShape(QFrame.StyledPanel)
                day_layout = QHBoxLayout(day_frame)

                day_name = ["今天", "明天", "后天"][i] if i < 3 else day["date"]

                day_layout.addWidget(QLabel(f"📆 {day_name}"))
                day_layout.addWidget(QLabel(f"🌡️ {day['min_temp']}~{day['max_temp']}°C"))
                day_layout.addWidget(QLabel(f"🌤️ {day['description']}"))
                day_layout.addWidget(QLabel(f"🌅 {day['sunrise']}"))
                day_layout.addWidget(QLabel(f"🌇 {day['sunset']}"))
                day_layout.addStretch()

                self.result_layout.addWidget(day_frame)

        self.result_layout.addStretch()

    def on_weather_error(self, error_msg):
        """天气查询错误回调"""
        self.progress_bar.setVisible(False)
        self.clear_result()
        error_label = QLabel(f"❌ 出错: {error_msg}")
        error_label.setAlignment(Qt.AlignCenter)
        error_label.setStyleSheet("color: red;")
        self.result_layout.addWidget(error_label)


class QuoteTab(QWidget):
    """名言功能标签页"""

    def __init__(self):
        """初始化名言标签页"""
        super().__init__()
        self.quote_api = QuoteAPI()
        self.worker = None
        self.init_ui()

    def init_ui(self):
        """初始化界面"""
        layout = QVBoxLayout()

        # 标题
        title = QLabel("💬 每日名言")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        # 按钮区域
        btn_layout = QHBoxLayout()

        today_btn = QPushButton("📅 今日名言")
        today_btn.clicked.connect(lambda: self.get_quote("today"))
        today_btn.setMinimumHeight(40)
        btn_layout.addWidget(today_btn)

        random_btn = QPushButton("🎲 随机名言")
        random_btn.clicked.connect(lambda: self.get_quote("random"))
        random_btn.setMinimumHeight(40)
        btn_layout.addWidget(random_btn)

        layout.addLayout(btn_layout)

        # 名言显示区域
        self.quote_frame = QFrame()
        self.quote_frame.setFrameShape(QFrame.StyledPanel)
        self.quote_layout = QVBoxLayout(self.quote_frame)

        self.quote_text = QLabel("点击上方按钮获取名言")
        self.quote_text.setWordWrap(True)
        self.quote_text.setAlignment(Qt.AlignCenter)
        self.quote_text.setFont(QFont("Microsoft YaHei", 14))
        self.quote_text.setStyleSheet("color: #2c3e50; padding: 20px;")
        self.quote_layout.addWidget(self.quote_text)

        self.author_text = QLabel("")
        self.author_text.setAlignment(Qt.AlignRight | Qt.AlignBottom)
        self.author_text.setFont(QFont("Microsoft YaHei", 12, QFont.Bold))
        self.author_text.setStyleSheet("color: #7f8c8d; padding: 10px;")
        self.quote_layout.addWidget(self.author_text)

        layout.addWidget(self.quote_frame, 1)

        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setRange(0, 0)
        layout.addWidget(self.progress_bar)

        self.setLayout(layout)

    def get_quote(self, quote_type="random"):
        """获取名言"""
        self.progress_bar.setVisible(True)
        self.quote_text.setText("⏳ 正在获取名言...")
        self.author_text.setText("")

        if quote_type == "today":
            func = self.quote_api.get_today_quote
        else:
            func = self.quote_api.get_random_quote

        self.worker = WorkerThread(func)
        self.worker.finished.connect(self.on_quote_finished)
        self.worker.error.connect(self.on_quote_error)
        self.worker.start()

    def on_quote_finished(self, result):
        """名言获取完成回调"""
        self.progress_bar.setVisible(False)

        if result.get("success"):
            self.quote_text.setText(f'"{result["quote"]}"')
            self.author_text.setText(f"—— {result['author']}")
        else:
            self.quote_text.setText(f"❌ 获取失败: {result.get('error', '未知错误')}")
            self.author_text.setText("")

    def on_quote_error(self, error_msg):
        """名言获取错误回调"""
        self.progress_bar.setVisible(False)
        self.quote_text.setText(f"❌ 出错: {error_msg}")
        self.author_text.setText("")


class DictionaryTab(QWidget):
    """词典功能标签页"""

    def __init__(self):
        """初始化词典标签页"""
        super().__init__()
        self.dict_api = DictionaryAPI()
        self.worker = None
        self.init_ui()

    def init_ui(self):
        """初始化界面"""
        layout = QVBoxLayout()

        # 标题
        title = QLabel("📖 英汉词典")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        # 输入区域
        input_layout = QHBoxLayout()
        input_label = QLabel("单词:")
        self.word_input = QLineEdit()
        self.word_input.setPlaceholderText("请输入要查询的英文单词...")
        self.word_input.returnPressed.connect(self.lookup)
        lookup_btn = QPushButton("🔍 查询")
        lookup_btn.clicked.connect(self.lookup)
        lookup_btn.setMinimumHeight(35)

        input_layout.addWidget(input_label)
        input_layout.addWidget(self.word_input)
        input_layout.addWidget(lookup_btn)
        layout.addLayout(input_layout)

        # 结果显示区域
        self.result_area = QScrollArea()
        self.result_area.setWidgetResizable(True)
        self.result_content = QWidget()
        self.result_layout = QVBoxLayout(self.result_content)
        self.result_area.setWidget(self.result_content)

        # 初始提示
        hint_label = QLabel("👆 请输入英文单词查询释义")
        hint_label.setAlignment(Qt.AlignCenter)
        hint_label.setStyleSheet("color: gray; font-size: 14px;")
        self.result_layout.addWidget(hint_label)

        layout.addWidget(self.result_area, 1)

        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setRange(0, 0)
        layout.addWidget(self.progress_bar)

        self.setLayout(layout)

    def lookup(self):
        """查询单词"""
        word = self.word_input.text().strip()
        if not word:
            QMessageBox.warning(self, "提示", "请输入要查询的单词！")
            return

        self.progress_bar.setVisible(True)
        self.clear_result()

        loading_label = QLabel("⏳ 正在查询...")
        loading_label.setAlignment(Qt.AlignCenter)
        self.result_layout.addWidget(loading_label)

        self.worker = WorkerThread(self.dict_api.lookup_word, word)
        self.worker.finished.connect(self.on_lookup_finished)
        self.worker.error.connect(self.on_lookup_error)
        self.worker.start()

    def clear_result(self):
        """清空结果区域"""
        while self.result_layout.count():
            item = self.result_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

    def on_lookup_finished(self, result):
        """查询完成回调"""
        self.progress_bar.setVisible(False)
        self.clear_result()

        if not result.get("success"):
            error_label = QLabel(f"❌ {result.get('error', '未知错误')}")
            error_label.setAlignment(Qt.AlignCenter)
            error_label.setStyleSheet("color: red;")
            self.result_layout.addWidget(error_label)
            return

        # 单词和音标
        word_header = QLabel(f"📖 {result['word']}  [{result.get('phonetic', '')}]")
        word_header.setFont(QFont("Microsoft YaHei", 14, QFont.Bold))
        self.result_layout.addWidget(word_header)

        # 各词性释义
        for meaning in result.get("meanings", []):
            pos_frame = QFrame()
            pos_frame.setFrameShape(QFrame.StyledPanel)
            pos_layout = QVBoxLayout(pos_frame)

            pos_label = QLabel(f"📝 {meaning['part_of_speech']}")
            pos_label.setFont(QFont("Microsoft YaHei", 11, QFont.Bold))
            pos_label.setStyleSheet("color: #3498db;")
            pos_layout.addWidget(pos_label)

            for i, definition in enumerate(meaning["definitions"][:5], 1):
                def_label = QLabel(f"  {i}. {definition['definition']}")
                def_label.setWordWrap(True)
                pos_layout.addWidget(def_label)

                if definition.get("example"):
                    example_label = QLabel(f'     💡 例句: "{definition["example"]}"')
                    example_label.setWordWrap(True)
                    example_label.setStyleSheet("color: #7f8c8d; font-style: italic;")
                    pos_layout.addWidget(example_label)

                if definition.get("synonyms"):
                    syn_label = QLabel(f"     🔗 同义词: {', '.join(definition['synonyms'][:5])}")
                    syn_label.setWordWrap(True)
                    syn_label.setStyleSheet("color: #27ae60;")
                    pos_layout.addWidget(syn_label)

            self.result_layout.addWidget(pos_frame)

        self.result_layout.addStretch()

    def on_lookup_error(self, error_msg):
        """查询错误回调"""
        self.progress_bar.setVisible(False)
        self.clear_result()
        error_label = QLabel(f"❌ 出错: {error_msg}")
        error_label.setAlignment(Qt.AlignCenter)
        error_label.setStyleSheet("color: red;")
        self.result_layout.addWidget(error_label)


class JokeTab(QWidget):
    """笑话功能标签页"""

    def __init__(self):
        """初始化笑话标签页"""
        super().__init__()
        self.joke_api = JokeAPI()
        self.worker = None
        self.init_ui()

    def init_ui(self):
        """初始化界面"""
        layout = QVBoxLayout()

        # 标题
        title = QLabel("😄 笑话大全")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        # 类别选择
        category_layout = QHBoxLayout()
        cat_label = QLabel("笑话类别:")
        self.category_combo = QComboBox()
        self.category_combo.addItems(self.joke_api.get_categories())
        category_layout.addWidget(cat_label)
        category_layout.addWidget(self.category_combo)
        category_layout.addStretch()
        layout.addLayout(category_layout)

        # 获取按钮
        get_btn = QPushButton("🎲 来一个笑话")
        get_btn.clicked.connect(self.get_joke)
        get_btn.setMinimumHeight(45)
        get_btn.setFont(QFont("Microsoft YaHei", 12))
        layout.addWidget(get_btn)

        # 笑话显示区域
        self.joke_frame = QFrame()
        self.joke_frame.setFrameShape(QFrame.StyledPanel)
        self.joke_layout = QVBoxLayout(self.joke_frame)

        self.setup_label = QLabel("点击按钮获取笑话")
        self.setup_label.setWordWrap(True)
        self.setup_label.setAlignment(Qt.AlignCenter)
        self.setup_label.setFont(QFont("Microsoft YaHei", 13))
        self.setup_label.setStyleSheet("padding: 20px; color: #2c3e50;")
        self.joke_layout.addWidget(self.setup_label)

        self.delivery_label = QLabel("")
        self.delivery_label.setWordWrap(True)
        self.delivery_label.setAlignment(Qt.AlignCenter)
        self.delivery_label.setFont(QFont("Microsoft YaHei", 13, QFont.Bold))
        self.delivery_label.setStyleSheet("padding: 20px; color: #e74c3c;")
        self.joke_layout.addWidget(self.delivery_label)

        layout.addWidget(self.joke_frame, 1)

        # 类别标签
        self.category_label = QLabel("")
        self.category_label.setAlignment(Qt.AlignCenter)
        self.category_label.setStyleSheet("color: #7f8c8d;")
        layout.addWidget(self.category_label)

        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setRange(0, 0)
        layout.addWidget(self.progress_bar)

        self.setLayout(layout)

    def get_joke(self):
        """获取笑话"""
        category = self.category_combo.currentText()
        self.progress_bar.setVisible(True)
        self.setup_label.setText("⏳ 正在获取笑话...")
        self.delivery_label.setText("")
        self.category_label.setText("")

        self.worker = WorkerThread(self.joke_api.get_random_joke, category)
        self.worker.finished.connect(self.on_joke_finished)
        self.worker.error.connect(self.on_joke_error)
        self.worker.start()

    def on_joke_finished(self, result):
        """笑话获取完成回调"""
        self.progress_bar.setVisible(False)

        if not result.get("success"):
            self.setup_label.setText(f"❌ 获取失败: {result.get('error', '未知错误')}")
            self.delivery_label.setText("")
            return

        self.category_label.setText(f"📂 分类: {result.get('category', '')}")

        if result.get("type") == "single":
            self.setup_label.setText(result.get("joke", ""))
            self.delivery_label.setText("")
        else:
            self.setup_label.setText(result.get("setup", ""))
            self.delivery_label.setText(result.get("delivery", ""))

    def on_joke_error(self, error_msg):
        """笑话获取错误回调"""
        self.progress_bar.setVisible(False)
        self.setup_label.setText(f"❌ 出错: {error_msg}")
        self.delivery_label.setText("")


class TextAnalysisTab(QWidget):
    """文本分析功能标签页"""

    def __init__(self):
        """初始化文本分析标签页"""
        super().__init__()
        self.analyzer = TextAnalyzer()
        self.init_ui()

    def init_ui(self):
        """初始化界面"""
        layout = QVBoxLayout()

        # 标题
        title = QLabel("📊 文本分析")
        title.setFont(QFont("Microsoft YaHei", 16, QFont.Bold))
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        # 文本输入和结果分割
        splitter = QSplitter(Qt.Horizontal)

        # 左侧输入
        input_group = QGroupBox("输入文本")
        input_layout = QVBoxLayout()
        self.input_text = QTextEdit()
        self.input_text.setPlaceholderText("请输入要分析的英文文本...\n\n支持以下分析：\n- 基本统计（字符数、单词数、句子数等）\n- 可读性分析\n- 情感分析\n- 关键词提取\n- 自动摘要")
        input_layout.addWidget(self.input_text)

        # 按钮
        btn_layout = QHBoxLayout()
        analyze_btn = QPushButton("🔍 分析")
        analyze_btn.clicked.connect(self.do_analysis)
        analyze_btn.setMinimumHeight(35)
        btn_layout.addWidget(analyze_btn)

        summary_btn = QPushButton("📝 自动摘要")
        summary_btn.clicked.connect(self.do_summary)
        summary_btn.setMinimumHeight(35)
        btn_layout.addWidget(summary_btn)

        clear_btn = QPushButton("🗑️ 清空")
        clear_btn.clicked.connect(self.clear_all)
        clear_btn.setMinimumHeight(35)
        btn_layout.addWidget(clear_btn)

        input_layout.addLayout(btn_layout)
        input_group.setLayout(input_layout)
        splitter.addWidget(input_group)

        # 右侧结果
        output_group = QGroupBox("分析结果")
        output_layout = QVBoxLayout()
        self.result_text = QTextEdit()
        self.result_text.setReadOnly(True)
        self.result_text.setPlaceholderText("分析结果将显示在这里...")
        output_layout.addWidget(self.result_text)
        output_group.setLayout(output_layout)
        splitter.addWidget(output_group)

        splitter.setSizes([400, 400])
        layout.addWidget(splitter, 1)

        self.setLayout(layout)

    def do_analysis(self):
        """执行文本分析"""
        text = self.input_text.toPlainText().strip()
        if not text:
            QMessageBox.warning(self, "提示", "请输入要分析的文本！")
            return

        result = self.analyzer.analyze(text)
        report = self.analyzer.format_analysis_report(result)
        self.result_text.setPlainText(report)

    def do_summary(self):
        """执行文本摘要"""
        text = self.input_text.toPlainText().strip()
        if not text:
            QMessageBox.warning(self, "提示", "请输入要摘要的文本！")
            return

        result = self.analyzer.summarize_text(text, sentence_count=3)

        if result.get("success"):
            summary_text = f"""
📝 文本自动摘要
{'='*40}

{result['summary']}

{'='*40}
📊 原文句子数: {result['original_sentences']}
📊 摘要句子数: {result['summary_sentences']}
"""
            self.result_text.setPlainText(summary_text)
        else:
            QMessageBox.critical(self, "错误", "摘要生成失败！")

    def clear_all(self):
        """清空输入输出"""
        self.input_text.clear()
        self.result_text.clear()


class AIToolboxDialog(QDialog):
    """AI工具箱对话框 - 小白桌面宠物集成版"""

    def __init__(self, parent=None):
        """初始化AI工具箱对话框
        
        Args:
            parent: 父窗口对象
        """
        super().__init__(parent)
        self.init_ui()
        self.apply_style()

    def init_ui(self):
        """初始化界面"""
        self.setWindowTitle("🤖 AI多功能工具箱 - 小白桌面宠物")
        self.setGeometry(100, 100, 900, 700)

        # 创建标签页
        self.tab_widget = QTabWidget()
        self.tab_widget.setFont(QFont("Microsoft YaHei", 10))

        # 添加各个功能标签页
        self.tab_widget.addTab(TranslationTab(), "🌐 翻译")
        self.tab_widget.addTab(WeatherTab(), "🌤️ 天气")
        self.tab_widget.addTab(QuoteTab(), "💬 名言")
        self.tab_widget.addTab(DictionaryTab(), "📖 词典")
        self.tab_widget.addTab(JokeTab(), "😄 笑话")
        self.tab_widget.addTab(TextAnalysisTab(), "📊 文本分析")

        # 主布局
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.addWidget(self.tab_widget)
        self.setLayout(main_layout)

    def apply_style(self):
        """应用样式"""
        style = """
            QDialog {
                background-color: #f5f7fa;
            }
            QTabWidget::pane {
                border: 1px solid #dcdfe6;
                border-radius: 8px;
                background: white;
                padding: 10px;
            }
            QTabBar::tab {
                background: #e9ecef;
                border: 1px solid #dcdfe6;
                border-bottom: none;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                padding: 10px 20px;
                margin-right: 2px;
            }
            QTabBar::tab:selected {
                background: white;
                color: #FF69B4;
                border-bottom: 2px solid #FF69B4;
            }
            QTabBar::tab:hover {
                background: #dcdfe6;
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
                color: #ffffff;
            }
            QLineEdit, QTextEdit, QComboBox {
                border: 1px solid #dcdfe6;
                border-radius: 5px;
                padding: 8px;
                background: white;
            }
            QLineEdit:focus, QTextEdit:focus, QComboBox:focus {
                border: 1px solid #FF69B4;
            }
            QGroupBox {
                border: 1px solid #dcdfe6;
                border-radius: 8px;
                margin-top: 10px;
                padding-top: 10px;
                font-weight: bold;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px;
                color: #606266;
            }
            QFrame[frameShape="1"] {
                border: 1px solid #ebeef5;
                border-radius: 8px;
                background: #fafafa;
            }
            QScrollArea {
                border: 1px solid #ebeef5;
                border-radius: 8px;
            }
            QProgressBar {
                border: none;
                border-radius: 5px;
                background: #ebeef5;
                text-align: center;
                height: 10px;
            }
            QProgressBar::chunk {
                border-radius: 5px;
                background: #FF69B4;
            }
        """
        self.setStyleSheet(style)
