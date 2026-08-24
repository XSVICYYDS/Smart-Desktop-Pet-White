/** 太空侵略者全局核心类型（单事实源，避免循环依赖）。 */
import type { QualityTier } from "./engine/HardwareDetect";

export type EnemyKind = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
// 0 基础小兵 1 快速兵 2 重装兵 3 分裂兵 4 护盾兵 5 远程狙击手 6 激光兵 7 冲锋兵 8 治疗兵
export type BossKind =
  | "guardian" | "corruptor" | "mothership" | "fuhrer"
  | "hunter" | "desolator" | "overlord" | "dragon"
  | "sentinel" | "warlord" | "devourer" | "leviathan";
export type InputMode = "keyboard" | "mouse" | "touch";
export type ScreenState = "menu" | "playing" | "paused" | "cleared" | "gameover" | "victory";
export type Grade = "S" | "A" | "B" | "C";

export interface Vec2 { x: number; y: number }

export interface PlayerRuntime {
  x: number; y: number;
  vx: number;
  baseSpeed: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  shieldHits: number;
  shieldUntilMs: number;
  speedBoostUntilMs: number;
  fireCooldownMs: number;
  invulnUntilMs: number;
  // 被动技能运行时属性
  critRate: number;       // p5_crit 暴击率 0..1
  critMul: number;        // p5_crit 暴击倍率 2.0..3.0
  lifestealPct: number;   // p6_lifesteal 吸血比例 0.05..0.15
  armorPct: number;       // p7_armor 减伤比例 0.10..0.30
  homingTurnRate: number; // p8_homing 追踪转向速率（弧度/秒），0=无追踪
  wingmanCount: number;   // p9_wingman 僚机数量 0..2
  reviveCount: number;    // p10_revive 本关可复活次数
  reviveUsedCount: number; // p10_revive 本关已用复活次数
  // s4_shield 超级防御盾：> now 表示处于无视所有伤害状态
  superShieldUntilMs: number;
  // p11_shiplevel 战机等级：子弹额外伤害加成比例与每次开火子弹数
  shipLevelDmgPct: number; // 额外伤害加成 0..0.30
  shipLevelBullets: number; // 单次开火子弹数 1..3
}

export interface EnemyRuntime {
  id: number;
  kind: EnemyKind;
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  cooldownMs: number;
  shieldHp: number;
  phaseT: number; // 移动模式相位
  alive: boolean;
  scoreValue: number;
  // EMP 眩晕状态
  stunnedUntilMs: number;     // > now 表示被眩晕
  shieldDisabledUntilMs: number; // > now 表示护盾失效
}

/** 巡航导弹运行时实体：追踪目标并爆炸。 */
export interface MissileRuntime {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  targetId: number;    // 目标敌人 ID（-1 = 无目标/自由飞行）
  dmg: number;
  speed: number;
  turnRate: number;    // 追踪转向速率（弧度/秒）
  lifeMs: number;
  alive: boolean;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export interface BulletRuntime {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  dmg: number;
  from: "player" | "enemy" | "boss";
  kind: "normal" | "laser" | "big" | "spread";
  lifeMs: number;
  alive: boolean;
  // p8_homing 追踪弹道：> 0 表示追踪转向速率，目标自动锁定最近敌人
  homingTurnRate?: number;
  targetId?: number; // 追踪目标 ID（-1/undefined = 未锁定）
}

/** 僚机运行时实体：跟随玩家移动并自动开火。 */
export interface WingmanRuntime {
  id: number;
  x: number; y: number;
  offsetX: number; // 相对玩家的 X 偏移（-60 或 +60）
  fireCooldownMs: number;
  alive: boolean;
}

export interface BossRuntime {
  kind: BossKind;
  x: number; y: number;
  hp: number; maxHp: number;
  phase: number; // 0..3
  patternT: number;
  cooldownMs: number;
  weakX: number; weakY: number; weakR: number;
  alive: boolean;
}

export type SkillId =
  // 主动技能（4）
  | "s1_missile" | "s2_emp" | "s3_timewarp" | "s4_shield"
  // 被动技能（11）
  | "p1_power" | "p2_regen" | "p3_maxhp" | "p4_maxenergy"
  | "p5_crit" | "p6_lifesteal" | "p7_armor"
  | "p8_homing" | "p9_wingman" | "p10_revive" | "p11_shiplevel";
export type SkillSlot = 0 | 1 | 2 | 3; // 主动技能槽
export type SkillLevel = 0 | 1 | 2 | 3;

export interface SkillDefinition {
  id: SkillId;
  name: string;
  desc: string;
  icon: string;
  isActive: boolean;
  levels: Array<{
    energyCost: number;
    cooldownMs: number;
    durationMs?: number;
    valuePct?: number;       // 主效果数值（比例）
    dmgBonusPct?: number;   // p1_power 攻击强化
    regenPctPer10s?: number; // p2_regen 生命恢复
    maxHpPct?: number;       // p3_maxhp 最大生命
    maxEnergyPct?: number;    // p4_maxenergy 最大能量
    critRate?: number;        // p5_crit 暴击率 0..1
    critMul?: number;         // p5_crit 暴击倍率
    lifestealPct?: number;   // p6_lifesteal 吸血
    armorPct?: number;       // p7_armor 护甲减伤
    missileCount?: number;   // s1_missile 导弹数量
    missileDmg?: number;     // s1_missile 导弹伤害
    empRadius?: number;      // s2_emp 作用半径（px）
    empStunMs?: number;      // s2_emp 眩晕时长
    empShieldBreakMs?: number; // s2_emp 护盾失效时长
    timeScale?: number;       // s3_timewarp 时间流速倍率
    homingTurnRate?: number;  // p8_homing 追踪转向速率（弧度/秒）
    wingmanCount?: number;    // p9_wingman 僚机数量
    wingmanDmgPct?: number;   // p9_wingman 僚机伤害比例（相对主武器）
    reviveCount?: number;     // p10_revive 可复活次数
    reviveHpPct?: number;     // p10_revive 复活恢复 HP 比例
    shieldDurationMs?: number; // s4_shield 超级防御盾持续时间
    shipLevelDmgPct?: number; // p11_shiplevel 战机等级额外伤害加成
    shipLevelBullets?: number; // p11_shiplevel 战机等级单次开火子弹数
  }>;
}

export interface SkillRuntimeState {
  cooldowns: Record<SkillSlot, number>;
  levels: Record<SkillId, SkillLevel>;
  lastCastAt: Record<SkillId, number>;
  // 时间扭曲运行时
  timeWarpUntilMs: number;
  timeWarpScale: number;
}

export interface SaveSlot {
  version: 1;
  slot: 0 | 1 | 2;
  name: string;
  savedAtMs: number;
  level: number; // 当前到达关卡 1..10
  totalScore: number;
  bestScore: number;
  skills: Record<SkillId, SkillLevel>;
  skillPoints: number;
  clearedLevels: number; // 1..10 已通多少
  unlockedAchievements: string[];
  settings: {
    sfx: number; bgm: number; quality: QualityTier | "auto"; input: InputMode;
  };
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export interface LevelClearResult {
  level: number;
  grade: Grade;
  score: number;
  timeMs: number;
  hpLeftPct: number;
  skillsUsed: number;
  skillPointReward: number;
}
