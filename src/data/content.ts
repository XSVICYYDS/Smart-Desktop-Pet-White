// 网站所有内容数据集中管理

export const siteConfig = {
  name: "智能桌面宠物小白",
  shortName: "小白",
  version: "v0.5.0",
  developer: "XSVICYYDS",
  email: "XSVICYYDS@outlook.com",
  github: "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White",
  githubReleases: "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases",
  githubReleaseLatest: "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/tag/v0.5.0",
  installerUrl: "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/download/v0.5.0/Smart-Desktop-Pet-White-Setup-0.5.0.exe",
  portableUrl: "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/download/v0.5.0/Smart-Desktop-Pet-White-Portable-0.5.0.exe",
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
  { name: "飞机大战", description: "经典纵向卷轴射击游戏", icon: "Plane", featured: true },
  { name: "打砖块", description: "经典弹球打砖块游戏", icon: "Square", featured: false },
  { name: "Flappy Bird", description: "像素鸟穿越管道", icon: "Bird", featured: true },
  { name: "贪吃蛇大作战", description: "多AI蛇对战，抢食物变长", icon: "Worm", featured: false },
  { name: "弹球台", description: "弹球碰撞钉子得分", icon: "CircleDot", featured: false },
  { name: "记忆翻牌", description: "翻牌配对记忆游戏", icon: "Layers", featured: false },
  { name: "数字猜猜猜", description: "猜数字逻辑游戏", icon: "Hash", featured: false },
  { name: "太空侵略者", description: "经典外星人射击游戏", icon: "Rocket", featured: true },
  { name: "弹球消砖", description: "物理弹球消除砖块", icon: "Circle", featured: false },
  { name: "青蛙过河", description: "经典青蛙过河游戏", icon: "Frog", featured: false },
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
  { version: "v0.4.43", date: "2026年7月", event: "新增检查更新功能、帮助界面美化、AI文本分析升级、官方网站发布" },
  { version: "v0.5.0", date: "2026年7月", event: "全新登录注册模块、邮箱验证码+滑块验证、会话持久化、云同步入口、托盘菜单动态刷新" },
];

/* ================== 下载页补充数据：校验和 / 系统要求详细版 / 更新日志 ================== */
export interface ChecksumItem {
  asset: "installer" | "portable" | "macos";
  fileName: string;
  size: string;
  /** 占位：实际在 GitHub Release 页面附随 sha256sums.txt；用户发布新版本后更新即可 */
  sha256: string;
  /** 点击下载按钮跳转的地址（macOS 没有本地 counter，直接跳 Releases 即可） */
  href?: string;
}
export const releaseChecksums: ChecksumItem[] = [
  {
    asset: "installer",
    fileName: "Smart-Desktop-Pet-White-Setup-0.6.0.exe",
    size: "约 141 MB",
    sha256: "（发布新版本时，把 Setup.exe 生成的 SHA256 粘贴到这里）",
  },
  {
    asset: "portable",
    fileName: "Smart-Desktop-Pet-White-Portable-0.6.0.exe",
    size: "约 140 MB",
    sha256: "（发布新版本时，把 Portable.exe 生成的 SHA256 粘贴到这里）",
  },
  {
    asset: "macos",
    fileName: "智能桌面宠物-小白-0.6.0-macOS.dmg",
    size: "约 180 MB（含 macOS 版 Qt 框架）",
    sha256: "（运行 bash scripts/build_macos.sh 后会自动打印并保存为 *.sha256，粘贴到这里）",
    // GitHub Actions 打 v* Tag 后会自动上传到对应 Release
    href: siteConfig.githubReleases,
  },
];

export interface SystemReqRow {
  category: string;
  minimum: string;
  recommended: string;
  icon: "MonitorCog" | "Cpu" | "MemoryStick" | "HardDrive" | "Monitor" | "Globe";
}
export const systemRequirements: SystemReqRow[] = [
  {
    category: "操作系统",
    minimum: "Windows 10 1809+ (64 位)  ｜  macOS Big Sur 11.0+ (Intel / Apple Silicon)",
    recommended: "Windows 11 22H2+ (64 位)  ｜  macOS Sonoma 14+ (Apple Silicon 推荐)",
    icon: "MonitorCog",
  },
  { category: "处理器", minimum: "双核 1.6 GHz+（支持 SSE2 / Intel 或 Apple M1 同等级）", recommended: "四核 2.4 GHz+（Intel Core i5 / Apple M1 及以上）", icon: "Cpu" },
  { category: "内存", minimum: "2 GB RAM", recommended: "4 GB+ RAM", icon: "MemoryStick" },
  { category: "存储空间", minimum: "Windows 200 MB+ 可用 ｜ macOS 250 MB+ 可用（安装包 + 运行时）", recommended: "500 MB+ 可用（存放便签、画板、截图等数据）", icon: "HardDrive" },
  { category: "屏幕分辨率", minimum: "1366 × 768", recommended: "1920 × 1080 及以上 ｜ MacBook 原生 Retina 分辨率", icon: "Monitor" },
  { category: "网络", minimum: "可选（用于云同步、检查更新、AI 工具）", recommended: "稳定宽带/Wi-Fi，用于云同步和自动更新", icon: "Globe" },
];

export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}
export const changelog: ChangelogEntry[] = [
  {
    version: "v0.5.0",
    date: "2026年7月",
    highlights: [
      "全新登录/注册模块：邮箱验证码 + 图形码 + 滑块三级验证，注册后自动登录",
      "新增会话持久化：关闭浏览器/软件后下次自动保持登录状态",
      "托盘菜单动态刷新：登录/登出/同步操作后菜单立即同步刷新",
      "官方网站发布：社交中心、管理员控制台、数据同步预览、功能热度榜单",
    ],
  },
  {
    version: "v0.4.43",
    date: "2026年7月",
    highlights: [
      "新增检查更新：自动检测 GitHub Releases 最新版本并弹框提示",
      "帮助界面全面美化，带搜索和分章节导航",
      "AI 文本分析升级：关键词提取、情感倾向、字数统计、可读性评分",
      "官方网站首版：首页 / 功能详情 / 下载 / 关于 四大页",
    ],
  },
  {
    version: "v0.4.28",
    date: "2026年",
    highlights: [
      "羊了个羊新增「闯关 + 无尽」双模式，难度曲线更平滑",
      "系统工具集成：磁盘清理、放大镜、便签、闹钟四大工具",
      "托盘右键菜单二级分类：游戏 / 工具 / AI 分类查找",
    ],
  },
];

/* 关于页 FAQ（后续折叠面板用） */
export interface FaqItem {
  q: string;
  a: string;
}
export const faqs: FaqItem[] = [
  {
    q: "小白支持哪些系统？目前只做 Windows 吗？",
    a: "当前 v0.x 系列仅支持 Windows 10/11 64 位。后续 v1.0 规划阶段会评估 macOS 和 Linux 发行版（Ubuntu/Debian/Arch）的移植可行性，进度请关注 GitHub Releases。",
  },
  {
    q: "小白会不会收集我的个人数据？",
    a: "桌面端默认在本地运行，所有便签、截图、记事本、画板等数据都保存在本机用户目录（AppData/Roaming）中，不上传任何服务器。云同步（预览版）仅在你主动登录账号并点击「同步数据」时触发，且加密传输。",
  },
  {
    q: "小白为什么报毒？是安全的吗？",
    a: "小白由 PyInstaller 打包并使用 Inno Setup 制作安装包，由于暂未做 EV 代码签名，部分杀毒软件可能误报。可校验下载页附带的 SHA256 指纹与 GitHub Releases 上提供的 sha256sums.txt 一致后再安装。如果你有顾虑，也可以从源码自行打包。",
  },
  {
    q: "安装版和便携版怎么选？",
    a: "多数用户推荐「安装版」：会创建开始菜单、桌面快捷方式，并在「应用和功能」里提供一键卸载。「便携版」适合想把小白放到 U 盘或随身硬盘、免安装即用的场景。两者功能一致，数据目录相同。",
  },
  {
    q: "如何卸载小白？会残留数据吗？",
    a: "安装版：从「设置 - 应用」或开始菜单快捷方式里卸载，卸载程序会清理可执行文件。用户数据（便签、截图、配置、画板等）默认保留，如需彻底删除可手动删除 %AppData%\\Smart-Desktop-Pet-White\\ 目录。便携版直接删除解压目录即可。",
  },
  {
    q: "如何参与贡献？",
    a: "欢迎 Star、提 Issue、发起 PR。前端官网在 Smart-Desktop-Pet-White 子仓库（React + Vite + Tailwind），桌面端主仓库使用 Python + PyQt5。在 GitHub 上找到对应仓库后，PR 通过 CI 即可合入。",
  },
];
