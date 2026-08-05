/**
 * Playground 功能说明与分类映射数据
 *
 * 为网站上每个游戏 / 工具 / AI 工具提供：
 *  - id：唯一标识（路由段 /playground/:id 也用它）
 *  - category：game / tool / ai
 *  - summary：一句话简短描述（与卡片一致）
 *  - description：详细功能说明（"进入"弹窗展示）
 *  - howTo：使用步骤 / 操作说明
 *  - tips：技巧与亮点
 *  - actions：该卡片支持的动作——enter(进入=看说明，必须 true)、play(试玩，游戏类支持)、try(试用，工具/AI类支持)
 *  - colorScheme：卡片色系（粉色/紫色/青蓝/翠绿等）
 *  - related：桌面端同功能的对应名称（方便后续两端联动）
 *
 * 所有条目合计：15 款游戏 + 12 款工具 + 6 款 AI 工具 = 33 个（与 content.ts 列表一一对应）
 */

export type FeatureCategory = "game" | "tool" | "ai";

export interface FeatureMeta {
  id: string;
  name: string;
  category: FeatureCategory;
  summary: string;
  description: string;
  howTo: string[];
  tips: string[];
  actions: {
    enter: true; // "进入"按钮一定存在（对应查看详细说明）
    play: boolean; // "试玩"：游戏类 true，部分 AI/工具也可以开放（如笑话、名言、计算器等）
    try: boolean; // "试用"：工具 / AI true，部分游戏没有"试用"概念
  };
  /** Tailwind 渐变类（用于顶部色带），可选 */
  colorScheme: string;
  related: string;
}

export const FEATURES: FeatureMeta[] = [
  // ============================================================
  // 🏆 15 款游戏（与 content.ts games 列表一一对应）
  // ============================================================
  {
    id: "game-yanglegeyang",
    name: "羊了个羊",
    category: "game",
    summary: "双模式：闯关模式(6关300-600张牌) + 无尽模式",
    description:
      "小白端自研的经典三消卡牌游戏。采用分层堆叠结构，需要把 3 张相同图案的牌放入底部槽位即可消除；底部槽位最多放 7 张，满了就 Game Over。官方 6 关难度梯度从 300 张牌逐级提升到 600 张；另有无尽模式自动生成关卡，支持一直挑战。",
    howTo: [
      "1. 进入游戏选择「闯关模式」或「无尽模式」",
      "2. 点击卡片 → 只有「最上层且未被遮挡」的卡片才能被点击",
      "3. 卡片被推入底部 7 格槽位，相同图案凑齐 3 张自动消除",
      "4. 使用道具：撤回（把上一张卡推回去）、洗牌（重洗可见牌）、移出（底部 3 张临时移出）",
      "5. 全部消除 = 通关，槽位满 = 失败，可重新开始本关",
    ],
    tips: [
      "优先消除「下层叠更多」的图案，避免早早占满槽位",
      "闯关第 3、4 关开始道具价值很高，省着用在 2 张即可凑齐 3 的关键处",
      "桌面端会根据通关情况给小白加快乐值，网站试玩版也会记录本地最高分",
    ],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-pink-400 to-rose-500",
    related: "羊了个羊小游戏（闯关+无尽双模式）",
  },
  {
    id: "game-2048",
    name: "2048",
    category: "game",
    summary: "经典数字合并益智游戏",
    description:
      "4×4 方格中的数字合并小游戏。方向键/滑动移动方块，相同数字碰撞时合并并翻倍（2→4→8…），合成 2048 即为通关。桌面端支持键盘/鼠标两种操作，并可自动保存最佳分数与已完成步数。",
    howTo: [
      "1. 使用方向键 ↑↓←→ 或手势滑动让所有方块移动",
      "2. 两个相同数字相撞时合并为原来的 2 倍",
      "3. 每移动一次，随机在空格生成 2 或 4",
      "4. 合成 2048 = 通关；所有格子满且无可合并 = Game Over",
    ],
    tips: [
      "核心技巧：把最大数字固定在某一个角落（通常是右下角），其它数字围绕它成蛇形排列",
      "避免让最大数字「被迫移动」，否则很容易死局",
    ],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-amber-400 to-orange-500",
    related: "2048 小游戏",
  },
  {
    id: "game-tetris",
    name: "俄罗斯方块",
    category: "game",
    summary: "经典方块消除游戏",
    description:
      "7 种经典方块（I O T S Z J L）从顶部落下，通过移动、旋转、软降让方块填满整行，满行自动消除并得分。桌面端自带 Next 预览、Hold 槽、多级速度随关卡自动加速。",
    howTo: [
      "← →：左右移动，↑：旋转，↓：软降，空格：硬降",
      "C：Hold 当前方块，下一次再按把 Hold 的方块拿出来",
      "一次消 4 行（Tetris）得分最高；连续消行数叠加 Combo",
    ],
    tips: [
      "不要一味追求速度，先学会预判下一块该放在哪里",
      "保留 I 型方块用来一次性消除 4 行，得分翻倍",
    ],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-indigo-400 to-violet-500",
    related: "俄罗斯方块小游戏",
  },
  {
    id: "game-snake",
    name: "贪吃蛇",
    category: "game",
    summary: "经典蛇形移动游戏",
    description:
      "控制一条会不断变长的蛇，吃到食物后长度+1 并加分；撞墙或撞到自己身体即 Game Over。桌面端支持经典模式、穿墙模式、障碍物模式三种，速度随关卡自动提升。",
    howTo: [
      "方向键控制蛇的前进方向，不能直接反方向",
      "吃到黄色食物身体变长、分数增加；吃到红色奖励食物得 5 倍分",
      "穿墙模式：从左边出去会从右边进来",
    ],
    tips: ['养成「蛇走回字形」的习惯，让蛇身有规律绕圈不容易追尾'],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-emerald-400 to-green-500",
    related: "贪吃蛇小游戏",
  },
  {
    id: "game-gomoku",
    name: "五子棋",
    category: "game",
    summary: "双人对弈棋类游戏",
    description:
      "15×15 棋盘的经典五子连珠。支持双人对战、人机对战（内置简单 AI）、悔棋/重新开始。桌面端会对弈局自动保存成 SGF 风格的步骤记录。",
    howTo: [
      "黑方先行，点击棋盘交叉点落子",
      "先在横/竖/斜任一方向连成 5 子的一方获胜",
      "可随时点「悔棋」撤回上一步，或「重开」重置棋局",
    ],
    tips: ["活三、冲四是基础杀招，学会制造双三/双四必胜"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-neutral-600 to-neutral-800",
    related: "五子棋小游戏",
  },
  {
    id: "game-klotski",
    name: "华容道",
    category: "game",
    summary: "经典滑块解谜游戏",
    description:
      "源自中国古典智力游戏的滑块解谜。目标是让红色 2×2 「曹操」从底部出口逃出。内置经典横刀立马、指挥若定等 6 大开局，并可自由切换关卡难度。桌面端会统计最少步数与当前步数对比。",
    howTo: [
      "1. 空白处只有两块，通过拖动其它方块让「曹操」一步步向下",
      "2. 点击「查看最优步数」可以看到理论最少步数作为参考",
      "3. 支持「悔一步」和「还原开局」两种辅助",
    ],
    tips: ["核心思路：先让张飞/关羽/马超两员 1×2 大将挪到最上或最下，为曹操让出中间通道"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-red-400 to-rose-600",
    related: "华容道小游戏",
  },
  {
    id: "game-lianliankan",
    name: "连连看",
    category: "game",
    summary: "图案配对消除游戏",
    description:
      "同图案点击两张后，如果能用不超过 2 个转折点的路径连接（路径上不能有其它方块阻挡），即可消除。桌面端内置 8 种主题图案（水果/动物/麻将牌等）与时间限制模式。",
    howTo: [
      "点一张卡片 → 再点相同图案卡片 → 若连线转折 ≤ 2 次则消除",
      "卡住时可点「提示」获得一对可消除提示",
      "点「洗牌」在剩余数较多时重排",
    ],
    tips: ['优先消除「卡在中间」的配对，边上的以后总能消除'],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-fuchsia-400 to-pink-500",
    related: "连连看小游戏",
  },
  {
    id: "game-minesweeper",
    name: "扫雷",
    category: "game",
    summary: "经典策略推理游戏",
    description:
      "经典扫雷实现：初级 9×9/10 雷、中级 16×16/40 雷、高级 30×16/99 雷。左键挖格子、右键标旗、中键数字挖周围，带计时器与剩余雷数。桌面端首次点击永远不会踩雷。",
    howTo: [
      "左键：挖格子，是雷=Game Over；不是雷显示周围 8 格里有多少个雷",
      "右键：插旗标记疑似雷，再次右键可取消",
      "中键（或对数字左右双击）：若该数字周围旗数与数字相等，可一次打开剩余未标旗格",
    ],
    tips: ["121 模式、111 模式是必须掌握的入门推理套路"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-sky-400 to-blue-600",
    related: "扫雷小游戏",
  },
  {
    id: "game-pong",
    name: "Pong",
    category: "game",
    summary: "经典双人对战球类游戏",
    description:
      "世界上第一款商用电子游戏的复刻版。两条可上下移动的挡板+一个球，先让球从对方挡板漏出的一方失 1 分，先到 7 分者获胜。桌面端支持人机、双人、锦标赛三种模式。",
    howTo: [
      "1P：W/S 上下；2P：↑↓ 上下；回车开球",
      "球速随接发球次数逐步加快，挡板碰球的不同位置会改变反弹角度",
    ],
    tips: ["守好中线比到处瞎跑更靠谱"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-green-500 to-emerald-600",
    related: "Pong 小游戏",
  },
  {
    id: "game-sokoban",
    name: "推箱子",
    category: "game",
    summary: "经典仓库管理推箱子",
    description:
      "经典推箱子逻辑游戏：在 2D 俯视图中把所有箱子推到目标点。支持多关卡、撤销历史、重置关卡。桌面端内置 20+ 经典关，并可导入自定义关卡文件。",
    howTo: [
      "方向键移动小人，走向箱子的反方向即可把箱子推出去（拉不动，只能推）",
      "箱子只能推不能拉，且一次只能推 1 个",
      "当所有箱子都位于带点方格时通关",
    ],
    tips: ["永远不要把箱子推进死角（紧贴墙的非目标格），否则基本无解；Ctrl+Z 撤销是神键"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-amber-500 to-yellow-700",
    related: "推箱子小游戏",
  },
  {
    id: "game-sudoku",
    name: "数独",
    category: "game",
    summary: "数字逻辑推理游戏",
    description:
      "经典 9×9 数独：每行、每列、每个 3×3 宫都必须填入 1~9 不重复。支持四档难度（简单/中等/困难/专家）、候选数标记、撤销、自动检查。桌面端内置独立的 DLX 求解器。",
    howTo: [
      "先点一个空格 → 选数字填进去",
      "长按数字可作为「候选标记」写入，正式确认时再点数字即可填入",
      "点检查：所有违反规则的格子会高亮红色",
    ],
    tips: ["先看 9 个宫里出现次数多的数字，再延伸看行列排除"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-teal-400 to-cyan-600",
    related: "数独小游戏",
  },
  {
    id: "game-tank",
    name: "坦克大战",
    category: "game",
    summary: "经典坦克对战游戏",
    description:
      "致敬 NES 经典坦克大战的 2D 俯视角射击游戏。保护你家鹰（基地），击毁每关所有敌方坦克通关。支持单人、双人、自建地图 3 模式，共 10 关。",
    howTo: [
      "1P：方向键移动，空格射击；2P：WASD 移动，J 射击",
      "砖墙可破坏，钢墙不可破坏；草丛会让你隐形但不挡子弹",
      "守住右下角/左下角基地，被击中直接 Game Over",
    ],
    tips: ["保护基地比贪分重要；道具：船=过水、铲=钢墙临时保护、时钟=冻结敌方 10 秒"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-lime-500 to-green-700",
    related: "坦克大战小游戏",
  },
  {
    id: "game-ttt",
    name: "井字棋",
    category: "game",
    summary: "经典三连棋游戏",
    description:
      "3×3 三连棋的完整实现：人机对战（Minimax 最优解=永远不会输）、双人对战、战绩统计。每局约 1 分钟，非常适合课间/午休短暂放松。",
    howTo: ["X 先手，轮流在空格中下棋，横/竖/斜任一方向连成 3 颗就胜利"],
    tips: ["先手必胜法：先占中心，对方不走角就赢；对方走角就利用双三逼和或赢"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-slate-500 to-slate-700",
    related: "井字棋小游戏",
  },
  {
    id: "game-whack",
    name: "打地鼠",
    category: "game",
    summary: "反应速度测试游戏",
    description:
      "3×3 / 4×4 的地鼠洞位上，有地鼠/炸弹/金鼠/鸡四种动物随机探出。鼠标点击得分，30 秒挑战最高分。桌面端支持排行榜与难度调节。",
    howTo: [
      "普通地鼠 +10 分，金鼠 +50 分，小鸡 +30 分",
      "炸弹：点到 -20 分并扣 1 条命，3 条命=GG",
      "30 秒时间内尽量刷高分",
    ],
    tips: ["先顾着不打炸弹，其次金鼠优先"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-yellow-400 to-amber-600",
    related: "打地鼠小游戏",
  },
  {
    id: "game-match3",
    name: "消消乐",
    category: "game",
    summary: "三消益智游戏",
    description:
      "经典三消：交换相邻两个糖果，出现 3 个或更多连成一线时消除；4 连生成条纹糖果、5 连生成彩虹糖果，叠加使用有爆炸清屏效果。内置 20+ 关卡目标（分数/步数/收集颜色）。",
    howTo: [
      "拖两个相邻格子交换，必须能形成 ≥3 连才允许交换",
      "步数有限，在步数内达到关卡目标分或目标颜色数量即可通关",
      "条纹×彩虹、彩虹×彩虹是清屏神器",
    ],
    tips: ["尽量在下方交换，上方掉下来的糖果更容易触发连锁爆炸"],
    actions: { enter: true, play: true, try: false },
    colorScheme: "from-rose-400 to-fuchsia-600",
    related: "消消乐小游戏",
  },

  // ============================================================
  // 🛠 12 款工具（与 content.ts tools 列表一一对应）
  // ============================================================
  {
    id: "tool-desktop-manager",
    name: "桌面管理器",
    category: "tool",
    summary: "文件浏览、搜索、预览、文件操作、系统控制一体化管理",
    description:
      "桌面端自研的资源管理器替代品。双栏浏览 + 多标签 + 命令面板 + 内置文件预览（图片/PDF/文本/代码高亮/音视频缩略图）。支持批量重命名、磁盘映射、一键打开命令行、系统级回收站。网站试用版提供类似双栏文件树的仿真界面操作体验。",
    howTo: [
      "左侧导航/右侧文件双栏布局，Ctrl+T 新建标签",
      "顶部搜索框支持按文件名/扩展名/大小/修改时间过滤",
      "选中文件按空格弹出预览，F2 重命名、Delete 丢回收站",
    ],
    tips: ["把常用目录拖到顶部收藏栏，以后一键直达"],
    actions: { enter: true, play: false, try: false }, // 用户指定暂无试用：网站端无法真实访问本地文件系统
    colorScheme: "from-cyan-400 to-sky-600",
    related: "桌面管理器主界面（托盘菜单打开）",
  },
  {
    id: "tool-smart-painter",
    name: "智能画板",
    category: "tool",
    summary: "多种绘图模式、图层管理、AI辅助绘画功能",
    description:
      "小白端功能最强大的独立工具之一：图层管理（Photoshop 风格）+ 10+ 笔刷（铅笔/水彩/马克笔/喷溅/针管笔）+ 钢笔矢量路径 + 选区 + 一键 AI 变线稿 / 变水彩 / 素描。网站试用版提供单图层但同样支持多种笔刷、颜色、橡皮、撤销栈、导出 PNG。",
    howTo: [
      "左侧选笔刷、粗细、颜色，按住鼠标左键在画布上绘图",
      "右键/快捷键 Ctrl+Z 撤销，Ctrl+Y 重做，Ctrl+S 导出 PNG",
      "顶部切换「铅笔 / 水彩 / 马克笔 / 橡皮擦 / 直线 / 矩形 / 圆形」",
    ],
    tips: ["先勾线稿再填色，图层模式能极大提升作品质量（桌面端）"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-violet-400 to-purple-600",
    related: "智能画板独立窗口",
  },
  {
    id: "tool-converter",
    name: "文件格式转换器",
    category: "tool",
    summary: "支持PDF、Word、图片等多种格式互转",
    description:
      "独立的格式转换中心：PDF↔Word、PDF↔图片(JPG/PNG/TIFF)、HEIC→JPG、图片压缩/缩放/旋转/加水印、音视频格式批量转码。网站试用版重点实现「图片 → JPG/PNG/WebP」「缩放/压缩」等浏览器端可做到的在线转换。",
    howTo: [
      "把一个或多个文件拖入虚线框，或点击选择文件",
      "在右侧选「目标格式」和参数（质量/分辨率/DPI）",
      "点「开始转换」→ 进度条跑完 → 点下载/批量下载",
    ],
    tips: ["大文件 / 大量文件（如 >200MB）建议下载桌面端，支持队列和 GPU 加速"],
    actions: { enter: true, play: false, try: false }, // 用户指定暂无试用：依赖本地 ffmpeg/Office 等组件
    colorScheme: "from-sky-400 to-blue-500",
    related: "格式转换器（托盘 → 工具 → 格式转换）",
  },
  {
    id: "tool-screenshot",
    name: "截图工具",
    category: "tool",
    summary: "矩形区域截屏，自动隐藏宠物窗口",
    description:
      "系统全局截图工具。支持矩形区域/全屏/当前窗口/滚动长截图/贴到屏幕；自带画笔/马赛克/文字/箭头标注；截图前自动把小白宠物窗口隐藏（避免挡住内容），结束后自动恢复。网站试用版通过 Canvas 模拟矩形区域截取当前页面。",
    howTo: [
      "托盘菜单 → 截图 或 按快捷键 Ctrl+Alt+A（桌面端）",
      "鼠标按住拖出区域 → 松开即进入标注模式",
      "点工具栏保存 PNG / 复制到剪贴板 / 上传图床",
    ],
    tips: ["桌面端支持 OCR 识别截图文字（需额外安装 Tesseract）"],
    actions: { enter: true, play: false, try: false }, // 用户指定暂无试用：需要系统级截屏权限
    colorScheme: "from-emerald-400 to-teal-600",
    related: "截图工具（Ctrl+Alt+A）",
  },
  {
    id: "tool-screenpen",
    name: "屏幕笔",
    category: "tool",
    summary: "在屏幕上自由绘制标注",
    description:
      "把整台屏幕变成一张画板：可任意颜色/粗细书写，支持箭头、矩形、圆圈、文字、激光笔、聚光灯、清空。讲解 PPT / 直播 / 远程协作必备。网站试用版同样提供「半透明黑色蒙层+绘制」的仿真体验。",
    howTo: [
      "托盘菜单 → 屏幕笔，屏幕变灰半透明蒙层",
      "鼠标左键绘制，左键+Shift 画直线，滚轮调粗细",
      "1/2/3/4 快捷切颜色，Esc 退出并清空",
    ],
    tips: ["配合聚光灯（快捷键 L）演示效果更惊艳"],
    actions: { enter: true, play: false, try: false }, // 用户指定暂无试用：需要系统级全局透明层
    colorScheme: "from-yellow-400 to-orange-500",
    related: "屏幕笔工具",
  },
  {
    id: "tool-calculator",
    name: "计算器",
    category: "tool",
    summary: "内置计算器，无需依赖系统组件",
    description:
      "标准型 + 科学型 + 程序员型三种模式。支持表达式历史、单位换算（长度/重量/货币）、常量 π e 黄金分割比、函数 sin/cos/tan/log/^。网站试用版实现标准+科学一体。",
    howTo: [
      "点击数字和运算符按顺序输入表达式",
      "「=」或回车得出结果，Ans 可以把上一次结果作为操作数",
      "切换到科学模式可直接点 sin/cos/tan/log/√/阶乘等",
    ],
    tips: ["桌面端可按=后按 ↑↓ 浏览历史结果"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-orange-400 to-red-500",
    related: "计算器",
  },
  {
    id: "tool-notepad",
    name: "记事本",
    category: "tool",
    summary: "内置记事本，快速记录文字",
    description:
      "多标签记事本，支持 Markdown 预览、搜索替换、自动保存、最近文件、深色主题、字数/行数/字符数统计。桌面端可直接挂载为小白托盘的「便签」数据来源。",
    howTo: [
      "Ctrl+N 新建标签，Ctrl+S 保存，Ctrl+F 查找",
      "左下实时显示行/列、字数、字符数",
      "切到「预览」标签可实时查看 Markdown 渲染效果",
    ],
    tips: ["桌面端自动保存间隔默认 30 秒，可在设置里缩短到 10 秒"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-stone-400 to-stone-600",
    related: "记事本",
  },
  {
    id: "tool-draw",
    name: "画图工具",
    category: "tool",
    summary: "内置画图程序，自由创作",
    description:
      "复古风格的简易画图：铅笔/刷子/喷枪/橡皮擦/油漆桶/直线/矩形/椭圆/多边形/文字/取色。支持多画布尺寸与 BMP/PNG/JPG 输出。",
    howTo: [
      "左侧选工具，顶部选颜色和粗细，在画布上绘画",
      "油漆桶在封闭区域填充，取色能把画面里的颜色秒取到当前色板",
      "Ctrl+Z 撤销、Ctrl+E 调画布尺寸、Ctrl+W 水平/垂直翻转",
    ],
    tips: ["需要更高级功能（图层/AI辅助）请切到【智能画板】"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-pink-400 to-rose-600",
    related: "画图工具",
  },
  {
    id: "tool-disk-clean",
    name: "磁盘清理",
    category: "tool",
    summary: "快速清理系统垃圾文件",
    description:
      "Windows 常用位置的一键垃圾清理：临时文件、回收站、缩略图缓存、浏览器缓存、Windows Update 旧文件、日志等。带扫描预览、可手动勾选要删除项，避免误删。网站试用版用模拟数据让您感受操作流程。",
    howTo: [
      "点「扫描」列出所有检测到的垃圾类型及预估空间",
      "勾选想清理的项（默认已给安全推荐）",
      "点「清理」会弹出二次确认，确认后执行",
    ],
    tips: ["第一次使用时建议先「只扫描不清理」，确认清单再执行；大文件清理单独有高级模式"],
    actions: { enter: true, play: false, try: false }, // 用户指定暂无试用：需要操作真实系统磁盘
    colorScheme: "from-blue-400 to-indigo-600",
    related: "磁盘清理工具",
  },
  {
    id: "tool-magnifier",
    name: "放大镜",
    category: "tool",
    summary: "屏幕放大工具",
    description:
      "独立的屏幕放大镜：全屏放大 / 跟随鼠标的圆形透镜 / 固定区域三种模式；2x/3x/4x/6x/8x 倍率切换，支持十字准星与像素网格，做精细设计/看小字/弱视友好。",
    howTo: [
      "托盘打开放大镜 → 默认透镜模式跟随鼠标",
      "Ctrl + 滚轮 实时调整倍率",
      "C 切换全屏/透镜/固定区域三种形态",
    ],
    tips: ["桌面端固定区域模式在修像素图时特别好用"],
    actions: { enter: true, play: false, try: false }, // 用户指定暂无试用：需要系统级屏幕像素捕获
    colorScheme: "from-teal-400 to-emerald-600",
    related: "放大镜工具",
  },
  {
    id: "tool-sticky",
    name: "便签",
    category: "tool",
    summary: "桌面便签记录工具",
    description:
      "彩色便签：多张独立悬浮便签，每张可设背景色（9 色）、字体大小/颜色、置顶、透明度、闹钟提醒。开机自启、数据自动保存在本机 JSON。",
    howTo: [
      "托盘 → 新建便签 生成一张新便签",
      "直接书写文字，右上角可换色/置顶/加提醒/删除",
      "提醒到时弹出通知，还能一键关联小白说句话",
    ],
    tips: ["桌面端便签和记事本是打通的：可把便签内容一键保存为 txt/md 文件"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-yellow-300 to-amber-500",
    related: "便签（桌面悬浮）",
  },
  {
    id: "tool-alarm",
    name: "闹钟",
    category: "tool",
    summary: "定时提醒闹钟工具",
    description:
      "多闹钟 + 倒计时 + 番茄钟三合一。支持重复周期（每天/工作日/指定星期）、渐变铃声、贪睡、语音播报时间、到点让小白表演一段动画。网站试用版实现闹钟列表创建/启停、倒计时、番茄钟。",
    howTo: [
      "点「+」新建闹钟：选择时间、重复星期、铃声",
      "倒计时面板输入时:分:秒 → 开始",
      "番茄钟：25 分钟工作 + 5 分钟休息，4 个循环后长休息 15 分钟",
    ],
    tips: ["番茄钟结束后会让小白跳「开心」动画并说「今天你已经专注 N 分钟啦」"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-red-400 to-pink-600",
    related: "闹钟工具",
  },

  // ============================================================
  // 🤖 6 款 AI 工具（与 content.ts aiTools 列表一一对应）
  // ============================================================
  {
    id: "ai-weather",
    name: "天气查询",
    category: "ai",
    summary: "实时天气信息查询",
    description:
      "集成公开天气 API 的中文天气查询：输入城市名即可获取温度、体感温度、湿度、风向、空气质量、未来 7 日预报、生活指数（穿衣/紫外线/洗车等）。桌面端支持默认城市绑定与系统托盘直接展示天气图标。",
    howTo: [
      "输入框填北京/上海/杭州等中文城市名，回车或点查询",
      "页面显示实时天气+7日折线图+空气指数",
      "桌面端可在设置里绑定默认城市，托盘图标直接显示温度",
    ],
    tips: ["支持查询到区县级别；需要更精确请在桌面端开启定位"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-sky-400 to-blue-500",
    related: "AI工具箱 - 天气查询",
  },
  {
    id: "ai-translate",
    name: "翻译",
    category: "ai",
    summary: "多语言翻译工具",
    description:
      "多语种双向翻译：中英日韩法德西俄等 10+ 语言，支持复制结果、历史记录、发音朗读。桌面端还可全局划词翻译（选中文本按 Ctrl+Q 自动弹出译文气泡）。",
    howTo: [
      "在左侧输入文本 → 上方选择源语言/目标语言（或自动检测）",
      "点「翻译」按钮得出结果，喇叭图标可朗读",
      "历史记录自动保存 50 条",
    ],
    tips: ["划词翻译需要桌面端启用「系统级快捷键」权限"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-indigo-400 to-violet-600",
    related: "AI工具箱 - 翻译",
  },
  {
    id: "ai-dict",
    name: "词典",
    category: "ai",
    summary: "在线词典查询",
    description:
      "中英双语词典：查单词时给出音标、英/美式发音、词形变化、例句、同义词、反义词、柯林斯等级。桌面端可划词查词，且能一键把查询词加入小白专属生词本。",
    howTo: [
      "输入一个中英文单词 → 回车查询",
      "点发音喇叭听读；「加入生词本」在桌面端可直接使用",
      "历史记录可一键清空或导出",
    ],
    tips: ["生词本里的词会在每天 21:00 由小白随机在桌面弹出复习提醒"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-emerald-400 to-green-600",
    related: "AI工具箱 - 词典",
  },
  {
    id: "ai-joke",
    name: "笑话",
    category: "ai",
    summary: "随机笑话推送",
    description:
      "内置上千条中文冷笑话、段子、脑筋急转弯、幽默语录。点击换一个就随机抽一条，桌面端还会让小白念给你听。支持点赞/拉黑，点赞过的笑话会出现在你的「段子本」里。",
    howTo: ["点「换一个」抽新笑话，喜欢就点❤️收藏，不喜欢就点👎下次尽量不再出现"],
    tips: ["桌面端每天 10:00 / 15:00 两个时段，小白有概率主动蹦出来给你讲一条"],
    actions: { enter: true, play: true, try: true },
    colorScheme: "from-amber-400 to-yellow-600",
    related: "AI工具箱 - 笑话",
  },
  {
    id: "ai-quote",
    name: "名言",
    category: "ai",
    summary: "每日名言金句",
    description:
      "励志名言 / 诗词名句 / 名人语录的每日金句。桌面端支持开机弹窗、每 2 小时在托盘提示一次、设置为桌面壁纸文字水印。网站试用版提供名言抽取、分类、分享。",
    howTo: [
      "点「今日一句」自动按日期生成稳定的一条",
      "点「随机一条」换随机",
      "点分享 → 自动生成卡片图可保存 PNG",
    ],
    tips: ["桌面端可把名言字体配置为你喜欢的字体和颜色"],
    actions: { enter: true, play: true, try: true },
    colorScheme: "from-rose-400 to-red-500",
    related: "AI工具箱 - 名言金句",
  },
  {
    id: "ai-text-analysis",
    name: "文本分析",
    category: "ai",
    summary: "智能文本分析工具",
    description:
      "粘贴一段文本，帮你做：字符/字数/段落/行数统计、关键词抽取、情感倾向（正负中）、常用词词云、自动生成摘要。桌面端额外提供长文 PDF/Word 导入。",
    howTo: [
      "把文本粘贴到输入框，或点「示例」加载一段样例",
      "点「开始分析」看左侧统计 + 中间关键词 Top10 + 右侧情感分布",
      "桌面端支持把报告导出为 PDF / HTML",
    ],
    tips: ["长文本建议在桌面端处理；网站端为了体验建议 ≤ 10000 字"],
    actions: { enter: true, play: false, try: true },
    colorScheme: "from-fuchsia-400 to-pink-600",
    related: "AI工具箱 - 文本分析",
  },
];

export function findFeature(id: string | undefined): FeatureMeta | undefined {
  if (!id) return undefined;
  return FEATURES.find((f) => f.id === id);
}

export function findFeatureByName(name: string): FeatureMeta | undefined {
  return FEATURES.find((f) => f.name === name);
}
