/** 游戏常量配置中心：敌人/技能/关卡/成就集中管理（平衡性调参只改这里）。 */
import type { Achievement, BossKind, EnemyKind, LevelClearResult, MissileType, SkillDefinition, UpgradeType } from "./types";

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
  // ===== 主动技能（3）=====
  s1_missile: {
    id: "s1_missile", name: "巡航导弹", icon: "🚀", isActive: true,
    desc: "发射追踪导弹，自动锁定并攻击 3~6 个敌人，造成爆炸伤害。",
    levels: [
      { energyCost: 60, cooldownMs: 30_000, missileCount: 3, missileDmg: 60 },
      { energyCost: 60, cooldownMs: 27_000, missileCount: 4, missileDmg: 75 },
      { energyCost: 60, cooldownMs: 25_000, missileCount: 5, missileDmg: 90 },
      { energyCost: 60, cooldownMs: 22_000, missileCount: 6, missileDmg: 110 },
    ],
  },
  s2_emp: {
    id: "s2_emp", name: "电磁脉冲", icon: "⚡", isActive: true,
    desc: "释放 EMP 脉冲场，持续 10 秒，范围内敌人立即受到 50% 当前生命值伤害并被禁止移动（保留攻击）。",
    levels: [
      { energyCost: 75, cooldownMs: 60_000, empRadius: 324, empStunMs: 10_000, empShieldBreakMs: 10_000, durationMs: 10_000 },
      { energyCost: 75, cooldownMs: 60_000, empRadius: 324, empStunMs: 10_000, empShieldBreakMs: 10_000, durationMs: 10_000 },
      { energyCost: 75, cooldownMs: 60_000, empRadius: 324, empStunMs: 10_000, empShieldBreakMs: 10_000, durationMs: 10_000 },
      { energyCost: 75, cooldownMs: 60_000, empRadius: 324, empStunMs: 10_000, empShieldBreakMs: 10_000, durationMs: 10_000 },
    ],
  },
  s3_timewarp: {
    id: "s3_timewarp", name: "时间扭曲", icon: "⏳", isActive: true,
    desc: "生成时间扭曲场，持续 10 秒，范围内敌人移动禁止、攻击禁止、时间流速降低 50%。",
    levels: [
      { energyCost: 80, cooldownMs: 90_000, durationMs: 10_000, timeScale: 0.50 },
      { energyCost: 80, cooldownMs: 90_000, durationMs: 10_000, timeScale: 0.50 },
      { energyCost: 80, cooldownMs: 90_000, durationMs: 10_000, timeScale: 0.50 },
      { energyCost: 80, cooldownMs: 90_000, durationMs: 10_000, timeScale: 0.50 },
    ],
  },
  s4_shield: {
    id: "s4_shield", name: "超级防御盾", icon: "🛡️", isActive: true,
    desc: "激活无敌护盾，30 秒内无视所有伤害。",
    levels: [
      { energyCost: 90, cooldownMs: 90_000, durationMs: 30_000 },
      { energyCost: 90, cooldownMs: 80_000, durationMs: 30_000 },
      { energyCost: 90, cooldownMs: 70_000, durationMs: 30_000 },
      { energyCost: 90, cooldownMs: 60_000, durationMs: 30_000 },
    ],
  },
  // ===== 被动技能（7）=====
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
  p3_maxhp: {
    id: "p3_maxhp", name: "最大生命", icon: "💚", isActive: false,
    desc: "最大生命值永久提升 15%~40%。",
    levels: [
      { energyCost: 0, cooldownMs: 0, maxHpPct: 0.15 },
      { energyCost: 0, cooldownMs: 0, maxHpPct: 0.22 },
      { energyCost: 0, cooldownMs: 0, maxHpPct: 0.30 },
      { energyCost: 0, cooldownMs: 0, maxHpPct: 0.40 },
    ],
  },
  p4_maxenergy: {
    id: "p4_maxenergy", name: "最大能量", icon: "🔵", isActive: false,
    desc: "最大能量值永久提升 15%~40%。",
    levels: [
      { energyCost: 0, cooldownMs: 0, maxEnergyPct: 0.15 },
      { energyCost: 0, cooldownMs: 0, maxEnergyPct: 0.22 },
      { energyCost: 0, cooldownMs: 0, maxEnergyPct: 0.30 },
      { energyCost: 0, cooldownMs: 0, maxEnergyPct: 0.40 },
    ],
  },
  p5_crit: {
    id: "p5_crit", name: "暴击率", icon: "🎯", isActive: false,
    desc: "攻击 10%~25% 概率暴击，造成 200%~300% 伤害。",
    levels: [
      { energyCost: 0, cooldownMs: 0, critRate: 0.10, critMul: 2.0 },
      { energyCost: 0, cooldownMs: 0, critRate: 0.15, critMul: 2.3 },
      { energyCost: 0, cooldownMs: 0, critRate: 0.20, critMul: 2.6 },
      { energyCost: 0, cooldownMs: 0, critRate: 0.25, critMul: 3.0 },
    ],
  },
  p6_lifesteal: {
    id: "p6_lifesteal", name: "吸血", icon: "🩸", isActive: false,
    desc: "将造成伤害的 5%~15% 转化为生命值。",
    levels: [
      { energyCost: 0, cooldownMs: 0, lifestealPct: 0.05 },
      { energyCost: 0, cooldownMs: 0, lifestealPct: 0.08 },
      { energyCost: 0, cooldownMs: 0, lifestealPct: 0.11 },
      { energyCost: 0, cooldownMs: 0, lifestealPct: 0.15 },
    ],
  },
  p7_armor: {
    id: "p7_armor", name: "护甲", icon: "🛡️", isActive: false,
    desc: "受到伤害减少 10%~30%。",
    levels: [
      { energyCost: 0, cooldownMs: 0, armorPct: 0.10 },
      { energyCost: 0, cooldownMs: 0, armorPct: 0.16 },
      { energyCost: 0, cooldownMs: 0, armorPct: 0.22 },
      { energyCost: 0, cooldownMs: 0, armorPct: 0.30 },
    ],
  },
  p8_homing: {
    id: "p8_homing", name: "追踪弹道", icon: "🎯", isActive: false,
    desc: "主武器子弹自动追踪最近敌人，实现百分百命中。",
    levels: [
      { energyCost: 0, cooldownMs: 0, homingTurnRate: 0 },      // Lv0 无追踪
      { energyCost: 0, cooldownMs: 0, homingTurnRate: 1.8 },    // Lv1 轻度追踪
      { energyCost: 0, cooldownMs: 0, homingTurnRate: 3.0 },    // Lv2 中度追踪
      { energyCost: 0, cooldownMs: 0, homingTurnRate: 4.5 },    // Lv3 强力追踪（百分百命中）
    ],
  },
  p9_wingman: {
    id: "p9_wingman", name: "僚机护航", icon: "✈️", isActive: false,
    desc: "召唤僚机跟随玩家移动并自动开火，协同作战。",
    levels: [
      { energyCost: 0, cooldownMs: 0, wingmanCount: 0, wingmanDmgPct: 0 },    // Lv0 无僚机
      { energyCost: 0, cooldownMs: 0, wingmanCount: 1, wingmanDmgPct: 0.40 }, // Lv1 1架僚机 40%伤害
      { energyCost: 0, cooldownMs: 0, wingmanCount: 1, wingmanDmgPct: 0.70 }, // Lv2 1架僚机 70%伤害
      { energyCost: 0, cooldownMs: 0, wingmanCount: 2, wingmanDmgPct: 1.00 }, // Lv3 2架僚机 100%伤害
    ],
  },
  p10_revive: {
    id: "p10_revive", name: "凤凰复活", icon: "🔥", isActive: false,
    desc: "阵亡时自动复活，每关可用 1~2 次，恢复 30%~60% 生命。",
    levels: [
      { energyCost: 0, cooldownMs: 0, reviveCount: 0, reviveHpPct: 0 },    // Lv0 无复活
      { energyCost: 0, cooldownMs: 0, reviveCount: 1, reviveHpPct: 0.30 }, // Lv1 1次复活 30%HP
      { energyCost: 0, cooldownMs: 0, reviveCount: 1, reviveHpPct: 0.60 }, // Lv2 1次复活 60%HP
      { energyCost: 0, cooldownMs: 0, reviveCount: 2, reviveHpPct: 0.60 }, // Lv3 2次复活 60%HP
    ],
  },
  p11_shiplevel: {
    id: "p11_shiplevel", name: "战机等级", icon: "⭐", isActive: false,
    desc: "战机进阶：每级提升子弹杀伤力与单次开火子弹量，Lv3 三向散射。",
    levels: [
      { energyCost: 0, cooldownMs: 0, shipLevelDmgPct: 0,    shipLevelBullets: 1 }, // Lv0 基础 1 发
      { energyCost: 0, cooldownMs: 0, shipLevelDmgPct: 0.10, shipLevelBullets: 1 }, // Lv1 +10% 伤害 1 发
      { energyCost: 0, cooldownMs: 0, shipLevelDmgPct: 0.20, shipLevelBullets: 2 }, // Lv2 +20% 伤害 2 发散射
      { energyCost: 0, cooldownMs: 0, shipLevelDmgPct: 0.30, shipLevelBullets: 3 }, // Lv3 +30% 伤害 3 发三向散射
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
  | "aurora" | "storm" | "magma" | "frost" | "abyss" | "galaxy" | "pulse" | "solitude"
  | "eclipse" | "empyrean" | "chronos" | "cosmos" | "infinity" | "oblivion" | "omega";
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

    /**
     * 高难度多波次生成器（L51+ 使用）：
     * - 强度递增：每波按从强(8)到弱(1)的顺序填充
     * - 波数随关卡进度增加（3-5 波）
     * - 每波行数随关卡进度增加（1-3 行）
     * - 列数固定 8 列，pad/startY 由调用方传入
     */
    const tierWaves = (lv: number, pad: number, startY: number, waveCount?: number): WaveSpawn[][] => {
      const tier = Math.floor((lv - 51) / 10);          // 0..4 (L51-60=0, L91-100=4)
      const wc = waveCount ?? Math.min(5, 3 + Math.floor((lv - 51) / 20)); // 3..5 波
      const rowsPerWave = Math.min(3, 1 + Math.floor((lv - 51) / 25));     // 1..3 行/波
      const out: WaveSpawn[][] = [];
      for (let w = 0; w < wc; w++) {
        const wave: WaveSpawn[] = [];
        const colsN = 8;
        for (let r = 0; r < rowsPerWave; r++) {
          for (let c = 0; c < colsN; c++) {
            // 从强到弱填充：第 0 行=8, 第 1 行=7, 第 2 行=6（循环）
            const kind = ((8 - (r % 8)) + tier) % 9 as EnemyKind;
            wave.push({ kind, x: 160 + c * pad, y: startY + r * (pad - 12) });
          }
        }
        out.push(wave);
      }
      return out;
    };

    /**
     * 超高难度多波次生成器（L101+ 专用）：
     * - 强度递增：tier 从 5 起步，敌人类型轮换更凶
     * - 波数随关卡进度增加（5-8 波）
     * - 每波行数随关卡进度增加（3-4 行）
     * - 列数固定 8 列，pad/startY 由调用方传入
     */
    const tierWavesEx = (lv: number, pad: number, startY: number, waveCount?: number): WaveSpawn[][] => {
      const tier = Math.floor((lv - 101) / 10) + 5;         // 5..9 (L101-110=5, L141-150=9)
      const wc = waveCount ?? Math.min(8, 5 + Math.floor((lv - 101) / 15)); // 5..8 波
      const rowsPerWave = Math.min(4, 3 + Math.floor((lv - 101) / 20));     // 3..4 行/波
      const out: WaveSpawn[][] = [];
      for (let w = 0; w < wc; w++) {
        const wave: WaveSpawn[] = [];
        const colsN = 8;
        for (let r = 0; r < rowsPerWave; r++) {
          for (let c = 0; c < colsN; c++) {
            // 从强到弱填充：第 0 行=8, 第 1 行=7, 第 2 行=6, 第 3 行=5（循环）
            const kind = ((8 - (r % 8)) + tier) % 9 as EnemyKind;
            wave.push({ kind, x: 160 + c * pad, y: startY + r * (pad - 12) });
          }
        }
        out.push(wave);
      }
      return out;
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

    // ===== L31-L40：河外星系征程 —— warlord 首秀 + sentinel/devourer EX =====
    const L31_40: LevelDef[] = [
      // 31-33 仙女座前哨 (warlord BOSS 首秀)
      mk(31, "仙女座旋臂", "empyrean", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [7, 8, 6, 5, 4, 3, 2, 1, 6, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 5],
      ], 54, 128, 200), [
        { x: 260, y: 860, w: 560, h: 24, hp: 300 },
      ], { recommendedTimeMs: 170_000 }),
      mk(32, "仙女座要塞", "cosmos", () => multiWave([
        [7, 8, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [7, 8, 6, 5, 4, 3, 2, 1, 8, 7, 6],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5],
      ], 52, 126, 200), [
        { x: 160, y: 640, w: 80, h: 340, hp: 260 },
        { x: 840, y: 640, w: 80, h: 340, hp: 260 },
        { x: 440, y: 800, w: 200, h: 24, hp: 300 },
      ], { recommendedTimeMs: 185_000 }),
      mk(33, "星界军阀·血座之冠", "oblivion", () => [], [], { isBoss: true, boss: "warlord", recommendedTimeMs: 420_000 }),

      // 34-36 大麦哲伦云 (sentinel EX)
      mk(34, "麦哲伦风暴", "storm", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [7, 8, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 6, 8, 7],
      ], 52, 124, 200), [
        { x: 200, y: 760, w: 100, h: 220, hp: 280 },
        { x: 780, y: 760, w: 100, h: 220, hp: 280 },
      ], { recommendedTimeMs: 180_000 }),
      mk(35, "星暴工厂", "forge", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5, 4],
      ], 50, 122, 200), [
        { x: 340, y: 720, w: 140, h: 140, hp: 320 },
        { x: 600, y: 720, w: 140, h: 140, hp: 320 },
      ], { recommendedTimeMs: 200_000 }),
      mk(36, "壁垒守卫·强化核心", "crimson", () => [], [], { isBoss: true, boss: "sentinel", recommendedTimeMs: 380_000 }),

      // 37-39 小麦哲伦云 (devourer EX)
      mk(37, "深空吞噬", "eclipse", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [7, 8, 6, 5, 4, 3, 2, 1, 8, 7, 6],
      ], 50, 120, 200), [
        { x: 160, y: 640, w: 80, h: 340, hp: 260 },
        { x: 380, y: 640, w: 80, h: 340, hp: 260 },
        { x: 620, y: 640, w: 80, h: 340, hp: 260 },
        { x: 840, y: 640, w: 80, h: 340, hp: 260 },
      ], { recommendedTimeMs: 200_000, gravity: 0.08 }),
      mk(38, "虚无之触", "abyss", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5],
      ], 48, 118, 200), [
        { x: 260, y: 780, w: 560, h: 28, hp: 340 },
        { x: 260, y: 900, w: 560, h: 28, hp: 340 },
      ], { recommendedTimeMs: 220_000 }),
      mk(39, "虚无饕餮·裂界吞噬", "crimson", () => [], [], { isBoss: true, boss: "devourer", recommendedTimeMs: 420_000 }),

      // 40 (过渡普通关)
      mk(40, "星系团边界", "infinity", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6],
      ], 48, 116, 200), [
        { x: 240, y: 700, w: 120, h: 240, hp: 300 },
        { x: 480, y: 700, w: 120, h: 240, hp: 320 },
        { x: 720, y: 700, w: 120, h: 240, hp: 300 },
      ], { recommendedTimeMs: 215_000 }),
    ];

    // ===== L41-L50：超星系团 → 拉尼亚凯亚尽头 =====
    const L41_50: LevelDef[] = [
      // 41-42 室女座超星系团 (overlord EX)
      mk(41, "室女座之潮", "empyrean", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5],
      ], 46, 114, 200), [
        { x: 200, y: 740, w: 100, h: 260, hp: 320 },
        { x: 780, y: 740, w: 100, h: 260, hp: 320 },
      ], { recommendedTimeMs: 220_000, gravity: 0.10 }),
      mk(42, "木星霸主·究极旗舰", "forge", () => [], [], { isBoss: true, boss: "overlord", recommendedTimeMs: 440_000 }),

      // 43-44 天炉座星带 (dragon EX)
      mk(43, "天炉座熔核", "magma", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5],
      ], 46, 112, 200), [
        { x: 160, y: 620, w: 80, h: 360, hp: 280 },
        { x: 468, y: 640, w: 144, h: 340, hp: 360 },
        { x: 824, y: 620, w: 80, h: 360, hp: 280 },
      ], { recommendedTimeMs: 240_000 }),
      mk(44, "星环神龙·次元咆哮", "galaxy", () => [], [], { isBoss: true, boss: "dragon", recommendedTimeMs: 460_000 }),

      // 45-46 拉尼亚凯亚外围 (hunter EX)
      mk(45, "巨引源之瞳", "chronos", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5, 4],
      ], 44, 110, 200), [
        { x: 160, y: 660, w: 96, h: 320, hp: 300 },
        { x: 460, y: 820, w: 160, h: 36, hp: 360 },
        { x: 824, y: 660, w: 96, h: 320, hp: 300 },
      ], { recommendedTimeMs: 260_000 }),
      mk(46, "幽影猎手·虚空回响", "abyss", () => [], [], { isBoss: true, boss: "hunter", recommendedTimeMs: 480_000 }),

      // 47-48 可观测宇宙尽头 (desolator EX + leviathan EX)
      mk(47, "宇宙微波边界", "solitude", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5],
      ], 44, 108, 200), [
        { x: 240, y: 620, w: 600, h: 28, hp: 400 },
        { x: 360, y: 820, w: 360, h: 28, hp: 400 },
      ], { recommendedTimeMs: 265_000 }),
      mk(48, "肃清者·灭绝光炮", "magma", () => [], [], { isBoss: true, boss: "desolator", recommendedTimeMs: 500_000 }),

      // 49 过渡关：银河系外虚空
      mk(49, "不可观测之域", "infinity", () => multiWave([
        [8, 7, 6, 5, 4, 3, 2, 1],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5],
        [8, 7, 6, 5, 4, 3, 2, 1, 7, 8, 6, 5, 4],
      ], 42, 106, 200), [
        { x: 160, y: 640, w: 80, h: 340, hp: 300 },
        { x: 320, y: 640, w: 80, h: 340, hp: 300 },
        { x: 480, y: 820, w: 120, h: 36, hp: 400 },
        { x: 680, y: 640, w: 80, h: 340, hp: 300 },
        { x: 840, y: 640, w: 80, h: 340, hp: 300 },
      ], { recommendedTimeMs: 280_000, gravity: 0.12 }),

      // 50 终极BOSS：利维坦Ω
      mk(50, "Ω·超维利维坦·万物终端", "omega", () => [], [], { isBoss: true, boss: "leviathan", recommendedTimeMs: 600_000 }),
    ];

    // ===== L51-L100：多元宇宙征程 —— 10 大星域 × 5 关，每 5 关 1 个 BOSS =====
    // 辅助：生成高难度常规关的障碍配置（4 种模板）
    const tierBlocks = (variant: number): LevelBlock[] => {
      switch (variant) {
        case 0: return [ // 双侧垂直墙
          { x: 160, y: 660, w: 80, h: 320, hp: 320 },
          { x: 840, y: 660, w: 80, h: 320, hp: 320 },
        ];
        case 1: return [ // 双侧墙+横梁
          { x: 200, y: 720, w: 100, h: 240, hp: 320 },
          { x: 780, y: 720, w: 100, h: 240, hp: 320 },
          { x: 360, y: 880, w: 360, h: 28, hp: 360 },
        ];
        case 2: return [ // 五列迷宫
          { x: 160, y: 640, w: 80, h: 340, hp: 300 },
          { x: 360, y: 640, w: 80, h: 340, hp: 300 },
          { x: 560, y: 820, w: 200, h: 36, hp: 400 },
          { x: 840, y: 640, w: 80, h: 340, hp: 300 },
        ];
        case 3: return [ // 横纵交错
          { x: 240, y: 620, w: 600, h: 28, hp: 380 },
          { x: 360, y: 820, w: 360, h: 28, hp: 380 },
        ];
        default: return [];
      }
    };

    const L51_100: LevelDef[] = [
      // ===== L51-L55 半人马座α (boss: leviathan @ L55) =====
      mk(51, "半人马前哨", "empyrean", () => tierWaves(51, 46, 220), tierBlocks(0), { recommendedTimeMs: 240_000 }),
      mk(52, "比邻星风暴", "storm", () => tierWaves(52, 44, 210), tierBlocks(1), { recommendedTimeMs: 250_000, gravity: 0.08 }),
      mk(53, "α星轨道战", "cosmos", () => tierWaves(53, 44, 210), tierBlocks(2), { recommendedTimeMs: 260_000 }),
      mk(54, "南门二要塞", "oblivion", () => tierWaves(54, 42, 200), tierBlocks(3), { recommendedTimeMs: 270_000, gravity: 0.10 }),
      mk(55, "半人马利维坦·星海怒涛", "omega", () => [], [], { isBoss: true, boss: "leviathan", recommendedTimeMs: 540_000 }),

      // ===== L56-L60 神仙星座 (boss: warlord @ L60) =====
      mk(56, "神仙座尘埃", "nebula", () => tierWaves(56, 42, 200), tierBlocks(0), { recommendedTimeMs: 280_000 }),
      mk(57, "辉星回廊", "aurora", () => tierWaves(57, 42, 200), tierBlocks(1), { recommendedTimeMs: 290_000, gravity: 0.10 }),
      mk(58, "蓝巨星烈焰", "forge", () => tierWaves(58, 40, 200), tierBlocks(2), { recommendedTimeMs: 300_000 }),
      mk(59, "星座核心", "pulse", () => tierWaves(59, 40, 200), tierBlocks(3), { recommendedTimeMs: 310_000, gravity: 0.12 }),
      mk(60, "星界军阀·神仙座征服", "oblivion", () => [], [], { isBoss: true, boss: "warlord", recommendedTimeMs: 560_000 }),

      // ===== L61-L65 蛇夫座暗流 (boss: devourer @ L65) =====
      mk(61, "蛇夫暗流", "abyss", () => tierWaves(61, 40, 200), tierBlocks(0), { recommendedTimeMs: 320_000, gravity: 0.08 }),
      mk(62, "巴纳德环", "void", () => tierWaves(62, 40, 200), tierBlocks(1), { recommendedTimeMs: 330_000 }),
      mk(63, "暗物质裂隙", "eclipse", () => tierWaves(63, 38, 200), tierBlocks(2), { recommendedTimeMs: 340_000, gravity: 0.10 }),
      mk(64, "蛇夫之瞳", "solitude", () => tierWaves(64, 38, 200), tierBlocks(3), { recommendedTimeMs: 350_000 }),
      mk(65, "虚无饕餮·蛇夫吞噬", "oblivion", () => [], [], { isBoss: true, boss: "devourer", recommendedTimeMs: 580_000 }),

      // ===== L66-L70 武仙座超团 (boss: sentinel @ L70) =====
      mk(66, "武仙座前沿", "galaxy", () => tierWaves(66, 38, 200), tierBlocks(0), { recommendedTimeMs: 360_000, gravity: 0.10 }),
      mk(67, "超团核心", "cosmos", () => tierWaves(67, 38, 200), tierBlocks(1), { recommendedTimeMs: 370_000 }),
      mk(68, "引力井", "chronos", () => tierWaves(68, 36, 200), tierBlocks(2), { recommendedTimeMs: 380_000, gravity: 0.12 }),
      mk(69, "武仙要塞", "forge", () => tierWaves(69, 36, 200), tierBlocks(3), { recommendedTimeMs: 390_000 }),
      mk(70, "壁垒守卫·武仙铁壁", "crimson", () => [], [], { isBoss: true, boss: "sentinel", recommendedTimeMs: 600_000 }),

      // ===== L71-L75 后发座长城 (boss: dragon @ L75) =====
      mk(71, "后发长城·东翼", "infinity", () => tierWaves(71, 36, 200), tierBlocks(0), { recommendedTimeMs: 400_000, gravity: 0.10 }),
      mk(72, "长城中枢", "empyrean", () => tierWaves(72, 36, 200), tierBlocks(1), { recommendedTimeMs: 410_000 }),
      mk(73, "星系纤维", "cosmos", () => tierWaves(73, 34, 200), tierBlocks(2), { recommendedTimeMs: 420_000, gravity: 0.12 }),
      mk(74, "长城西翼", "galaxy", () => tierWaves(74, 34, 200), tierBlocks(3), { recommendedTimeMs: 430_000 }),
      mk(75, "星环神龙·长城咆哮", "omega", () => [], [], { isBoss: true, boss: "dragon", recommendedTimeMs: 620_000 }),

      // ===== L76-L80 双鱼-鲸鱼复合体 (boss: overlord @ L80) =====
      mk(76, "双鱼旋臂", "frost", () => tierWaves(76, 34, 200), tierBlocks(0), { recommendedTimeMs: 440_000, gravity: 0.10 }),
      mk(77, "鲸鱼深渊", "abyss", () => tierWaves(77, 34, 200), tierBlocks(1), { recommendedTimeMs: 450_000 }),
      mk(78, "复合体核心", "storm", () => tierWaves(78, 32, 200), tierBlocks(2), { recommendedTimeMs: 460_000, gravity: 0.12 }),
      mk(79, "双鱼要塞", "void", () => tierWaves(79, 32, 200), tierBlocks(3), { recommendedTimeMs: 470_000 }),
      mk(80, "木星霸主·复合体统治", "forge", () => [], [], { isBoss: true, boss: "overlord", recommendedTimeMs: 640_000 }),

      // ===== L81-L85 史隆长城 (boss: hunter @ L85) =====
      mk(81, "史隆东段", "chronos", () => tierWaves(81, 32, 200), tierBlocks(0), { recommendedTimeMs: 480_000, gravity: 0.10 }),
      mk(82, "史隆中段", "eclipse", () => tierWaves(82, 32, 200), tierBlocks(1), { recommendedTimeMs: 490_000 }),
      mk(83, "史隆西段", "solitude", () => tierWaves(83, 30, 200), tierBlocks(2), { recommendedTimeMs: 500_000, gravity: 0.12 }),
      mk(84, "长城交汇点", "infinity", () => tierWaves(84, 30, 200), tierBlocks(3), { recommendedTimeMs: 510_000 }),
      mk(85, "幽影猎手·史隆暗影", "abyss", () => [], [], { isBoss: true, boss: "hunter", recommendedTimeMs: 660_000 }),

      // ===== L86-L90 武仙-北冕座长城 (boss: desolator @ L90) =====
      mk(86, "武仙-北冕前沿", "cosmos", () => tierWaves(86, 30, 200), tierBlocks(0), { recommendedTimeMs: 520_000, gravity: 0.10 }),
      mk(87, "长城巨壁", "oblivion", () => tierWaves(87, 30, 200), tierBlocks(1), { recommendedTimeMs: 530_000 }),
      mk(88, "宇宙最大结构", "omega", () => tierWaves(88, 28, 200), tierBlocks(2), { recommendedTimeMs: 540_000, gravity: 0.12 }),
      mk(89, "长城尽头", "magma", () => tierWaves(89, 28, 200), tierBlocks(3), { recommendedTimeMs: 550_000 }),
      mk(90, "肃清者·长城灭绝", "crimson", () => [], [], { isBoss: true, boss: "desolator", recommendedTimeMs: 680_000 }),

      // ===== L91-L95 可观测宇宙边缘 (boss: fuhrer EX @ L95) =====
      mk(91, "宇宙微波背景", "pulse", () => tierWaves(91, 28, 200), tierBlocks(0), { recommendedTimeMs: 560_000, gravity: 0.10 }),
      mk(92, "哈勃边界", "solitude", () => tierWaves(92, 28, 200), tierBlocks(1), { recommendedTimeMs: 570_000 }),
      mk(93, "红移极境", "eclipse", () => tierWaves(93, 26, 200), tierBlocks(2), { recommendedTimeMs: 580_000, gravity: 0.12 }),
      mk(94, "可观测极限", "infinity", () => tierWaves(94, 26, 200), tierBlocks(3), { recommendedTimeMs: 590_000 }),
      mk(95, "元首本体·宇宙边缘EX", "forge", () => [], [], { isBoss: true, boss: "fuhrer", recommendedTimeMs: 700_000 }),

      // ===== L96-L100 Ω·多元宇宙核心 (boss: leviathan Ω @ L100) =====
      mk(96, "多元宇宙之门", "omega", () => tierWaves(96, 26, 200), tierBlocks(0), { recommendedTimeMs: 600_000, gravity: 0.12 }),
      mk(97, "平行时空回廊", "chronos", () => tierWaves(97, 26, 200), tierBlocks(1), { recommendedTimeMs: 620_000, gravity: 0.14 }),
      mk(98, "维度折叠", "cosmos", () => tierWaves(98, 24, 200), tierBlocks(2), { recommendedTimeMs: 640_000, gravity: 0.15 }),
      mk(99, "万物起源", "empyrean", () => tierWaves(99, 24, 200), tierBlocks(3), { recommendedTimeMs: 660_000, gravity: 0.15 }),
      mk(100, "ΩΩ·超维利维坦·多元宇宙终焉", "omega", () => [], [], { isBoss: true, boss: "leviathan", recommendedTimeMs: 800_000 }),
    ];

    // ===== L101-L150：存在之终焉征程 —— 10 大终极星域 × 5 关，每 5 关 1 个 BOSS =====
    const L101_150: LevelDef[] = [
      // ===== L101-L105 量子泡沫 (boss: leviathan @ L105) =====
      mk(101, "量子涨落", "empyrean", () => tierWavesEx(101, 44, 200), tierBlocks(0), { recommendedTimeMs: 620_000, gravity: 0.10 }),
      mk(102, "虚粒子海", "storm", () => tierWavesEx(102, 42, 200), tierBlocks(1), { recommendedTimeMs: 640_000 }),
      mk(103, "量子纠缠", "cosmos", () => tierWavesEx(103, 42, 200), tierBlocks(2), { recommendedTimeMs: 660_000, gravity: 0.12 }),
      mk(104, "泡沫边界", "oblivion", () => tierWavesEx(104, 40, 200), tierBlocks(3), { recommendedTimeMs: 680_000 }),
      mk(105, "量子利维坦·泡沫终焉", "omega", () => [], [], { isBoss: true, boss: "leviathan", recommendedTimeMs: 820_000 }),

      // ===== L106-L110 弦理论振动 (boss: warlord @ L110) =====
      mk(106, "弦振动", "nebula", () => tierWavesEx(106, 40, 200), tierBlocks(0), { recommendedTimeMs: 700_000, gravity: 0.10 }),
      mk(107, "十一维空间", "aurora", () => tierWavesEx(107, 40, 200), tierBlocks(1), { recommendedTimeMs: 720_000 }),
      mk(108, "紧致化流形", "forge", () => tierWavesEx(108, 38, 200), tierBlocks(2), { recommendedTimeMs: 740_000, gravity: 0.12 }),
      mk(109, "弦共振", "pulse", () => tierWavesEx(109, 38, 200), tierBlocks(3), { recommendedTimeMs: 760_000 }),
      mk(110, "星界军阀·弦理论征服", "oblivion", () => [], [], { isBoss: true, boss: "warlord", recommendedTimeMs: 840_000 }),

      // ===== L111-L115 多维折叠 (boss: devourer @ L115) =====
      mk(111, "维度折叠", "abyss", () => tierWavesEx(111, 38, 200), tierBlocks(0), { recommendedTimeMs: 760_000, gravity: 0.08 }),
      mk(112, "卡拉比-丘流形", "void", () => tierWavesEx(112, 38, 200), tierBlocks(1), { recommendedTimeMs: 780_000 }),
      mk(113, "超空间通道", "eclipse", () => tierWavesEx(113, 36, 200), tierBlocks(2), { recommendedTimeMs: 800_000, gravity: 0.10 }),
      mk(114, "折叠尽头", "solitude", () => tierWavesEx(114, 36, 200), tierBlocks(3), { recommendedTimeMs: 820_000 }),
      mk(115, "虚无饕餮·多维吞噬", "oblivion", () => [], [], { isBoss: true, boss: "devourer", recommendedTimeMs: 860_000 }),

      // ===== L116-L120 时空奇点 (boss: sentinel @ L120) =====
      mk(116, "奇点视界", "galaxy", () => tierWavesEx(116, 36, 200), tierBlocks(0), { recommendedTimeMs: 820_000, gravity: 0.10 }),
      mk(117, "事件视界", "cosmos", () => tierWavesEx(117, 36, 200), tierBlocks(1), { recommendedTimeMs: 840_000 }),
      mk(118, "因果律破碎", "chronos", () => tierWavesEx(118, 34, 200), tierBlocks(2), { recommendedTimeMs: 860_000, gravity: 0.12 }),
      mk(119, "奇点核心", "forge", () => tierWavesEx(119, 34, 200), tierBlocks(3), { recommendedTimeMs: 880_000 }),
      mk(120, "壁垒守卫·奇点铁壁", "crimson", () => [], [], { isBoss: true, boss: "sentinel", recommendedTimeMs: 880_000 }),

      // ===== L121-L125 虚空混沌 (boss: dragon @ L125) =====
      mk(121, "混沌之海", "infinity", () => tierWavesEx(121, 34, 200), tierBlocks(0), { recommendedTimeMs: 880_000, gravity: 0.10 }),
      mk(122, "蝴蝶效应", "empyrean", () => tierWavesEx(122, 34, 200), tierBlocks(1), { recommendedTimeMs: 900_000 }),
      mk(123, "熵增极限", "cosmos", () => tierWavesEx(123, 32, 200), tierBlocks(2), { recommendedTimeMs: 920_000, gravity: 0.12 }),
      mk(124, "混沌终结", "galaxy", () => tierWavesEx(124, 32, 200), tierBlocks(3), { recommendedTimeMs: 940_000 }),
      mk(125, "星环神龙·混沌咆哮", "omega", () => [], [], { isBoss: true, boss: "dragon", recommendedTimeMs: 900_000 }),

      // ===== L126-L130 奇点坍缩 (boss: overlord @ L130) =====
      mk(126, "引力坍缩", "frost", () => tierWavesEx(126, 32, 200), tierBlocks(0), { recommendedTimeMs: 920_000, gravity: 0.10 }),
      mk(127, "黑洞边缘", "abyss", () => tierWavesEx(127, 32, 200), tierBlocks(1), { recommendedTimeMs: 940_000 }),
      mk(128, "奇点爆发", "storm", () => tierWavesEx(128, 30, 200), tierBlocks(2), { recommendedTimeMs: 960_000, gravity: 0.12 }),
      mk(129, "坍缩临界", "void", () => tierWavesEx(129, 30, 200), tierBlocks(3), { recommendedTimeMs: 980_000 }),
      mk(130, "木星霸主·坍缩统治", "forge", () => [], [], { isBoss: true, boss: "overlord", recommendedTimeMs: 920_000 }),

      // ===== L131-L135 量子纠缠 (boss: hunter @ L135) =====
      mk(131, "纠缠态", "chronos", () => tierWavesEx(131, 30, 200), tierBlocks(0), { recommendedTimeMs: 960_000, gravity: 0.10 }),
      mk(132, "量子退相干", "eclipse", () => tierWavesEx(132, 30, 200), tierBlocks(1), { recommendedTimeMs: 980_000 }),
      mk(133, "叠加态", "solitude", () => tierWavesEx(133, 28, 200), tierBlocks(2), { recommendedTimeMs: 1_000_000, gravity: 0.12 }),
      mk(134, "测量坍缩", "infinity", () => tierWavesEx(134, 28, 200), tierBlocks(3), { recommendedTimeMs: 1_020_000 }),
      mk(135, "幽影猎手·量子暗影", "abyss", () => [], [], { isBoss: true, boss: "hunter", recommendedTimeMs: 940_000 }),

      // ===== L136-L140 热寂终点 (boss: desolator @ L140) =====
      mk(136, "热寂前夜", "cosmos", () => tierWavesEx(136, 28, 200), tierBlocks(0), { recommendedTimeMs: 1_000_000, gravity: 0.10 }),
      mk(137, "熵最大化", "oblivion", () => tierWavesEx(137, 28, 200), tierBlocks(1), { recommendedTimeMs: 1_020_000 }),
      mk(138, "最终状态", "omega", () => tierWavesEx(138, 26, 200), tierBlocks(2), { recommendedTimeMs: 1_040_000, gravity: 0.12 }),
      mk(139, "热寂降临", "magma", () => tierWavesEx(139, 26, 200), tierBlocks(3), { recommendedTimeMs: 1_060_000 }),
      mk(140, "肃清者·热寂灭绝", "crimson", () => [], [], { isBoss: true, boss: "desolator", recommendedTimeMs: 960_000 }),

      // ===== L141-L145 大撕裂 (boss: fuhrer @ L145) =====
      mk(141, "暗能量加速", "pulse", () => tierWavesEx(141, 26, 200), tierBlocks(0), { recommendedTimeMs: 1_040_000, gravity: 0.10 }),
      mk(142, "星系分离", "solitude", () => tierWavesEx(142, 26, 200), tierBlocks(1), { recommendedTimeMs: 1_060_000 }),
      mk(143, "原子撕裂", "eclipse", () => tierWavesEx(143, 24, 200), tierBlocks(2), { recommendedTimeMs: 1_080_000, gravity: 0.12 }),
      mk(144, "撕裂极限", "infinity", () => tierWavesEx(144, 24, 200), tierBlocks(3), { recommendedTimeMs: 1_100_000 }),
      mk(145, "元首本体·大撕裂EX", "forge", () => [], [], { isBoss: true, boss: "fuhrer", recommendedTimeMs: 980_000 }),

      // ===== L146-L150 存在之终焉 (boss: leviathan ΩΩΩ @ L150) =====
      mk(146, "存在之问", "omega", () => tierWavesEx(146, 24, 200), tierBlocks(0), { recommendedTimeMs: 1_080_000, gravity: 0.12 }),
      mk(147, "虚无与存在", "chronos", () => tierWavesEx(147, 24, 200), tierBlocks(1), { recommendedTimeMs: 1_100_000, gravity: 0.14 }),
      mk(148, "终极真理", "cosmos", () => tierWavesEx(148, 22, 200), tierBlocks(2), { recommendedTimeMs: 1_120_000, gravity: 0.15 }),
      mk(149, "万物归一", "empyrean", () => tierWavesEx(149, 22, 200), tierBlocks(3), { recommendedTimeMs: 1_140_000, gravity: 0.15 }),
      mk(150, "ΩΩΩ·超维利维坦·存在之终焉", "omega", () => [], [], { isBoss: true, boss: "leviathan", recommendedTimeMs: 1_200_000 }),
    ];

    return [...L1_10, ...L11_30, ...L31_40, ...L41_50, ...L51_100, ...L101_150];
  }
)();

/** 72 成就（id 作为解锁键），L11-L30 新增 15 项，L31-L50 新增 10 项，L51-L100 新增 12 项，L101-L150 新增 12 项。 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_blood", name: "首杀", desc: "首次消灭任意一名外星单位。", icon: "🩸" },
  { id: "score_10k", name: "十连击人", desc: "单局累计得分达到 10,000 分。", icon: "🏅" },
  { id: "score_50k", name: "王牌飞行员", desc: "单局累计得分达到 50,000 分。", icon: "🎖️" },
  { id: "score_100k", name: "星空传奇", desc: "单局累计得分达到 100,000 分。", icon: "🏆" },
  { id: "score_250k", name: "银河之巅", desc: "单局累计得分达到 250,000 分。", icon: "👑" },
  { id: "score_500k", name: "星海传说", desc: "单局累计得分达到 500,000 分。", icon: "🌟" },
  { id: "score_1m", name: "百万星辰", desc: "单局累计得分达到 1,000,000 分。", icon: "💠" },
  { id: "score_5m", name: "五百万星河", desc: "单局累计得分达到 5,000,000 分。", icon: "🔮" },
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
  // ===== L31-L50 新增通关成就 =====
  { id: "clear_lv33", name: "血座倾覆", desc: "击败第 33 关 BOSS：星界军阀。", icon: "👑" },
  { id: "clear_lv36", name: "壁垒粉碎", desc: "击败第 36 关 BOSS：壁垒守卫·强化核心。", icon: "🏚️" },
  { id: "clear_lv39", name: "裂界截流", desc: "击败第 39 关 BOSS：虚无饕餮·裂界吞噬。", icon: "⚫" },
  { id: "clear_lv42", name: "旗舰覆灭", desc: "击败第 42 关 BOSS：木星霸主·究极旗舰。", icon: "🚢" },
  { id: "clear_lv44", name: "次元啸声", desc: "击败第 44 关 BOSS：星环神龙·次元咆哮。", icon: "🌀" },
  { id: "clear_lv46", name: "虚空狩猎", desc: "击败第 46 关 BOSS：幽影猎手·虚空回响。", icon: "🕸️" },
  { id: "clear_lv48", name: "光炮湮灭", desc: "击败第 48 关 BOSS：肃清者·灭绝光炮。", icon: "☢️" },
  { id: "clear_lv50", name: "Ω·万物终局", desc: "通关第 50 关超维利维坦Ω。", icon: "🧿" },
  // ===== L51-L100 新增通关成就 =====
  { id: "clear_lv55", name: "半人马怒涛", desc: "击败第 55 关 BOSS：半人马利维坦。", icon: "🐎" },
  { id: "clear_lv60", name: "神仙座征服", desc: "击败第 60 关 BOSS：星界军阀·神仙座征服。", icon: "✨" },
  { id: "clear_lv65", name: "蛇夫吞噬", desc: "击败第 65 关 BOSS：虚无饕餮·蛇夫吞噬。", icon: "🐍" },
  { id: "clear_lv70", name: "武仙铁壁", desc: "击败第 70 关 BOSS：壁垒守卫·武仙铁壁。", icon: "⚔️" },
  { id: "clear_lv75", name: "长城咆哮", desc: "击败第 75 关 BOSS：星环神龙·长城咆哮。", icon: "🐲" },
  { id: "clear_lv80", name: "复合体统治", desc: "击败第 80 关 BOSS：木星霸主·复合体统治。", icon: "🔱" },
  { id: "clear_lv85", name: "史隆暗影", desc: "击败第 85 关 BOSS：幽影猎手·史隆暗影。", icon: "🌑" },
  { id: "clear_lv90", name: "长城灭绝", desc: "击败第 90 关 BOSS：肃清者·长城灭绝。", icon: "💀" },
  { id: "clear_lv95", name: "宇宙边缘EX", desc: "击败第 95 关 BOSS：元首本体·宇宙边缘EX。", icon: "🎖️" },
  { id: "clear_lv100", name: "ΩΩ·多元宇宙终焉", desc: "通关第 100 关超维利维坦·多元宇宙终焉。", icon: "🔮" },
  // ===== L101-L150 新增通关成就 =====
  { id: "clear_lv105", name: "泡沫终焉", desc: "击败第 105 关 BOSS：量子利维坦·泡沫终焉。", icon: "🌊" },
  { id: "clear_lv110", name: "弦理论征服", desc: "击败第 110 关 BOSS：星界军阀·弦理论征服。", icon: "🎻" },
  { id: "clear_lv115", name: "多维吞噬", desc: "击败第 115 关 BOSS：虚无饕餮·多维吞噬。", icon: "📐" },
  { id: "clear_lv120", name: "奇点铁壁", desc: "击败第 120 关 BOSS：壁垒守卫·奇点铁壁。", icon: "⬛" },
  { id: "clear_lv125", name: "混沌咆哮", desc: "击败第 125 关 BOSS：星环神龙·混沌咆哮。", icon: "🐲" },
  { id: "clear_lv130", name: "坍缩统治", desc: "击败第 130 关 BOSS：木星霸主·坍缩统治。", icon: "🌌" },
  { id: "clear_lv135", name: "量子暗影", desc: "击败第 135 关 BOSS：幽影猎手·量子暗影。", icon: "🔭" },
  { id: "clear_lv140", name: "热寂灭绝", desc: "击败第 140 关 BOSS：肃清者·热寂灭绝。", icon: "🌡️" },
  { id: "clear_lv145", name: "大撕裂EX", desc: "击败第 145 关 BOSS：元首本体·大撕裂EX。", icon: "💥" },
  { id: "clear_lv150", name: "存在之终焉", desc: "通关第 150 关超维利维坦·存在之终焉。", icon: "🔮" },
  // ===== 通用操作/挑战 =====
  { id: "flawless", name: "无伤破关", desc: "任意普通关卡以 100% 剩余生命通关。", icon: "💯" },
  { id: "flawless_boss", name: "神乎其技", desc: "任意 BOSS 战以 100% 剩余生命通关。", icon: "🔥" },
  { id: "grade_s", name: "完美节奏", desc: "任意关卡获得 S 级评分。", icon: "✨" },
  { id: "grade_s_10", name: "双 S 收藏家", desc: "累计 10 个关卡获得 S 级评分。", icon: "💫" },
  { id: "grade_s_30", name: "S 级收藏家", desc: "累计 30 个关卡获得 S 级评分。", icon: "🌈" },
  { id: "grade_s_50", name: "S 级宗师", desc: "累计 50 个关卡获得 S 级评分。", icon: "🌠" },
  { id: "skill_master", name: "技能大师", desc: "单局释放 10 次主动技能。", icon: "🎯" },
  { id: "skill_overload", name: "过载引擎", desc: "单局释放 30 次主动技能。", icon: "⚙️" },
  { id: "upgrade_any", name: "初次强化", desc: "使用技能点升级任意 1 个技能。", icon: "🛠️" },
  { id: "all_upgrade_max", name: "全技能满级", desc: "15 个技能全部达到 Lv3。", icon: "💎" },
  { id: "bullet_dodger", name: "弹道芭蕾", desc: "单局累计承受伤害 < 25 且通关任意 BOSS 战。", icon: "💃" },
  { id: "bullet_phantom", name: "幻影步法", desc: "单局累计承受伤害 < 10 且通关任意 L13+ BOSS。", icon: "👣" },
  { id: "no_powerups", name: "赤手空拳", desc: "不使用主动技能通关任意 1 个普通关卡。", icon: "🥋" },
  { id: "no_powerups_boss", name: "剑道至尊", desc: "不使用主动技能通关任意 1 个 BOSS 关卡。", icon: "⚔️" },
  { id: "level_clear_30", name: "30 关达成", desc: "完成所有 30 个关卡。", icon: "🎊" },
  { id: "level_clear_50", name: "50 关达成·宇宙征服", desc: "完成所有 50 个关卡。", icon: "🏮" },
  { id: "level_clear_75", name: "75 关达成·长城穿越", desc: "完成所有 75 个关卡。", icon: "🏯" },
  { id: "level_clear_100", name: "100 关达成·多元宇宙征服", desc: "完成所有 100 个关卡。", icon: "🏆" },
  { id: "level_clear_125", name: "125 关达成·混沌穿越", desc: "完成所有 125 个关卡。", icon: "🌀" },
  { id: "level_clear_150", name: "150 关达成·存在之终焉", desc: "完成所有 150 个关卡。", icon: "🔱" },
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

export const ACTIVE_SKILL_ORDER = ["s1_missile", "s2_emp", "s3_timewarp", "s4_shield"] as const;
export const PASSIVE_SKILL_ORDER = ["p1_power", "p2_regen", "p3_maxhp", "p4_maxenergy", "p5_crit", "p6_lifesteal", "p7_armor", "p8_homing", "p9_wingman", "p10_revive", "p11_shiplevel"] as const;

// ===== 神龙殿商店系统配置 =====
/** 升级路径配置：名称 / 图标 / 基础价格 / 最大等级 / 每级效果列表。
 *  飞船四件套 maxLevel=5（Lv0..Lv5），雷达 maxLevel=4（LV0..LV4）。 */
export const SHOP_UPGRADE_CONFIG: Record<UpgradeType, { name: string; icon: string; basePrice: number; maxLevel: number; effects: string[] }> = {
  mainGun: { name: "主炮", icon: "🔥", basePrice: 200, maxLevel: 5, effects: ["+20% 激光伤害", "+15% 充能速度", "+10% 射程"] },
  subGun: { name: "副炮", icon: "💥", basePrice: 180, maxLevel: 5, effects: ["+15% 伤害", "+10% 射速", "+1 弹道"] },
  defense: { name: "防御", icon: "🛡️", basePrice: 220, maxLevel: 5, effects: ["+20% 生命", "+5% 减伤"] },
  engine: { name: "引擎", icon: "🚀", basePrice: 160, maxLevel: 5, effects: ["+15% 移速", "+10% 机动性"] },
  radar: { name: "雷达", icon: "📡", basePrice: 250, maxLevel: 4, effects: ["+1 锁定目标", "+25% 锁定范围", "LV4 锁定全屏"] },
};
/** 导弹类型配置：名称 / 图标 / 伤害 / 单枚价格 / 描述。 */
export const SHOP_MISSILE_CONFIG: Record<MissileType, { name: string; icon: string; dmg: number; price: number; desc: string }> = {
  normal: { name: "普通导弹", icon: "📌", dmg: 100, price: 100, desc: "直线飞行，基础伤害" },
  cruise: { name: "巡航导弹", icon: "🎯", dmg: 150, price: 150, desc: "自动追踪目标" },
  explosion: { name: "爆炸导弹", icon: "💥", dmg: 200, price: 200, desc: "范围伤害，爆炸半径100px" },
  pierce: { name: "穿刺导弹", icon: "⚔️", dmg: 180, price: 180, desc: "穿透3个目标，伤害衰减20%" },
  cluster: { name: "子母弹", icon: "🪺", dmg: 120, price: 300, desc: "母弹碰撞不伤敌，原地分裂5~10枚子子弹，子子弹命中造成伤害" },
};
/** 导弹总容量上限（所有类型合计不得超过此值）。 */
export const SHOP_MISSILE_MAX = 8;

/** 雷达等级配置：每级锁定目标数 / 锁定范围（占屏幕宽度比例）/ 描述。
 *  LV0 自动锁定 1 个最近目标，范围 150%；LV4 锁定所有可见目标，范围 250%。 */
export const RADAR_LEVEL_CONFIG: Array<{ lockCount: number; rangeRatio: number; desc: string }> = [
  { lockCount: 1,  rangeRatio: 1.50, desc: "自动锁定 1 个最近目标，范围 150%" }, // LV0
  { lockCount: 3,  rangeRatio: 1.75, desc: "自动锁定 3 个最近目标，范围 175%" }, // LV1
  { lockCount: 5,  rangeRatio: 2.00, desc: "自动锁定 5 个最近目标，范围 200%" }, // LV2
  { lockCount: 10, rangeRatio: 2.25, desc: "自动锁定 10 个最近目标，范围 225%" }, // LV3
  { lockCount: -1, rangeRatio: 2.50, desc: "锁定所有可见目标，范围 250%" },       // LV4 (-1 表示无上限)
];

/** 敌机击落金币奖励（按 EnemyKind 索引）。
 *  价值区间 10-100 金币，按敌机强度递增：基础兵最弱 10 金，治疗兵最强 100 金。 */
export const ENEMY_GOLD_REWARD: Record<number, number> = {
  0: 10,  // 普通兵
  1: 15,  // 快速兵
  2: 40,  // 重装兵
  3: 25,  // 分裂兵
  4: 30,  // 护盾兵
  5: 35,  // 狙击手
  6: 45,  // 激光兵
  7: 60,  // 冲锋兵
  8: 100, // 治疗兵（最难击落，奖励最高）
};
