/** 游戏常量配置中心：敌人/技能/关卡/成就集中管理（平衡性调参只改这里）。 */
import type { Achievement, EnemyKind, LevelClearResult, SkillDefinition } from "./types";

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
  theme: "nebula" | "crimson" | "asteroid" | "void" | "forge";
  isBoss: boolean;
  boss?: "guardian" | "corruptor" | "mothership" | "fuhrer";
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
    return [
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
  }
)();

/** 15 成就（id 作为解锁键）。 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_blood", name: "首杀", desc: "首次消灭任意一名外星单位。", icon: "🩸" },
  { id: "score_10k", name: "十连击人", desc: "单局累计得分达到 10,000 分。", icon: "🏅" },
  { id: "score_50k", name: "王牌飞行员", desc: "单局累计得分达到 50,000 分。", icon: "🎖️" },
  { id: "score_100k", name: "星空传奇", desc: "单局累计得分达到 100,000 分。", icon: "🏆" },
  { id: "clear_lv3", name: "首战告捷", desc: "击败第 3 关 BOSS：外星护卫者。", icon: "🛡️" },
  { id: "clear_lv6", name: "毒菌克星", desc: "击败第 6 关 BOSS：腐蚀者。", icon: "🧪" },
  { id: "clear_lv9", name: "击穿舰队", desc: "击败第 9 关 BOSS：元首母舰。", icon: "🚀" },
  { id: "clear_lv10", name: "解放地球", desc: "通关第 10 关元首本体。", icon: "🌍" },
  { id: "flawless", name: "无伤破关", desc: "任意普通关卡以 100% 剩余生命通关。", icon: "💯" },
  { id: "grade_s", name: "完美节奏", desc: "任意关卡获得 S 级评分。", icon: "✨" },
  { id: "skill_master", name: "技能大师", desc: "单局释放 10 次主动技能。", icon: "🎯" },
  { id: "upgrade_any", name: "初次强化", desc: "使用技能点升级任意 1 个技能。", icon: "🛠️" },
  { id: "all_upgrade_max", name: "全技能满级", desc: "5 个技能全部达到 Lv3。", icon: "💎" },
  { id: "bullet_dodger", name: "弹道芭蕾", desc: "单局累计承受伤害 < 25 且通关任意 BOSS 战。", icon: "💃" },
  { id: "no_powerups", name: "赤手空拳", desc: "不使用主动技能通关任意 1 个普通关卡。", icon: "🥋" },
];

/** S/A/B/C 综合评分规则。 */
export function calcGrade(params: { timeMs: number; recommendedMs: number; hpPct: number; skillsUsed: number; boss?: boolean }): { grade: LevelClearResult["grade"]; skillPointReward: number; score: number } {
  const { timeMs, recommendedMs, hpPct, skillsUsed, boss } = params;
  const ratio = Math.max(0.3, Math.min(1.6, timeMs / Math.max(1, recommendedMs)));
  const timeScore = ratio <= 0.8 ? 40 : ratio <= 1.0 ? 34 : ratio <= 1.25 ? 28 : ratio <= 1.5 ? 20 : 14;
  const hpScore = hpPct >= 1 ? 40 : hpPct >= 0.75 ? 34 : hpPct >= 0.5 ? 28 : hpPct >= 0.25 ? 20 : 10;
  const skillBonus = Math.max(0, 20 - skillsUsed * 3); // 少用技能评分更高
  const total = timeScore + hpScore + skillBonus;
  let grade: LevelClearResult["grade"] = "C";
  if (total >= 92) grade = "S";
  else if (total >= 78) grade = "A";
  else if (total >= 58) grade = "B";
  const baseSp = grade === "S" ? 5 : grade === "A" ? 3 : grade === "B" ? 2 : 1;
  const bossMul = boss ? 2 : 1;
  return { grade, skillPointReward: baseSp * bossMul, score: total };
}

export const ACTIVE_SKILL_ORDER = ["s1_nuke", "s2_shield", "s3_haste"] as const;
export const PASSIVE_SKILL_ORDER = ["p1_power", "p2_regen"] as const;
