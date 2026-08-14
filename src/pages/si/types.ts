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
  | "s1_nuke" | "s2_shield" | "s3_haste"
  | "s4_cruise" | "s5_emp" | "s6_timewarp"
  | "p1_power" | "p2_regen" | "p3_maxhp" | "p4_maxenergy" | "p5_crit" | "p6_lifesteal" | "p7_armor";
export type SkillSlot = 0 | 1 | 2; // 主动技能槽
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
    valuePct?: number; // 主效果数值（比例），主动技能通常需要
    dmgBonusPct?: number; // p1_power 被动
    regenPctPer10s?: number; // p2_regen 被动
  }>;
}

export interface SkillRuntimeState {
  // 主动：冷却剩余 / 等级
  cooldowns: Record<SkillSlot, number>;
  levels: Record<SkillId, SkillLevel>;
  lastCastAt: Record<SkillId, number>;
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
