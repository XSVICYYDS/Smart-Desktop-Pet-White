# -*- mode: python ; coding: utf-8 -*-
"""
macOS 版 PyInstaller 打包配置
--------------------------------
生成产物：
  dist/
    智能桌面宠物-小白.app   -> 可直接双击运行的 App Bundle
    智能桌面宠物-小白       -> onefile 的 CLI 可执行（一般用不到）

使用方式（在 macOS 终端执行）：
  1) 先安装依赖：python3 -m pip install -r requirements.txt pyinstaller
  2) 打包：      pyinstaller 小白-macOS.spec --clean --noconfirm
  3) 制作 dmg：  bash ../scripts/build_macos.sh  (可选)

注意：
  - 本文件里已经去掉 Windows 专属模块（winreg / win32com 等）。
  - 若你没有 Apple 开发者证书，App 运行时会出现「无法打开」提示：
    首次使用请右键 → 打开（并在 系统设置 → 隐私与安全性 中允许运行），
    或用 xattr -rd com.apple.quarantine /Applications/智能桌面宠物-小白.app 解除隔离。
"""

import os
import sys

APP_NAME = "智能桌面宠物-小白"
VERSION = os.environ.get("XIAOBAI_VERSION", "0.6.0")
BUNDLE_ID = os.environ.get("XIAOBAI_BUNDLE_ID", "com.xushen.smartpet.xiaobai")
# 如无 .icns，传空字符串即可；build_macos.sh 会尝试用 1024x1024 PNG 自动生成
ICON_ICNS = os.environ.get("XIAOBAI_ICON_ICNS", "")
# 开发者证书名称，没有就留空，走 ad-hoc 签名（codesign -s -）
CODESIGN_ID = os.environ.get("XIAOBAI_CODESIGN_ID", "")

block_cipher = None


def _abs(path):
    """
    把相对路径转成 .spec 文件所在目录下的绝对路径
    （解决从其它目录调用 pyinstaller 时资源找不到的问题）
    """
    here = os.path.abspath(os.path.dirname(SPEC))
    return os.path.join(here, path)


# 只保留跨平台可用的 hiddenimports；Windows 专属模块一律剔除
HIDDEN_IMPORTS = [
    # PyQt5 跨平台核心
    "PyQt5",
    "PyQt5.QtCore",
    "PyQt5.QtGui",
    "PyQt5.QtWidgets",
    "PyQt5.sip",
    "PyQt5.QtSvg",
    # 屏幕截图 / 图像处理
    "PIL",
    "PIL.ImageGrab",
    "PIL.Image",
    # 网络
    "requests",
    # Office 纯 Python 实现（macOS 下也能读写 xlsx/docx/pdf）
    "openpyxl",
    "docx",
    "pdf2docx",
    "PyPDF2",
    "reportlab",
    # 通知/系统交互（跨平台）
    "plyer",
    # 游戏模块
    "games",
    "games.snake",
    "games.tetris",
    "games.game2048",
    "games.whackamole",
    "games.minesweeper",
    "games.tictactoe",
    "games.sokoban",
    "games.pong",
    "games.tankbattle",
    "games.gomoku",
    "games.sudoku",
    "games.lianlian",
    "games.xiaoxiaole",
    "games.huarongdao",
    "games.sheep",
    # 功能组件
    "feature_list_component",
    # 数据模型
    "data_models",
    "data_models.user_model",
    "data_models.usage_logger",
    "data_models.shortcut_config",
    # 个人中心
    "my_center",
    "my_center.user_profile_widget",
    "my_center.account_settings",
    "my_center.usage_history",
    "my_center.password_strength_checker",
    "my_center.my_center_component",
    "my_center.smooth_scroll",
    # 登录/配置向导
    "login_wizard",
    "login_wizard.login_page",
    "login_wizard.config_wizard",
    "login_wizard.quick_access",
    "login_wizard.interactive_guide",
    "login_wizard.login_wizard_dialog",
    "login_wizard.login_register_dialog",
    # 认证/权限
    "auth",
    "auth.auth_system",
    "auth.core",
    "auth.core.password_manager",
    "auth.core.jwt_manager",
    "auth.core.captcha_generator",
    "auth.core.rate_limiter",
    "auth.core.email_verifier",
    "auth.core.session_manager",
    "auth.rbac",
    "auth.rbac.models",
    "auth.rbac.permission_manager",
    "auth.rbac.feature_definitions",
    "auth.rbac.decorators",
    "auth.storage",
    "auth.storage.user_storage",
    "auth.storage.permission_storage",
    "auth.storage.audit_log_storage",
    "auth.storage.session_storage",
    "auth.security",
    # 通用组件
    "components",
    "components.card_widget",
    "components.toast_notification",
    "components.step_indicator",
    "components.image_cropper",
    "components.slider_captcha_widget",
    # AI 工具箱
    "ai_toolbox_dialog",
    "ai_toolbox",
    "ai_toolbox.translation_api",
    "ai_toolbox.weather_api",
    "ai_toolbox.quote_api",
    "ai_toolbox.dictionary_api",
    "ai_toolbox.joke_api",
    "ai_toolbox.text_analysis",
    # 其它核心模块（跨平台）
    "update_checker",
    "file_converter",
    "file_converter_dialog",
    "desktop_manager",
    "smart_paintboard",
    "layer_dialog",
    "cv2",
    "pytesseract",
    "system_tools",
    "pet_behavior",
    "ui_components",
    "config",
    "state",
    "system_integration",
    "setup_wizard",
    "help_dialog",
    "screen_pen",
    "screen_capture",
    "input_manager",
    "physics_engine",
    "animation_player",
]


a = Analysis(
    ["main.py"],
    pathex=[_abs(".")],
    binaries=[],
    datas=[
        (_abs("GIF"), "GIF"),
        (_abs("Image"), "Image"),
        (_abs("license.txt"), "."),
    ],
    hiddenimports=HIDDEN_IMPORTS,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "matplotlib",
        "scipy",
        "pandas",
        "pkg_resources",
        "pygame",
        # Windows 专属模块，macOS 下不收集
        "winreg",
        "win32com",
        "win10toast",
        "pythoncom",
        "pywintypes",
        "comtypes",
    ],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name=APP_NAME,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # macOS 上 upx 容易触发 Gatekeeper 误报，默认关闭
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=(CODESIGN_ID if CODESIGN_ID else None),
    entitlements_file=None,
    icon=(ICON_ICNS if ICON_ICNS and os.path.exists(ICON_ICNS) else None),
)

# macOS App Bundle
app = BUNDLE(
    exe,
    name=f"{APP_NAME}.app",
    icon=(ICON_ICNS if ICON_ICNS and os.path.exists(ICON_ICNS) else None),
    bundle_identifier=BUNDLE_ID,
    info_plist={
        "CFBundleName": APP_NAME,
        "CFBundleDisplayName": APP_NAME,
        "CFBundleShortVersionString": VERSION,
        "CFBundleVersion": VERSION,
        "CFBundleExecutable": APP_NAME,
        "CFBundleIdentifier": BUNDLE_ID,
        "CFBundlePackageType": "APPL",
        "CFBundleIconFile": "AppIcon.icns",
        "CFBundleSupportedPlatforms": ["MacOSX"],
        "LSMinimumSystemVersion": "11.0",  # macOS Big Sur 及以上
        # 不显示 Dock 图标？小白是桌面宠物，也可改为 true 让它只在菜单栏跑；
        # 但我们有许多设置/游戏弹窗，所以保持 false，让 Dock 有图标方便切换。
        "LSUIElement": False,
        "LSApplicationCategoryType": "public.app-category.entertainment",
        "NSHighResolutionCapable": True,
        "NSRequiresAquaSystemAppearance": False,  # 兼容深色模式
        "NSAppTransportSecurity": {
            "NSAllowsArbitraryLoads": True,  # 天气 / 翻译 / 检查更新 都需要网络
        },
        "NSHumanReadableCopyright": "© 尚志中学809班徐慎 · GitHub @XSVICYYDS",
        "NSPrincipalClass": "NSApplication",
        "NSMainStoryboardFile": "",  # 纯 PyQt，不依赖 Storyboard
    },
)
