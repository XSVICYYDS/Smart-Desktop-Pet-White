/** 成就系统（72 项）：事件钩子 + 解锁记录。 */
import { ACHIEVEMENTS } from "../config";
import type { Achievement } from "../types";

export interface AchievementState {
  unlocked: Set<string>;
  listeners: Array<(id: string, achievement: Achievement) => void>;
}

export function createAchievementState(unlockedIds: string[] = []): AchievementState {
  return { unlocked: new Set(unlockedIds), listeners: [] };
}

export function onAchievementUnlock(s: AchievementState, cb: (id: string, a: Achievement) => void): () => void {
  s.listeners.push(cb);
  return () => { s.listeners = s.listeners.filter((x) => x !== cb); };
}

export function unlockAchievement(s: AchievementState, id: string): Achievement | null {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return null;
  if (s.unlocked.has(id)) return null;
  s.unlocked.add(id);
  for (const cb of s.listeners) {
    try { cb(id, a); } catch { /* 防止 UI 回调抛错影响游戏逻辑 */ }
  }
  return a;
}

/** 得分挂钩：10k/50k/100k/250k/500k/1M/5M 里程碑。 */
export function tryScoreAchievements(s: AchievementState, score: number): Achievement[] {
  const out: Achievement[] = [];
  if (score >= 10_000) { const u = unlockAchievement(s, "score_10k"); if (u) out.push(u); }
  if (score >= 50_000) { const u = unlockAchievement(s, "score_50k"); if (u) out.push(u); }
  if (score >= 100_000) { const u = unlockAchievement(s, "score_100k"); if (u) out.push(u); }
  if (score >= 250_000) { const u = unlockAchievement(s, "score_250k"); if (u) out.push(u); }
  if (score >= 500_000) { const u = unlockAchievement(s, "score_500k"); if (u) out.push(u); }
  if (score >= 1_000_000) { const u = unlockAchievement(s, "score_1m"); if (u) out.push(u); }
  if (score >= 5_000_000) { const u = unlockAchievement(s, "score_5m"); if (u) out.push(u); }
  return out;
}

/** BOSS 通关关卡列表：用数组遍历替代大量 if，便于扩展。 */
const BOSS_CLEAR_LEVELS = [
  3, 6, 9, 10, 13, 15, 18, 21, 24, 27, 30,
  33, 36, 39, 42, 44, 46, 48, 50,
  55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  105, 110, 115, 120, 125, 130, 135, 140, 145, 150,
];

export function tryClearLevelAchievements(
  s: AchievementState,
  level: number,
  hpPct: number,
  skillUsed: number,
  dmgTaken: number,
  isBoss: boolean,
): Achievement[] {
  const out: Achievement[] = [];
  // ===== BOSS 关卡通关 =====
  for (const lv of BOSS_CLEAR_LEVELS) {
    if (level >= lv) {
      const u = unlockAchievement(s, `clear_lv${lv}`);
      if (u) out.push(u);
    }
  }
  // ===== 关卡进度里程碑 =====
  if (level >= 30) { const u = unlockAchievement(s, "level_clear_30"); if (u) out.push(u); }
  if (level >= 50) { const u = unlockAchievement(s, "level_clear_50"); if (u) out.push(u); }
  if (level >= 75) { const u = unlockAchievement(s, "level_clear_75"); if (u) out.push(u); }
  if (level >= 100) { const u = unlockAchievement(s, "level_clear_100"); if (u) out.push(u); }
  if (level >= 125) { const u = unlockAchievement(s, "level_clear_125"); if (u) out.push(u); }
  if (level >= 150) { const u = unlockAchievement(s, "level_clear_150"); if (u) out.push(u); }
  // ===== 挑战类 =====
  if (!isBoss && hpPct >= 0.999) { const u = unlockAchievement(s, "flawless"); if (u) out.push(u); }
  if (isBoss && hpPct >= 0.999) { const u = unlockAchievement(s, "flawless_boss"); if (u) out.push(u); }
  if (isBoss && dmgTaken < 25) { const u = unlockAchievement(s, "bullet_dodger"); if (u) out.push(u); }
  if (level >= 13 && isBoss && dmgTaken < 10) { const u = unlockAchievement(s, "bullet_phantom"); if (u) out.push(u); }
  if (!isBoss && level >= 1 && skillUsed === 0) { const u = unlockAchievement(s, "no_powerups"); if (u) out.push(u); }
  if (isBoss && skillUsed === 0) { const u = unlockAchievement(s, "no_powerups_boss"); if (u) out.push(u); }
  return out;
}
