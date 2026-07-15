# PyInstaller打包配置
# 用于将小白桌面宠物打包为单独可执行文件（onefile模式）

# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

# 收集所有必要的模块和依赖
a = Analysis(
    ['main.py'],  # 主入口文件
    pathex=[],  # 搜索路径
    binaries=[
        # 包含GIF文件夹
    ],
    datas=[
        # 包含资源文件
        ('GIF', 'GIF'),  # GIF动画文件
        ('Image', 'Image'),  # 图片资源
    ],
    hiddenimports=[
        # PyQt5相关
        'PyQt5',
        'PyQt5.QtCore',
        'PyQt5.QtGui',
        'PyQt5.QtWidgets',
        'PyQt5.sip',
        # 系统集成
        'winreg',
        'win10toast',
        # 屏幕截图
        'PIL',
        'PIL.ImageGrab',
        # 网络请求
        'requests',
        # Office COM组件
        'win32com',
        'win32com.client',
        'pythoncom',
        'pywintypes',
        # Office文档处理
        'openpyxl',
        'docx',
        'pdf2docx',
        'PyPDF2',
        'reportlab',
        'comtypes',
        # 其他依赖
        'plyer',
        # 游戏模块
        'games',
        'games.snake',
        'games.tetris',
        'games.game2048',
        'games.whackamole',
        'games.minesweeper',
        'games.tictactoe',
        'games.sokoban',
        'games.pong',
        'games.tankbattle',
        'games.gomoku',
        'games.sudoku',
        'games.lianlian',
        'games.xiaoxiaole',
        'games.huarongdao',
        'games.sheep',
        # 功能组件
        'feature_list_component',
        # 通用组件
        'components',
        'components.card_widget',
        'components.toast_notification',
        'components.step_indicator',
        # 'components.draggable_widget',  # 暂时禁用
        'components.image_cropper',
        # 数据模型
        'data_models',
        'data_models.user_model',
        'data_models.usage_logger',
        'data_models.shortcut_config',
        # 个人中心
        'my_center',
        'my_center.user_profile_widget',
        'my_center.account_settings',
        'my_center.usage_history',
        'my_center.password_strength_checker',
        'my_center.my_center_component',
        'my_center.smooth_scroll',
        # 登录/配置向导
        'login_wizard',
        'login_wizard.login_page',
        'login_wizard.config_wizard',
        'login_wizard.quick_access',
        'login_wizard.interactive_guide',
        'login_wizard.login_wizard_dialog',
        # 认证/权限管理模块
        'auth',
        'auth.auth_system',
        'auth.core',
        'auth.core.password_manager',
        'auth.core.jwt_manager',
        'auth.core.captcha_generator',
        'auth.core.rate_limiter',
        'auth.rbac',
        'auth.rbac.models',
        'auth.rbac.permission_manager',
        'auth.rbac.feature_definitions',
        'auth.rbac.decorators',
        'auth.storage',
        'auth.storage.user_storage',
        'auth.security',
        # AI工具箱模块
        'ai_toolbox_dialog',
        'ai_toolbox',
        'ai_toolbox.translation_api',
        'ai_toolbox.weather_api',
        'ai_toolbox.quote_api',
        'ai_toolbox.dictionary_api',
        'ai_toolbox.joke_api',
        'ai_toolbox.text_analysis',
        # 检查更新模块
        'update_checker',
        # 文件格式转换模块
        'file_converter',
        'file_converter_dialog',
        # 桌面管理器模块
        'desktop_manager',
        # 智能画板模块
        'smart_paintboard',
        'layer_dialog',
        # OpenCV和OCR
        'cv2',
        'pytesseract',
        # 系统工具模块
        'system_tools',
        # 宠物模块
        'pet_behavior',
        'ui_components',
        'config',
        'state',
        'system_integration',
        'setup_wizard',
        'help_dialog',
        'screen_pen',
        'screen_capture',
        'input_manager',
        'physics_engine',
        'animation_player',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # 排除不需要的模块
        'tkinter',
        'matplotlib',
        'scipy',
        'pandas',
        'pkg_resources',
        'pygame',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# 创建打包参数
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# 创建单独可执行文件（onefile模式）
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='智能桌面宠物-小白',  # 可执行文件名
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # 不显示控制台窗口
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=r'C:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\应用.ico',  # 应用图标
)
