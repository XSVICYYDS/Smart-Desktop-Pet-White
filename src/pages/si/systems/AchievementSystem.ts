/** 成就系统（15 项）：事件钩子 + 解锁记录。 */
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

/** 得分挂钩：10k/50k/100k 三个成就。 */
export function tryScoreAchievements(s: AchievementState, score: number): Achievement[] {
  const out: Achievement[] = [];
  if (score >= 10_000) { const u = unlockAchievement(s, "score_10k"); if (u) out.push(u); }
  if (score >= 50_000) { const u = unlockAchievement(s, "score_50k"); if (u) out.push(u); }
  if (score >= 100_000) { const u = unlockAchievement(s, "score_100k"); if (u) out.push(u); }
  return out;
}

export function tryClearLevelAchievements(
  s: AchievementState,
  level: number,
  hpPct: number,
  skillUsed: number,
  dmgTaken: number,
): Achievement[] {
  const out: Achievement[] = [];
  if (level >= 3) { const u = unlockAchievement(s, "clear_lv3"); if (u) out.push(u); }
  if (level >= 6) { const u = unlockAchievement(s, "clear_lv6"); if (u) out.push(u); }
  if (level >= 9) { const u = unlockAchievement(s, "clear_lv9"); if (u) out.push(u); }
  if (level >= 10) { const u = unlockAchievement(s, "clear_lv10"); if (u) out.push(u); }
  if (hpPct >= 0.999) { const u = unlockAchievement(s, "flawless"); if (u) out.push(u); }
  if (level >= 3 && dmgTaken < 25) { const u = unlockAchievement(s, "bullet_dodger"); if (u) out.push(u); }
  if (level >= 1 && skillUsed === 0) { const u = unlockAchievement(s, "no_powerups"); if (u) out.push(u); }
  return out;
}
