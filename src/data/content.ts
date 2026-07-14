// 网站所有内容数据集中管理

export const siteConfig = {
  name: "智能桌面宠物小白",
  shortName: "小白",
  version: "v0.4.28",
  developer: "xushen",
  email: "XSVICYYDS@outlook.com",
  github: "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White",
  githubReleases: "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases",
  description: "小白是一款功能丰富的智能桌面宠物应用。它不仅拥有可爱的桌面宠物形象，还集成了羊了个羊等趣味游戏、桌面管理器、智能画板、文件转换器、计算器、画图、记事本、截图、磁盘清理、放大镜、便签、闹钟等十余款实用工具，同时支持AI智能对话，是您桌面上的全能小助手。",
};

export const stats = [
  { value: 26, suffix: "+", label: "动画效果", icon: "Sparkles" },
  { value: 15, suffix: "款", label: "休闲游戏", icon: "Gamepad2" },
  { value: 10, suffix: "+", label: "实用工具", icon: "Wrench" },
  { value: 45, suffix: "+", label: "功能项", icon: "Layers" },
];

export const highlights = [
  {
    icon: "Dog",
    title: "桌面陪伴",
    description: "26+ 种可爱动画，9种互动方式，3种行为模式，让你的桌面充满生机",
    color: "from-pink-400 to-rose-400",
  },
  {
    icon: "Gamepad2",
    title: "15款游戏",
    description: "羊了个羊、2048、俄罗斯方块、贪吃蛇等经典游戏，闯关与无尽双模式",
    color: "from-purple-400 to-indigo-400",
  },
  {
    icon: "Wrench",
    title: "十余款工具",
    description: "桌面管理器、智能画板、文件转换器、截图工具等一站式效率工具集",
    color: "from-cyan-400 to-blue-400",
  },
  {
    icon: "Brain",
    title: "AI智能助手",
    description: "天气查询、翻译、词典、笑话、名言、文本分析等AI智能工具箱",
    color: "from-emerald-400 to-teal-400",
  },
];

export const petFeatures = [
  { name: "贴贴", description: "增加快乐值，减少能量值" },
  { name: "拍一拍", description: "短暂互动，增加快乐值" },
  { name: "锻炼", description: "增加少量快乐值，减少较多能量值" },
  { name: "充电", description: "同时增加快乐值和能量值" },
  { name: "投喂", description: "增加快乐值和能量值" },
  { name: "吧唧", description: "增加快乐值，不影响能量值" },
  { name: "鸡毛丸子", description: "增加快乐值，减少能量值" },
  { name: "随机出现", description: "小白随机出现在屏幕某处" },
  { name: "遛小鸡毛", description: "增加快乐值，减少能量值" },
];

export const petModes = [
  { name: "自由模式", description: "小白在屏幕上自由活动，随机移动和互动", icon: "Move" },
  { name: "跟随模式", description: "小白跟随鼠标移动，带平滑和预测算法", icon: "MousePointer2" },
  { name: "安静模式", description: "小白静止不动，适合专注工作时段", icon: "BellOff" },
];

export const petAnimations = [
  "normal", "normal2", "eating", "jumping", "kungfu", "biking", "loving",
  "singing", "exercise", "charge", "cake", "baji", "baji2", "stick",
  "call", "appear", "walkdog", "working", "working2", "angry",
  "boring", "crying", "crying2", "hungry", "full", "happynewyear", "megic", "clock",
];

export const games = [
  { name: "羊了个羊", description: "双模式：闯关模式(6关300-600张牌) + 无尽模式", icon: "PawPrint", featured: true },
  { name: "2048", description: "经典数字合并益智游戏", icon: "Grid3x3", featured: true },
  { name: "俄罗斯方块", description: "经典方块消除游戏", icon: "Square", featured: true },
  { name: "贪吃蛇", description: "经典蛇形移动游戏", icon: "Worm", featured: false },
  { name: "五子棋", description: "双人对弈棋类游戏", icon: "Circle", featured: false },
  { name: "华容道", description: "经典滑块解谜游戏", icon: "Puzzle", featured: false },
  { name: "连连看", description: "图案配对消除游戏", icon: "Link", featured: false },
  { name: "扫雷", description: "经典策略推理游戏", icon: "Bomb", featured: false },
  { name: "Pong", description: "经典双人对战球类游戏", icon: "CircleDot", featured: false },
  { name: "推箱子", description: "经典仓库管理推箱子", icon: "Package", featured: false },
  { name: "数独", description: "数字逻辑推理游戏", icon: "Hash", featured: false },
  { name: "坦克大战", description: "经典坦克对战游戏", icon: "Crosshair", featured: false },
  { name: "井字棋", description: "经典三连棋游戏", icon: "Grid", featured: false },
  { name: "打地鼠", description: "反应速度测试游戏", icon: "Hammer", featured: false },
  { name: "消消乐", description: "三消益智游戏", icon: "Candy", featured: false },
];

export const tools = [
  { name: "桌面管理器", description: "文件浏览、搜索、预览、文件操作、系统控制一体化管理", icon: "FolderTree", featured: true },
  { name: "智能画板", description: "多种绘图模式、图层管理、AI辅助绘画功能", icon: "Palette", featured: true },
  { name: "文件格式转换器", description: "支持PDF、Word、图片等多种格式互转", icon: "FileOutput", featured: true },
  { name: "截图工具", description: "矩形区域截屏，自动隐藏宠物窗口", icon: "Camera", featured: false },
  { name: "屏幕笔", description: "在屏幕上自由绘制标注", icon: "PenTool", featured: false },
  { name: "计算器", description: "内置计算器，无需依赖系统组件", icon: "Calculator", featured: false },
  { name: "记事本", description: "内置记事本，快速记录文字", icon: "StickyNote", featured: false },
  { name: "画图工具", description: "内置画图程序，自由创作", icon: "Brush", featured: false },
  { name: "磁盘清理", description: "快速清理系统垃圾文件", icon: "HardDrive", featured: false },
  { name: "放大镜", description: "屏幕放大工具", icon: "ZoomIn", featured: false },
  { name: "便签", description: "桌面便签记录工具", icon: "NotebookPen", featured: false },
  { name: "闹钟", description: "定时提醒闹钟工具", icon: "AlarmClock", featured: false },
];

export const aiTools = [
  { name: "天气查询", description: "实时天气信息查询", icon: "CloudSun" },
  { name: "翻译", description: "多语言翻译工具", icon: "Languages" },
  { name: "词典", description: "在线词典查询", icon: "BookOpen" },
  { name: "笑话", description: "随机笑话推送", icon: "Smile" },
  { name: "名言", description: "每日名言金句", icon: "Quote" },
  { name: "文本分析", description: "智能文本分析工具", icon: "FileText" },
];

export const techStack = [
  { name: "Python", description: "核心开发语言", icon: "Code" },
  { name: "PyQt5", description: "GUI 框架", icon: "Monitor" },
  { name: "PyInstaller", description: "打包工具", icon: "Package" },
  { name: "Inno Setup", description: "安装程序制作", icon: "Settings" },
  { name: "OpenCV", description: "图像处理", icon: "Image" },
  { name: "Tesseract OCR", description: "OCR 识别", icon: "ScanText" },
];

export const timeline = [
  { version: "v0.1.0", date: "2024年初", event: "项目启动，基础桌面宠物功能" },
  { version: "v0.2.0", date: "2024年中", event: "添加游戏模块和工具集成" },
  { version: "v0.3.0", date: "2025年初", event: "集成AI工具箱和安全认证系统" },
  { version: "v0.4.0", date: "2025年中", event: "添加桌面管理器和智能画板" },
  { version: "v0.4.28", date: "2026年", event: "完善羊了个羊双模式、系统工具集成" },
];
