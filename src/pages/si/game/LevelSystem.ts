/** 关卡系统：波次刷怪 + 动态难度（速度±20% / 生命±30% / 攻击频率±25%）+ 评分/奖励。 */
import { BALANCE, calcGrade, LEVELS } from "../config";
import { spawnEnemy, stepEnemy } from "./EnemyFactory";
import type { BossRuntime, EnemyRuntime, LevelClearResult, PlayerRuntime, SkillRuntimeState } from "../types";
import type { BossKind } from "../types";

export interface LevelRuntime {
  index: number;
  startedAtMs: number;
  clearedAtMs: number | null;
  wavesRemaining: number;
  spawnedAll: boolean;
  skillsUsed: number;
  totalDamageTaken: number;
  dynamicMul: { hp: number; speed: number; freq: number };
  enemies: EnemyRuntime[];
}

function clamp(a: number, b: number, v: number): number { return Math.max(a, Math.min(b, v)); }

/** 依据玩家表现动态计算难度系数。 */
export function computeDynamicMul(player: PlayerRuntime, elapsedMs: number): LevelRuntime["dynamicMul"] {
  const hpPct = player.hp / Math.max(1, player.maxHp);
  const timeWeight = Math.min(1.5, elapsedMs / 120_000);
  const pressure = Math.max(0.25, Math.min(1.25, hpPct * 0.9 + (1 - timeWeight) * 0.35));
  const protective = hpPct < BALANCE.PROTECTION_HP_PCT ? -0.20 : 0;
  const speed = clamp(BALANCE.DYNAMIC_SPEED_MIN, BALANCE.DYNAMIC_SPEED_MAX, 0.9 + pressure * 0.25 + protective);
  const hp = clamp(BALANCE.DYNAMIC_HP_MIN, BALANCE.DYNAMIC_HP_MAX, 0.85 + pressure * 0.35 + protective);
  const freq = clamp(BALANCE.DYNAMIC_FREQ_MIN, BALANCE.DYNAMIC_FREQ_MAX, 0.85 + pressure * 0.30 + protective);
  return { speed, hp, freq };
}

export function startLevel(index: number, nowMs: number): LevelRuntime {
  const level = LEVELS[index];
  const enemies: EnemyRuntime[] = [];
  if (level && !level.isBoss) {
    const mul = { hp: 1, speed: 1, freq: 1 };
    const firstWave = level.waves[0] || [];
    for (const w of firstWave) enemies.push(spawnEnemy(w.kind, w.x, w.y, mul));
  }
  return {
    index,
    startedAtMs: nowMs,
    clearedAtMs: null,
    wavesRemaining: level ? Math.max(0, level.waves.length - 1) : 0,
    spawnedAll: (level?.waves.length || 0) <= 1,
    skillsUsed: 0,
    totalDamageTaken: 0,
    dynamicMul: { hp: 1, speed: 1, freq: 1 },
    enemies,
  };
}

/** 单帧刷新关卡敌人逻辑；BOSS 交给 BossSystem 自身。 */
export function tickLevelEnemies(
  lr: LevelRuntime,
  dtMs: number,
  shootCallback: (e: EnemyRuntime) => void,
): void {
  for (let i = 0; i < lr.enemies.length; i++) {
    const e = lr.enemies[i];
    if (!e.alive) continue;
    const shouldFire = stepEnemy(e, dtMs, lr.dynamicMul);
    if (shouldFire) shootCallback(e);
  }
}

/** 关卡清场/击杀 BOSS 结算。 */
export function finalizeClear(
  lr: LevelRuntime,
  player: PlayerRuntime,
  _skills: SkillRuntimeState,
  nowMs: number,
  boss: BossRuntime | null,
): LevelClearResult | null {
  if (lr.clearedAtMs !== null) return null;
  const cleared = boss ? !boss.alive : lr.enemies.every((e) => !e.alive);
  if (!cleared) return null;
  lr.clearedAtMs = nowMs;
  const def = LEVELS[lr.index];
  const timeMs = Math.max(1, nowMs - lr.startedAtMs);
  const hpPct = Math.max(0, player.hp / Math.max(1, player.maxHp));
  const g = calcGrade({ timeMs, recommendedMs: def?.recommendedTimeMs || 90_000, hpPct, skillsUsed: lr.skillsUsed, boss: !!boss });
  return {
    level: lr.index + 1,
    grade: g.grade,
    score: g.score,
    timeMs,
    hpLeftPct: hpPct,
    skillsUsed: lr.skillsUsed,
    skillPointReward: g.skillPointReward,
  };
}

export function bossKindOfLevel(index: number): BossKind | null {
  const def = LEVELS[index];
  return def?.boss || null;
}
