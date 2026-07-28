"""
登录注册模态对话框（粉色主题）
支持：邮箱+密码登录（记住登录）/ 完整注册流程（昵称+邮箱+邮箱验证码+图形/滑块验证+密码强度+二次确认）
"""

import os
import base64
import logging
from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton,
    QCheckBox, QWidget, QStackedWidget, QMessageBox, QFrame, QSizePolicy
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QSize
from PyQt5.QtGui import QIcon, QPixmap, QPainter, QFont, QColor
try:
    from PyQt5.QtSvg import QSvgRenderer
except Exception:
    # 兼容：未安装 QtSvg 时，退化为纯文本
    QSvgRenderer = None
from components.slider_captcha_widget import SliderCaptchaWidget

logger = logging.getLogger(__name__)


class LoginRegisterDialog(QDialog):
    """登录/注册一体化模态对话框"""

    login_success = pyqtSignal(dict)  # 登录成功后抛出 user 信息

    LOGIN_TAB = 0
    REGISTER_TAB = 1

    def __init__(self, auth_system, parent=None):
        super().__init__(parent)
        self.auth = auth_system
        # 初始化图形验证码状态变量（避免在渲染前访问未定义属性）
        self._current_captcha_svg_login = '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="44"/>'
        self._current_captcha_svg_reg = self._current_captcha_svg_login
        self._login_captcha_id = None
        self._login_captcha_code = None
        self._reg_captcha_id = None
        self._reg_captcha_code = None
        self._current_captcha_code = "NULL"
        self._login_slider_passed = False
        self._login_need_slider = False
        self._register_slider_passed = False
        self._register_need_slider = False
        self._register_captcha_fail_count = 0
        self._send_cooldown_timer = None
        self._cooldown_seconds = 0
        self.setWindowFlags(self.windowFlags() | Qt.WindowStaysOnTopHint)
        self._init_ui()
        self._refresh_login_captcha()
        self._refresh_register_captcha()

    # ====================================================
    #  UI 初始化
    # ====================================================
    def _init_ui(self):
        self.setWindowTitle("小白 · 登录 / 注册")
        self.setFixedSize(480, 640)
        self.setStyleSheet(self._global_qss())

        outer = QVBoxLayout(self)
        outer.setContentsMargins(24, 24, 24, 24)
        outer.setSpacing(16)

        # Logo & 标题
        title_box = QVBoxLayout()
        title_box.setSpacing(4)
        title_lbl = QLabel("🐾  小白智能桌面宠物")
        title_lbl.setAlignment(Qt.AlignCenter)
        title_lbl.setStyleSheet("font-size: 20px; font-weight: bold; color: #333; font-family: 'Microsoft YaHei';")
        subtitle_lbl = QLabel("登录后开启完整功能 · 数据安全保存在本地")
        subtitle_lbl.setAlignment(Qt.AlignCenter)
        subtitle_lbl.setStyleSheet("font-size: 12px; color: #999;")
        title_box.addWidget(title_lbl)
        title_box.addWidget(subtitle_lbl)
        outer.addLayout(title_box)

        # Tab 切换栏
        tab_bar = self._build_tab_bar()
        outer.addWidget(tab_bar)

        # Stacked 内容
        self.stack = QStackedWidget()
        self.stack.addWidget(self._build_login_page())
        self.stack.addWidget(self._build_register_page())
        outer.addWidget(self.stack)

        # 底部提示
        self.result_hint = QLabel("")
        self.result_hint.setAlignment(Qt.AlignCenter)
        self.result_hint.setWordWrap(True)
        self.result_hint.setStyleSheet("font-size: 12px; min-height: 18px;")
        outer.addWidget(self.result_hint)

        self._switch_to_tab(self.LOGIN_TAB)

    # ---------- Tab Bar ----------
    def _build_tab_bar(self) -> QWidget:
        bar = QWidget()
        bar.setFixedHeight(44)
        bar_l = QHBoxLayout(bar)
        bar_l.setContentsMargins(0, 0, 0, 0)
        bar_l.setSpacing(0)

        self.tab_login = QPushButton("登  录")
        self.tab_register = QPushButton("注  册")
        for btn in (self.tab_login, self.tab_register):
            btn.setCursor(Qt.PointingHandCursor)
            btn.setStyleSheet("""
                QPushButton {
                    font-size: 15px; font-weight: bold; padding: 10px 0;
                    border: none; background: transparent; color: #888;
                }
            """)
        self.tab_login.clicked.connect(lambda: self._switch_to_tab(self.LOGIN_TAB))
        self.tab_register.clicked.connect(lambda: self._switch_to_tab(self.REGISTER_TAB))
        bar_l.addWidget(self.tab_login)
        bar_l.addWidget(self.tab_register)

        # 底部蓝色指示条，用两个frame模拟
        self.indicator_login = QFrame()
        self.indicator_login.setFixedHeight(3)
        self.indicator_register = QFrame()
        self.indicator_register.setFixedHeight(3)

        # 组合：每个 tab 下方放 indicator
        wrap = QWidget()
        wrap_l = QVBoxLayout(wrap)
        wrap_l.setContentsMargins(0, 0, 0, 0)
        wrap_l.setSpacing(0)
        wrap_l.addWidget(bar)
        indicators = QHBoxLayout()
        indicators.setContentsMargins(0, 0, 0, 0)
        indicators.addWidget(self.indicator_login)
        indicators.addWidget(self.indicator_register)
        wrap_l.addLayout(indicators)
        return wrap

    # ---------- 登录页 ----------
    def _build_login_page(self) -> QWidget:
        w = QWidget()
        lay = QVBoxLayout(w)
        lay.setContentsMargins(0, 12, 0, 0)
        lay.setSpacing(14)

        # 邮箱输入
        lay.addWidget(self._field_label("邮箱"))
        self.login_email_edit = self._make_lineedit("请输入注册邮箱", "email")
        lay.addWidget(self.login_email_edit)

        # 密码输入（含显示/隐藏切换）
        lay.addWidget(self._field_label("密码"))
        pwd_wrap = QWidget()
        pwd_lay = QHBoxLayout(pwd_wrap)
        pwd_lay.setContentsMargins(0, 0, 0, 0)
        self.login_pwd_edit = self._make_lineedit("请输入登录密码", "password")
        self.login_pwd_edit.setEchoMode(QLineEdit.Password)
        self.login_toggle_pwd = QPushButton("👁")
        self.login_toggle_pwd.setCursor(Qt.PointingHandCursor)
        self.login_toggle_pwd.setFixedSize(44, 44)
        self.login_toggle_pwd.setStyleSheet("QPushButton{background:#FFF;border:1px solid #FFE4E1;border-radius:8px;font-size:16px;}"
                                             "QPushButton:hover{background:#FFF0F5;}")
        self.login_toggle_pwd.clicked.connect(self._toggle_login_pwd)
        pwd_lay.addWidget(self.login_pwd_edit)
        pwd_lay.addWidget(self.login_toggle_pwd)
        lay.addWidget(pwd_wrap)

        # 图形验证码 / 滑块容器
        self.login_captcha_container = QWidget()
        self.login_captcha_lay = QVBoxLayout(self.login_captcha_container)
        self.login_captcha_lay.setContentsMargins(0, 0, 0, 0)
        self.login_captcha_lay.setSpacing(8)
        lay.addWidget(self.login_captcha_container)

        # 记住登录
        bottom_opt = QHBoxLayout()
        self.login_remember_cb = QCheckBox("记住登录状态")
        self.login_remember_cb.setChecked(True)
        self.login_remember_cb.setStyleSheet("QCheckBox{color:#666;font-size:12px;}")
        bottom_opt.addWidget(self.login_remember_cb)
        bottom_opt.addStretch()
        lay.addLayout(bottom_opt)

        # 登录按钮
        self.login_btn = QPushButton("登 录")
        self.login_btn.setCursor(Qt.PointingHandCursor)
        self.login_btn.setStyleSheet(self._primary_btn_qss())
        self.login_btn.setMinimumHeight(48)
        self.login_btn.clicked.connect(self._do_login)
        lay.addWidget(self.login_btn)

        lay.addStretch()
        # 底部切换到注册
        tip_row = QHBoxLayout()
        tip_row.addStretch()
        tip = QLabel("还没有账号？")
        tip.setStyleSheet("color:#888;font-size:12px;")
        jump = QPushButton("去注册 →")
        jump.setCursor(Qt.PointingHandCursor)
        jump.setStyleSheet("QPushButton{background:transparent;color:#FF69B4;font-weight:bold;border:none;}"
                           "QPushButton:hover{text-decoration:underline;}")
        jump.clicked.connect(lambda: self._switch_to_tab(self.REGISTER_TAB))
        tip_row.addWidget(tip)
        tip_row.addWidget(jump)
        tip_row.addStretch()
        lay.addLayout(tip_row)

        # 默认渲染图形验证码
        self._render_login_captcha_ui()
        return w

    # ---------- 注册页 ----------
    def _build_register_page(self) -> QWidget:
        w = QWidget()
        lay = QVBoxLayout(w)
        lay.setContentsMargins(0, 12, 0, 0)
        lay.setSpacing(10)

        # 昵称
        lay.addWidget(self._field_label("昵称（2-20字符）"))
        self.reg_nick_edit = self._make_lineedit("请输入展示昵称")
        lay.addWidget(self.reg_nick_edit)

        # 邮箱 + 发送验证码按钮
        lay.addWidget(self._field_label("邮箱"))
        email_box = QWidget()
        email_lay = QHBoxLayout(email_box)
        email_lay.setContentsMargins(0, 0, 0, 0)
        email_lay.setSpacing(8)
        self.reg_email_edit = self._make_lineedit("请输入有效邮箱地址", "email")
        self.send_code_btn = QPushButton("发送验证码")
        self.send_code_btn.setCursor(Qt.PointingHandCursor)
        self.send_code_btn.setFixedSize(108, 44)
        self.send_code_btn.setStyleSheet("""
            QPushButton{background:#FF69B4;color:#fff;border:none;border-radius:8px;font-weight:bold;}
            QPushButton:hover{background:#FF1493;}
            QPushButton:disabled{background:#FFB6C1;color:#fff;}
        """)
        self.send_code_btn.clicked.connect(self._do_send_email_code)
        email_lay.addWidget(self.reg_email_edit)
        email_lay.addWidget(self.send_code_btn)
        lay.addWidget(email_box)

        # 邮箱验证码输入
        lay.addWidget(self._field_label("邮箱验证码（6位数字）"))
        self.reg_email_code_edit = self._make_lineedit("填写收到的6位验证码", "number")
        self.reg_email_code_edit.setMaxLength(6)
        lay.addWidget(self.reg_email_code_edit)

        # 密码 + 强度条
        lay.addWidget(self._field_label("密码（≥8位，含大小写字母和数字）"))
        self.reg_pwd_edit = self._make_lineedit("请设置密码", "password")
        self.reg_pwd_edit.setEchoMode(QLineEdit.Password)
        self.reg_pwd_edit.textChanged.connect(self._update_pwd_strength)
        lay.addWidget(self.reg_pwd_edit)

        strength_row = QHBoxLayout()
        strength_row.setSpacing(4)
        self.strength_bars = [QFrame() for _ in range(3)]
        for b in self.strength_bars:
            b.setFixedHeight(4)
            b.setStyleSheet("background:#FFE4E1;border-radius:2px;")
            strength_row.addWidget(b)
        self.strength_text = QLabel("")
        self.strength_text.setStyleSheet("font-size:11px;color:#999;")
        strength_row.addWidget(self.strength_text, 1)
        lay.addLayout(strength_row)

        # 确认密码
        lay.addWidget(self._field_label("确认密码"))
        self.reg_pwd2_edit = self._make_lineedit("请再次输入密码", "password")
        self.reg_pwd2_edit.setEchoMode(QLineEdit.Password)
        lay.addWidget(self.reg_pwd2_edit)

        # 图形验证码 / 滑块容器
        self.reg_captcha_container = QWidget()
        self.reg_captcha_lay = QVBoxLayout(self.reg_captcha_container)
        self.reg_captcha_lay.setContentsMargins(0, 0, 0, 0)
        self.reg_captcha_lay.setSpacing(8)
        lay.addWidget(self.reg_captcha_container)

        # 注册按钮
        self.reg_btn = QPushButton("注 册 并 登 录")
        self.reg_btn.setCursor(Qt.PointingHandCursor)
        self.reg_btn.setStyleSheet(self._primary_btn_qss())
        self.reg_btn.setMinimumHeight(48)
        self.reg_btn.clicked.connect(self._do_register)
        lay.addWidget(self.reg_btn)

        lay.addStretch()
        tip_row = QHBoxLayout()
        tip_row.addStretch()
        tip = QLabel("已有账号？")
        tip.setStyleSheet("color:#888;font-size:12px;")
        jump = QPushButton("去登录 →")
        jump.setCursor(Qt.PointingHandCursor)
        jump.setStyleSheet("QPushButton{background:transparent;color:#FF69B4;font-weight:bold;border:none;}"
                           "QPushButton:hover{text-decoration:underline;}")
        jump.clicked.connect(lambda: self._switch_to_tab(self.LOGIN_TAB))
        tip_row.addWidget(tip)
        tip_row.addWidget(jump)
        tip_row.addStretch()
        lay.addLayout(tip_row)

        self._render_register_captcha_ui()
        return w

    # ====================================================
    #  图形验证码 UI 渲染（SVG → QPixmap）
    # ====================================================
    def _render_login_captcha_ui(self):
        """渲染登录侧的图形验证码输入+预览UI"""
        # 清空容器
        while self.login_captcha_lay.count():
            item = self.login_captcha_lay.takeAt(0)
            w = item.widget()
            if w: w.setParent(None)
        if self._login_need_slider:
            self.login_slider = SliderCaptchaWidget()
            self.login_slider.slider_passed.connect(self._on_login_slider_pass)
            self.login_slider.slider_failed.connect(lambda msg: self._show_hint(msg, "error"))
            self.login_captcha_lay.addWidget(self.login_slider, alignment=Qt.AlignCenter)
        else:
            row = QWidget()
            rl = QHBoxLayout(row)
            rl.setContentsMargins(0, 0, 0, 0)
            rl.setSpacing(8)
            self.login_captcha_edit = self._make_lineedit("4位字母/数字验证码")
            self.login_captcha_edit.setMaxLength(4)
            self.login_captcha_preview = QLabel()
            self.login_captcha_preview.setCursor(Qt.PointingHandCursor)
            self.login_captcha_preview.setFixedSize(140, 44)
            self.login_captcha_preview.setStyleSheet("border:1px solid #FFB6C1;border-radius:8px;background:#FFF;")
            self.login_captcha_preview.setToolTip("点击刷新验证码")
            self.login_captcha_preview.mousePressEvent = lambda e: (self._refresh_login_captcha(), self._render_login_captcha_ui())
            pix = self._svg_to_pixmap(self._current_captcha_svg_login, 140, 44)
            self.login_captcha_preview.setPixmap(pix)
            rl.addWidget(self.login_captcha_edit, 2)
            rl.addWidget(self.login_captcha_preview)
            self.login_captcha_lay.addWidget(self._field_label("图形验证码"))
            self.login_captcha_lay.addWidget(row)

    def _render_register_captcha_ui(self):
        while self.reg_captcha_lay.count():
            item = self.reg_captcha_lay.takeAt(0)
            w = item.widget()
            if w: w.setParent(None)
        if self._register_need_slider:
            self.reg_slider = SliderCaptchaWidget()
            self.reg_slider.slider_passed.connect(self._on_register_slider_pass)
            self.reg_slider.slider_failed.connect(lambda msg: self._show_hint(msg, "error"))
            self.reg_captcha_lay.addWidget(self.reg_slider, alignment=Qt.AlignCenter)
        else:
            row = QWidget()
            rl = QHBoxLayout(row)
            rl.setContentsMargins(0, 0, 0, 0)
            rl.setSpacing(8)
            self.reg_captcha_edit = self._make_lineedit("4位字母/数字验证码")
            self.reg_captcha_edit.setMaxLength(4)
            self.reg_captcha_preview = QLabel()
            self.reg_captcha_preview.setCursor(Qt.PointingHandCursor)
            self.reg_captcha_preview.setFixedSize(140, 44)
            self.reg_captcha_preview.setStyleSheet("border:1px solid #FFB6C1;border-radius:8px;background:#FFF;")
            self.reg_captcha_preview.setToolTip("点击刷新验证码")
            self.reg_captcha_preview.mousePressEvent = lambda e: (self._refresh_register_captcha(), self._render_register_captcha_ui())
            pix = self._svg_to_pixmap(self._current_captcha_svg_reg, 140, 44)
            self.reg_captcha_preview.setPixmap(pix)
            rl.addWidget(self.reg_captcha_edit, 2)
            rl.addWidget(self.reg_captcha_preview)
            self.reg_captcha_lay.addWidget(self._field_label("图形验证码"))
            self.reg_captcha_lay.addWidget(row)

    def _refresh_login_captcha(self):
        cid, code, svg = self.auth.generate_captcha()
        self._login_captcha_id = cid
        self._login_captcha_code = code
        self._current_captcha_svg_login = svg

    def _refresh_register_captcha(self):
        cid, code, svg = self.auth.generate_captcha()
        self._reg_captcha_id = cid
        self._reg_captcha_code = code
        self._current_captcha_svg_reg = svg

    # ====================================================
    #  交互逻辑
    # ====================================================
    def _switch_to_tab(self, idx):
        self.stack.setCurrentIndex(idx)
        # 更新 tab 样式
        for btn, indicator, target in (
            (self.tab_login, self.indicator_login, self.LOGIN_TAB),
            (self.tab_register, self.indicator_register, self.REGISTER_TAB),
        ):
            if idx == target:
                btn.setStyleSheet("QPushButton{font-size:15px;font-weight:bold;padding:10px 0;border:none;background:transparent;color:#FF69B4;}")
                indicator.setStyleSheet("background:#FF69B4;border-radius:2px;")
            else:
                btn.setStyleSheet("QPushButton{font-size:15px;font-weight:bold;padding:10px 0;border:none;background:transparent;color:#888;}")
                indicator.setStyleSheet("background:transparent;")
        self.result_hint.setText("")

    def _on_login_slider_pass(self):
        self._login_slider_passed = True
        self._show_hint("✅ 滑块验证通过", "ok")

    def _on_register_slider_pass(self):
        self._register_slider_passed = True
        self._show_hint("✅ 滑块验证通过", "ok")

    def _toggle_login_pwd(self):
        cur = self.login_pwd_edit.echoMode()
        self.login_pwd_edit.setEchoMode(QLineEdit.Normal if cur == QLineEdit.Password else QLineEdit.Password)

    def _do_send_email_code(self):
        """点击发送邮箱验证码"""
        email = self.reg_email_edit.text().strip()
        ok, msg = self.auth._validate_email_format(email)
        if not ok:
            self._show_hint(msg, "error")
            return
        ok, msg, code = self.auth.email_verifier.send_code(email)
        if not ok:
            self._show_hint(msg, "error")
            return
        # 60秒冷却
        self._start_send_cooldown()
        QMessageBox.information(
            self,
            "验证码已发送（开发版模拟）",
            f"📮 已为邮箱：{email}\n\n"
            f"🔢 模拟验证码：<b><span style=\"color:#FF69B4;font-size:22px;\">{code}</span></b>\n\n"
            f"⏱ 有效期 5 分钟 · 60 秒内不可重发\n\n"
            f"<i>提示：正式版本将发送至您的真实邮箱</i>"
        )
        self._show_hint("✅ 验证码已发送，请查收弹窗", "ok")

    def _start_send_cooldown(self):
        self._cooldown_seconds = 60
        self.send_code_btn.setEnabled(False)
        if not self._send_cooldown_timer:
            self._send_cooldown_timer = QTimer(self)
            self._send_cooldown_timer.timeout.connect(self._tick_cooldown)
        self.send_code_btn.setText(f"已发送({self._cooldown_seconds}s)")
        self._send_cooldown_timer.start(1000)

    def _tick_cooldown(self):
        self._cooldown_seconds -= 1
        if self._cooldown_seconds <= 0:
            self.send_code_btn.setEnabled(True)
            self.send_code_btn.setText("发送验证码")
            self._send_cooldown_timer.stop()
        else:
            self.send_code_btn.setText(f"已发送({self._cooldown_seconds}s)")

    def _update_pwd_strength(self, txt):
        """实时更新密码强度条"""
        score = 0
        if len(txt) >= 8: score += 1
        import re as _re
        if _re.search(r'[A-Z]', txt) and _re.search(r'[a-z]', txt): score += 1
        if _re.search(r'\d', txt): score += 1
        if len(txt) >= 12: score = 3
        colors = ["#EF4444", "#F59E0B", "#10B981"]
        texts = ["弱", "中", "强"]
        for i, b in enumerate(self.strength_bars):
            if i < score:
                b.setStyleSheet(f"background:{colors[max(0,score-1)]};border-radius:2px;")
            else:
                b.setStyleSheet("background:#FFE4E1;border-radius:2px;")
        self.strength_text.setText(texts[score - 1] if score > 0 else "")
        self.strength_text.setStyleSheet(f"font-size:11px;color:{colors[max(0,score-1)] if score else '#999'};font-weight:bold;")

    # ---------- 登录提交 ----------
    def _do_login(self):
        email = self.login_email_edit.text().strip()
        pwd = self.login_pwd_edit.text()
        captcha_input = ""
        if not self._login_need_slider:
            captcha_input = getattr(self, 'login_captcha_edit', None)
            captcha_input = captcha_input.text().strip() if captcha_input else ""
        remember = self.login_remember_cb.isChecked()

        ok, msg, token, need_slider = self.auth.login(
            email=email, password=pwd,
            captcha_id=self._login_captcha_id,
            captcha_input=captcha_input,
            remember_me=remember,
            slider_passed=self._login_slider_passed,
        )
        if not ok:
            self._show_hint(msg, "error")
            if need_slider and not self._login_need_slider:
                self._login_need_slider = True
                self._login_slider_passed = False
                self._render_login_captcha_ui()
            else:
                if not self._login_need_slider:
                    self._refresh_login_captcha()
                    self._render_login_captcha_ui()
            return
        user = self.auth.get_current_user()
        self._show_hint("✅ 登录成功，欢迎回来！", "ok")
        QTimer.singleShot(400, lambda: (self.login_success.emit(user or {}), self.accept()))

    # ---------- 注册提交 ----------
    def _do_register(self):
        nickname = self.reg_nick_edit.text()
        email = self.reg_email_edit.text().strip()
        email_code = self.reg_email_code_edit.text().strip()
        pwd = self.reg_pwd_edit.text()
        pwd2 = self.reg_pwd2_edit.text()
        captcha_input = ""
        if not self._register_need_slider:
            captcha_input = getattr(self, 'reg_captcha_edit', None)
            captcha_input = captcha_input.text().strip() if captcha_input else ""

        ok, msg, uid = self.auth.register(
            nickname=nickname, email=email, email_code=email_code,
            password=pwd, confirm_password=pwd2,
            captcha_id=self._reg_captcha_id, captcha_input=captcha_input,
        )
        if not ok:
            self._show_hint(msg, "error")
            # 图形验证码错误连续 3 次升级滑块
            if "图形验证码" in msg:
                self._register_captcha_fail_count += 1
                if self._register_captcha_fail_count >= 3 and not self._register_need_slider:
                    self._register_need_slider = True
                    self._register_slider_passed = False
                    self._render_register_captcha_ui()
                    return
            if not self._register_need_slider:
                self._refresh_register_captcha()
                self._render_register_captcha_ui()
            return
        # 注册成功：自动登录
        login_ok, login_msg, token, _ = self.auth.login(
            email=email, password=pwd,
            captcha_id="SKIP", captcha_input="SKIP",
            remember_me=True, slider_passed=False,
        )
        if not login_ok:
            self._show_hint(f"注册成功，但自动登录失败：{login_msg}，请手动登录", "error")
            self._switch_to_tab(self.LOGIN_TAB)
            return
        user = self.auth.get_current_user()
        self._show_hint("🎉 注册成功！已自动登录", "ok")
        QTimer.singleShot(600, lambda: (self.login_success.emit(user or {}), self.accept()))

    # ====================================================
    #  辅助方法
    # ====================================================
    def _field_label(self, text):
        lbl = QLabel(text)
        lbl.setStyleSheet("font-size:12px;color:#555;font-weight:bold;")
        return lbl

    def _make_lineedit(self, ph, field_type=None):
        le = QLineEdit()
        le.setPlaceholderText(ph)
        le.setMinimumHeight(44)
        prefix = {
            "email": "📧 ",
            "password": "🔒 ",
            "number": "🔢 ",
        }.get(field_type, "")
        if prefix:
            le.setStyleSheet(f"""
                QLineEdit {{
                    padding-left: 38px; background:#FFF;
                    border:1px solid #FFE4E1;border-radius:8px;font-size:14px;color:#333;
                }}
                QLineEdit:focus {{ border:2px solid #FF69B4;background:#FFF9F5; }}
            """)
        else:
            le.setStyleSheet("""
                QLineEdit{padding:0 12px;background:#FFF;border:1px solid #FFE4E1;border-radius:8px;font-size:14px;color:#333;}
                QLineEdit:focus{border:2px solid #FF69B4;background:#FFF9F5;}
            """)
        return le

    def _svg_to_pixmap(self, svg_str: str, w: int, h: int) -> QPixmap:
        """SVG 字符串渲染为 QPixmap（无 QtSvg 时退化为纯文本）"""
        try:
            pix = QPixmap(w, h)
            pix.fill(Qt.white)
            p = QPainter(pix)
            if QSvgRenderer is not None:
                svg_bytes = svg_str.encode("utf-8") if isinstance(svg_str, str) else svg_str
                renderer = QSvgRenderer(svg_bytes)
                renderer.render(p)
            else:
                code = getattr(self, '_current_captcha_code', 'ABCD')
                p.setPen(QColor("#FF1493"))
                p.setFont(QFont("Arial", 20, QFont.Bold))
                p.drawText(pix.rect(), Qt.AlignCenter, code)
            p.end()
            return pix
        except Exception as e:
            logger.warning(f"渲染SVG验证码失败：{e}，退化为纯文本")
            pix = QPixmap(w, h)
            pix.fill(QColor(255, 228, 225))
            p = QPainter(pix)
            p.setPen(QColor("#FF1493"))
            p.setFont(QFont("Arial", 20, QFont.Bold))
            code = getattr(self, '_current_captcha_code', 'ABCD')
            p.drawText(pix.rect(), Qt.AlignCenter, code)
            p.end()
            return pix

    def _show_hint(self, text, level="info"):
        colors = {"ok": "#10B981", "error": "#EF4444", "info": "#6366F1"}
        self.result_hint.setText(text)
        self.result_hint.setStyleSheet(f"font-size:12px;color:{colors.get(level,'#333')};font-weight:bold;")

    # ---------- QSS ----------
    def _global_qss(self):
        return """
            QDialog { background: #FFF9F5; }
        """

    def _primary_btn_qss(self):
        return """
            QPushButton {
                background: qlineargradient(x1:0,y1:0,x2:1,y2:0,
                    stop:0 #FF69B4, stop:1 #FF1493);
                color:white; border:none; border-radius:10px;
                font-size:15px; font-weight:bold;
            }
            QPushButton:hover { background: qlineargradient(x1:0,y1:0,x2:1,y2:0,
                stop:0 #FF1493, stop:1 #C71585); }
            QPushButton:disabled { background: #FFB6C1; }
        """
