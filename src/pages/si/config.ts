/** 游戏常量配置中心：敌人/技能/关卡/成就集中管理（平衡性调参只改这里）。 */
import type { Achievement, BossKind, EnemyKind, LevelClearResult, SkillDefinition } from "./types";

export const WORLD = {
  WIDTH: 1080,
  HEIGHT: 1440, // 9:12 纵向画布，CSS aspect-ratio 决定最终观感
  LOGICAL_H: 1440,
  PLAYER_Y: 1340,
  PLAYER_W: 84,
  PLAYER_H: 72,
  BULLET_W: 8,
  BULLET_H: 24,
  ENEMY_BASE_W: 64,
  ENEMY_BASE_H: 52,
} as const;

export const BALANCE = {
  BASE_HP: 100,
  BASE_ENERGY: 100,
  ENERGY_REGEN_PER_SEC: 6, // /s
  FIRE_INTERVAL_MS: 180, // 主武器开火 CD
  PLAYER_BASE_SPEED: 540, // px/sec（逻辑坐标系）
  PLAYER_BULLET_SPEED: 1040,
  PLAYER_BULLET_DMG: 10,
  DYNAMIC_SPEED_MAX: 1.20,
  DYNAMIC_SPEED_MIN: 0.80,
  DYNAMIC_HP_MAX: 1.30,
  DYNAMIC_HP_MIN: 0.70,
  DYNAMIC_FREQ_MAX: 1.25,
  DYNAMIC_FREQ_MIN: 0.75,
  PROTECTION_HP_PCT: 0.35, // 血量 <35% 触发保护（自动 -20% 难度）
} as const;

export const ENEMY_STATS: Record<EnemyKind, { name: string; hp: number; speed: number; fireMs: number; dmg: number; score: number; color: string; accent: string }> = {
  0: { name: "普通兵", hp: 20, speed: 60,  fireMs: 2600, dmg: 8,  score: 10, color: "#22d3ee", accent: "#0e7490" },
  1: { name: "快速兵", hp: 14, speed: 120, fireMs: 2200, dmg: 8,  score: 15, color: "#34d399", accent: "#047857" },
  2: { name: "重装兵", hp: 60, speed: 32,  fireMs: 3000, dmg: 12, score: 30, color: "#a78bfa", accent: "#5b21b6" },
  3: { name: "分裂兵", hp: 30, speed: 54,  fireMs: 2600, dmg: 10, score: 25, color: "#f472b6", accent: "#9d174d" },
  4: { name: "护盾兵", hp: 30, speed: 48,  fireMs: 2800, dmg: 10, score: 28, color: "#60a5fa", accent: "#1d4ed8" },
  5: { name: "狙击手", hp: 24, speed: 40,  fireMs: 2400, dmg: 18, score: 22, color: "#facc15", accent: "#a16207" },
  6: { name: "激光兵", hp: 28, speed: 56,  fireMs: 2000, dmg: 14, score: 32, color: "#fb7185", accent: "#9f1239" },
  7: { name: "冲锋兵", hp: 36, speed: 180, fireMs: 3200, dmg: 20, score: 40, color: "#f97316", accent: "#9a3412" },
  8: { name: "治疗兵", hp: 40, speed: 44,  fireMs: 3000, dmg: 6,  score: 50, color: "#2dd4bf", accent: "#0f766e" },
};

export const SKILLS: Record<string, SkillDefinition> = {
  s1_nuke: {
    id: "s1_nuke", name: "全屏攻击", icon: "💥", isActive: true,
    desc: "清除屏幕内所有普通敌人，对 BOSS 造成 50%+ 伤害（视等级额外+）。",
    levels: [
      { energyCost: 100, cooldownMs: 60_000, valuePct: 0.50 },
      { energyCost: 100, cooldownMs: 52_500, valuePct: 0.65 },
      { energyCost: 100, cooldownMs: 46_200, valuePct: 0.80 },
      { energyCost: 100, cooldownMs: 40_500, valuePct: 0.95 },
    ],
  },
  s2_shield: {
    id: "s2_shield", name: "护盾防御", icon: "🛡️", isActive: true,
    desc: "生成防护屏障，10s 内可抵挡 N 次敌方攻击。",
    levels: [
      { energyCost: 75, cooldownMs: 45_000, durationMs: 10_000, valuePct: 5 },
      { energyCost: 75, cooldownMs: 39_375, durationMs: 11_500, valuePct: 6 },
      { energyCost: 75, cooldownMs: 34_500, durationMs: 13_000, valuePct: 7 },
      { energyCost: 75, cooldownMs: 30_200, durationMs: 14_500, valuePct: 8 },
    ],
  },
  s3_haste: {
    id: "s3_haste", name: "速度提升", icon: "⚡", isActive: true,
    desc: "玩家移动速度提升 150%+，持续 15s（等级越高持续越久）。",
    levels: [
      { energyCost: 50, cooldownMs: 30_000, durationMs: 15_000, valuePct: 1.50 },
      { energyCost: 50, cooldownMs: 26_250, durationMs: 17_000, valuePct: 1.67 },
      { energyCost: 50, cooldownMs: 22_950, durationMs: 19_000, valuePct: 1.85 },
      { energyCost: 50, cooldownMs: 20_100, durationMs: 21_000, valuePct: 2.00 },
    ],
  },
  p1_power: {
    id: "p1_power", name: "攻击强化", icon: "🔫", isActive: false,
    desc: "基础武器伤害永久提升 20%~50%。",
    levels: [
      { energyCost: 0, cooldownMs: 0, dmgBonusPct: 0.20 },
      { energyCost: 0, cooldownMs: 0, dmgBonusPct: 0.30 },
      { energyCost: 0, cooldownMs: 0, dmgBonusPct: 0.40 },
      { energyCost: 0, cooldownMs: 0, dmgBonusPct: 0.50 },
    ],
  },
  p2_regen: {
    id: "p2_regen", name: "生命恢复", icon: "❤️", isActive: false,
    desc: "每 10 秒自动恢复 5%~15% 最大生命值。",
    levels: [
      { energyCost: 0, cooldownMs: 0, regenPctPer10s: 0.05 },
      { energyCost: 0, cooldownMs: 0, regenPctPer10s: 0.08 },
      { energyCost: 0, cooldownMs: 0, regenPctPer10s: 0.12 },
      { energyCost: 0, cooldownMs: 0, regenPctPer10s: 0.15 },
    ],
  },
};

/** 10 关核心数据：波次、障碍、BOSS、背景主题。 */
export interface WaveSpawn { kind: EnemyKind; x: number; y: number }
export interface LevelBlock { x: number; y: number; w: number; h: number; hp: number }
export interface LevelDef {
  id: number;
  name: string;
  theme: "nebula" | "crimson" | "asteroid" | "void" | "forge"
  | "aurora" | "storm" | "magma" | "frost" | "abyss" | "galaxy" | "pulse" | "solitude";
  isBoss: boolean;
  boss?: BossKind;
  waves: WaveSpawn[][];
  blocks: LevelBlock[];
  recommendedTimeMs: number;
  gravity?: number;
}

export const LEVELS: LevelDef[] = (
  (): LevelDef[] => {
    const mk = (id: number, name: string, theme: LevelDef["theme"], wavesGen: () => WaveSpawn[][], blocks: LevelBlock[] = [], extra: Partial<LevelDef> = {}): LevelDef => {
      return { id, name, theme, isBoss: false, waves: wavesGen(), blocks, recommendedTimeMs: 90_000, ...extra };
    };
    const rows = (rowsN: number, colsN: number, pad = 72, startX = 160, startY = 220, mixKind: EnemyKind[]): WaveSpawn[][] => {
      const out: WaveSpawn[] = [];
      for (let r = 0; r < rowsN; r++) {
        for (let c = 0; c < colsN; c++) {
          const k = mixKind[(r + c) % mixKind.length] as EnemyKind;
          out.push({ kind: k, x: startX + c * pad, y: startY + r * (pad - 12) });
        }
      }
      return [out];
    };
    /** 更复杂的关卡：生成多波次（N 波逐波出现）。 */
    const multiWave = (blocks: EnemyKind[][], pad = 72, startX = 160, startY = 220): WaveSpawn[][] => {
      return blocks.map((mix) => {
        const rowsN = mix.length;
        const colsN = 8;
        const out: WaveSpawn[] = [];
        for (let r = 0; r < rowsN; r++) {
          for (let c = 0; c < colsN; c++) {
            const kind = mix[r] as EnemyKind;
            out.push({ kind, x: startX + c * pad, y: startY + r * (pad - 12) });
          }
        }
        return out;
      });
    };

    const L1_10: LevelDef[] = [
      mk(1, "前哨侦察", "nebula", () => rows(4, 8, 78, 156, 220, [0, 0, 1, 0])),
      mk(2, "前线交火", "nebula", () => rows(5, 8, 78, 156, 200, [0, 1, 0, 4]), [
        { x: 320, y: 900, w: 120, h: 24, hp: 60 },
        { x: 640, y: 900, w: 120, h: 24, hp: 60 },
      ]),
      mk(3, "外星护卫者·改", "forge", () => [], [], { isBoss: true, boss: "guardian", recommendedTimeMs: 180_000 }),
      mk(4, "小行星带", "asteroid", () => rows(5, 8, 78, 156, 210, [2, 0, 1, 5]), [
        { x: 220, y: 780, w: 90, h: 90, hp: 120 },
        { x: 540, y: 720, w: 90, h: 90, hp: 120 },
        { x: 820, y: 820, w: 90, h: 90, hp: 120 },
      ]),
      mk(5, "分裂军团", "void", () => rows(6, 8, 74, 156, 200, [3, 1, 0, 6])),
      mk(6, "腐蚀者降临", "crimson", () => [], [], { isBoss: true, boss: "corruptor", recommendedTimeMs: 210_000 }),
      mk(7, "激光阵地", "void", () => rows(5, 9, 70, 150, 220, [6, 2, 4, 0])),
      mk(8, "最终冲锋", "asteroid", () => rows(6, 9, 70, 140, 210, [7, 1, 5, 8])),
      mk(9, "元首母舰", "forge", () => [], [], { isBoss: true, boss: "mothership", recommendedTimeMs: 240_000 }),
      mk(10, "元首本体·地球解放", "crimson", () => [], [], { isBoss: true, boss: "fuhrer", recommendedTimeMs: 300_000 }),
    ];

    // ===== L11-L30：月球→火星→木星→银河深空，每 3 关一个 BOSS =====
    const L11_30: LevelDef[] = [
      // 11-13 轨道轰炸（hunter BOSS）
      mk(11, "月球轨道哨站", "aurora", () => multiWave([
        [1, 0, 4, 6, 0, 1],
        [0, 5, 1, 2, 6, 0, 3],
      ], 76, 160, 220), [
        { x: 180, y: 820, w: 160, h: 28, hp: 90 },
        { x: 740, y: 820, w: 160, h: 28, hp: 90 },
      ]),
      mk(12, "月影反击", "storm", () => multiWave([
        [3, 6, 5, 1, 4],
        [7, 0, 8, 2, 0, 6],
        [5, 7, 3, 1, 0, 2, 8],
      ], 72, 156, 210), [
        { x: 260, y: 720, w: 120, h: 120, hp: 160 },
        { x: 700, y: 720, w: 120, h: 120, hp: 160 },
      ], { recommendedTimeMs: 105_000 }),
      mk(13, "幽影猎手·月面", "abyss", () => [], [], { isBoss: true, boss: "hunter", recommendedTimeMs: 220_000 }),

      // 14-15 火星沙漠（desolator BOSS）
      mk(14, "赤色沙丘", "magma", () => multiWave([
        [2, 4, 0, 5, 6, 2],
        [1, 7, 8, 3, 1, 0, 7],
      ], 70, 160, 220), [
        { x: 300, y: 900, w: 480, h: 26, hp: 200 },
      ], { gravity: 0.15 }),
      mk(15, "肃清者·红色沙尘", "magma", () => [], [], { isBoss: true, boss: "desolator", recommendedTimeMs: 240_000 }),

      // 16-18 木卫（overlord BOSS）
      mk(16, "冰盖破碎", "frost", () => multiWave([
        [4, 2, 6, 3, 1, 5],
        [0, 8, 7, 2, 4, 6, 1],
        [5, 3, 0, 7, 8, 2, 1, 6],
      ], 70, 154, 210), [
        { x: 200, y: 780, w: 100, h: 200, hp: 180 },
        { x: 780, y: 780, w: 100, h: 200, hp: 180 },
      ], { recommendedTimeMs: 110_000 }),
      mk(17, "木星大红斑", "storm", () => multiWave([
        [3, 6, 2, 7, 5, 8],
        [7, 1, 0, 3, 6, 2, 8],
      ], 70, 150, 220)),
      mk(18, "木星霸主·碾压", "forge", () => [], [], { isBoss: true, boss: "overlord", recommendedTimeMs: 260_000 }),

      // 19-21 土星环（dragon BOSS）
      mk(19, "光环风暴", "aurora", () => multiWave([
        [5, 6, 1, 4, 7, 3, 2],
        [8, 3, 7, 1, 6, 0, 5, 2],
      ], 72, 150, 220)),
      mk(20, "泰坦前线", "abyss", () => multiWave([
        [2, 6, 3, 7, 5, 1, 8, 4],
        [7, 4, 8, 0, 3, 6, 2, 7, 1],
        [5, 8, 2, 1, 7, 6, 3, 4, 5],
      ], 68, 144, 210), [
        { x: 260, y: 860, w: 96, h: 96, hp: 220 },
        { x: 480, y: 780, w: 120, h: 96, hp: 240 },
        { x: 720, y: 860, w: 96, h: 96, hp: 220 },
      ], { recommendedTimeMs: 120_000 }),
      mk(21, "星环神龙", "galaxy", () => [], [], { isBoss: true, boss: "dragon", recommendedTimeMs: 280_000 }),

      // 22-24 超新星遗迹（sentinel/warlord BOSS）
      mk(22, "超新星残响", "pulse", () => multiWave([
        [6, 7, 5, 3, 8, 2, 1],
        [8, 2, 7, 4, 6, 1, 5, 3],
        [5, 3, 8, 6, 7, 2, 1, 4],
      ], 68, 148, 220), [], { recommendedTimeMs: 110_000 }),
      mk(23, "湮灭要塞", "void", () => multiWave([
        [3, 6, 2, 8, 5, 7, 1, 4],
        [7, 5, 8, 3, 1, 6, 4, 2, 7],
        [6, 8, 4, 7, 2, 5, 1, 3, 8],
      ], 64, 144, 210), [
        { x: 160, y: 600, w: 100, h: 380, hp: 220 },
        { x: 820, y: 600, w: 100, h: 380, hp: 220 },
      ], { recommendedTimeMs: 140_000 }),
      mk(24, "壁垒守卫·要塞之心", "crimson", () => [], [], { isBoss: true, boss: "sentinel", recommendedTimeMs: 320_000 }),

      // 25-27 银河深渊（warlord/devourer BOSS）
      mk(25, "星界军阀·远征", "galaxy", () => multiWave([
        [7, 6, 4, 2, 8, 5, 1, 3],
        [8, 5, 7, 3, 6, 2, 4, 7, 1],
        [6, 8, 7, 5, 3, 1, 4, 2, 8, 5],
      ], 60, 140, 210), [
        { x: 260, y: 880, w: 560, h: 24, hp: 260 },
      ], { recommendedTimeMs: 145_000 }),
      mk(26, "吞噬之环", "abyss", () => multiWave([
        [3, 7, 8, 6, 5, 2, 1, 4],
        [8, 6, 5, 7, 3, 4, 2, 1, 7],
        [7, 8, 6, 5, 4, 3, 2, 1, 8, 6],
      ], 60, 138, 210), [
        { x: 340, y: 720, w: 120, h: 120, hp: 200 },
        { x: 620, y: 720, w: 120, h: 120, hp: 200 },
      ], { recommendedTimeMs: 125_000 }),
      mk(27, "虚无饕餮·深渊吞噬", "crimson", () => [], [], { isBoss: true, boss: "devourer", recommendedTimeMs: 360_000 }),

      // 28-30 终焉（leviathan BOSS）
      mk(28, "寂静尽头", "solitude", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [7, 8, 6, 5, 4, 3, 2, 1, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6],
      ], 58, 136, 200), [
        { x: 160, y: 620, w: 96, h: 360, hp: 220 },
        { x: 468, y: 640, w: 144, h: 340, hp: 260 },
        { x: 824, y: 620, w: 96, h: 360, hp: 220 },
      ], { recommendedTimeMs: 165_000 }),
      mk(29, "寂灭之光", "pulse", () => multiWave([
        [6, 8, 7, 5, 4, 3, 2, 1, 7],
        [8, 7, 6, 5, 4, 3, 2, 1, 6, 8],
        [7, 8, 6, 5, 4, 3, 2, 1, 8, 7, 6],
      ], 56, 132, 200), [], { recommendedTimeMs: 175_000 }),
      mk(30, "星海皇者·终极利维坦", "forge", () => [], [], { isBoss: true, boss: "leviathan", recommendedTimeMs: 480_000 }),
    ];

    return [...L1_10, ...L11_30];
  }
)();

/** 30 成就（id 作为解锁键），L11-L30 新增 15 项。 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_blood", name: "首杀", desc: "首次消灭任意一名外星单位。", icon: "🩸" },
  { id: "score_10k", name: "十连击人", desc: "单局累计得分达到 10,000 分。", icon: "🏅" },
  { id: "score_50k", name: "王牌飞行员", desc: "单局累计得分达到 50,000 分。", icon: "🎖️" },
  { id: "score_100k", name: "星空传奇", desc: "单局累计得分达到 100,000 分。", icon: "🏆" },
  { id: "score_250k", name: "银河之巅", desc: "单局累计得分达到 250,000 分。", icon: "👑" },
  { id: "score_500k", name: "星海传说", desc: "单局累计得分达到 500,000 分。", icon: "🌟" },
  { id: "clear_lv3", name: "首战告捷", desc: "击败第 3 关 BOSS：外星护卫者。", icon: "🛡️" },
  { id: "clear_lv6", name: "毒菌克星", desc: "击败第 6 关 BOSS：腐蚀者。", icon: "🧪" },
  { id: "clear_lv9", name: "击穿舰队", desc: "击败第 9 关 BOSS：元首母舰。", icon: "🚀" },
  { id: "clear_lv10", name: "解放地球", desc: "通关第 10 关元首本体。", icon: "🌍" },
  { id: "clear_lv13", name: "猎杀时刻", desc: "击败第 13 关 BOSS：幽影猎手。", icon: "🌙" },
  { id: "clear_lv15", name: "火星征服", desc: "击败第 15 关 BOSS：肃清者。", icon: "🔴" },
  { id: "clear_lv18", name: "木卫霸主", desc: "击败第 18 关 BOSS：木星霸主。", icon: "🟤" },
  { id: "clear_lv21", name: "星环屠龙", desc: "击败第 21 关 BOSS：星环神龙。", icon: "🐉" },
  { id: "clear_lv24", name: "要塞攻陷", desc: "击败第 24 关 BOSS：壁垒守卫。", icon: "🏰" },
  { id: "clear_lv27", name: "深渊猎人", desc: "击败第 27 关 BOSS：虚无饕餮。", icon: "🕳️" },
  { id: "clear_lv30", name: "星海皇者", desc: "通关第 30 关终极利维坦。", icon: "🐋" },
  { id: "flawless", name: "无伤破关", desc: "任意普通关卡以 100% 剩余生命通关。", icon: "💯" },
  { id: "flawless_boss", name: "神乎其技", desc: "任意 BOSS 战以 100% 剩余生命通关。", icon: "🔥" },
  { id: "grade_s", name: "完美节奏", desc: "任意关卡获得 S 级评分。", icon: "✨" },
  { id: "grade_s_10", name: "双 S 收藏家", desc: "累计 10 个关卡获得 S 级评分。", icon: "💫" },
  { id: "skill_master", name: "技能大师", desc: "单局释放 10 次主动技能。", icon: "🎯" },
  { id: "skill_overload", name: "过载引擎", desc: "单局释放 30 次主动技能。", icon: "⚙️" },
  { id: "upgrade_any", name: "初次强化", desc: "使用技能点升级任意 1 个技能。", icon: "🛠️" },
  { id: "all_upgrade_max", name: "全技能满级", desc: "5 个技能全部达到 Lv3。", icon: "💎" },
  { id: "bullet_dodger", name: "弹道芭蕾", desc: "单局累计承受伤害 < 25 且通关任意 BOSS 战。", icon: "💃" },
  { id: "bullet_phantom", name: "幻影步法", desc: "单局累计承受伤害 < 10 且通关任意 L13+ BOSS。", icon: "👣" },
  { id: "no_powerups", name: "赤手空拳", desc: "不使用主动技能通关任意 1 个普通关卡。", icon: "🥋" },
  { id: "no_powerups_boss", name: "剑道至尊", desc: "不使用主动技能通关任意 1 个 BOSS 关卡。", icon: "⚔️" },
  { id: "level_clear_30", name: "30 关达成", desc: "完成所有 30 个关卡。", icon: "🎊" },
];

/** S/A/B/C 综合评分规则（BOSS 倍率随关卡进度提升，技能点奖励上限更高）。 */
export function calcGrade(params: { timeMs: number; recommendedMs: number; hpPct: number; skillsUsed: number; boss?: boolean; levelId?: number }): { grade: LevelClearResult["grade"]; skillPointReward: number; score: number } {
  const { timeMs, recommendedMs, hpPct, skillsUsed, boss, levelId = 1 } = params;
  const ratio = Math.max(0.3, Math.min(1.8, timeMs / Math.max(1, recommendedMs)));
  const timeScore = ratio <= 0.8 ? 40 : ratio <= 1.0 ? 34 : ratio <= 1.25 ? 28 : ratio <= 1.5 ? 20 : ratio <= 1.7 ? 14 : 10;
  const hpScore = hpPct >= 1 ? 40 : hpPct >= 0.75 ? 34 : hpPct >= 0.5 ? 28 : hpPct >= 0.25 ? 20 : 10;
  const skillBonus = Math.max(0, 20 - skillsUsed * 3);
  const total = timeScore + hpScore + skillBonus;
  let grade: LevelClearResult["grade"] = "C";
  if (total >= 92) grade = "S";
  else if (total >= 78) grade = "A";
  else if (total >= 58) grade = "B";
  const baseSp = grade === "S" ? 5 : grade === "A" ? 3 : grade === "B" ? 2 : 1;
  // BOSS ×2，L16+ 额外 +1，L25+ 再额外 +1
  let bossMul = boss ? 2 : 1;
  if (levelId >= 16 && boss) bossMul += 1;
  if (levelId >= 25 && boss) bossMul += 1;
  return { grade, skillPointReward: baseSp * bossMul, score: total };
}

export const ACTIVE_SKILL_ORDER = ["s1_nuke", "s2_shield", "s3_haste"] as const;
export const PASSIVE_SKILL_ORDER = ["p1_power", "p2_regen"] as const;
