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

/** 得分挂钩：10k/50k/100k/250k/500k/1M 里程碑。 */
export function tryScoreAchievements(s: AchievementState, score: number): Achievement[] {
  const out: Achievement[] = [];
  if (score >= 10_000) { const u = unlockAchievement(s, "score_10k"); if (u) out.push(u); }
  if (score >= 50_000) { const u = unlockAchievement(s, "score_50k"); if (u) out.push(u); }
  if (score >= 100_000) { const u = unlockAchievement(s, "score_100k"); if (u) out.push(u); }
  if (score >= 250_000) { const u = unlockAchievement(s, "score_250k"); if (u) out.push(u); }
  if (score >= 500_000) { const u = unlockAchievement(s, "score_500k"); if (u) out.push(u); }
  if (score >= 1_000_000) { const u = unlockAchievement(s, "score_1m"); if (u) out.push(u); }
  return out;
}

export function tryClearLevelAchievements(
  s: AchievementState,
  level: number,
  hpPct: number,
  skillUsed: number,
  dmgTaken: number,
  isBoss: boolean,
): Achievement[] {
  const out: Achievement[] = [];
  // ===== BOSS 关卡通关：L3/6/9/10 + L11-30 的 6 个 + L31-50 的 8 个 =====
  if (level >= 3) { const u = unlockAchievement(s, "clear_lv3"); if (u) out.push(u); }
  if (level >= 6) { const u = unlockAchievement(s, "clear_lv6"); if (u) out.push(u); }
  if (level >= 9) { const u = unlockAchievement(s, "clear_lv9"); if (u) out.push(u); }
  if (level >= 10) { const u = unlockAchievement(s, "clear_lv10"); if (u) out.push(u); }
  if (level >= 13) { const u = unlockAchievement(s, "clear_lv13"); if (u) out.push(u); }
  if (level >= 15) { const u = unlockAchievement(s, "clear_lv15"); if (u) out.push(u); }
  if (level >= 18) { const u = unlockAchievement(s, "clear_lv18"); if (u) out.push(u); }
  if (level >= 21) { const u = unlockAchievement(s, "clear_lv21"); if (u) out.push(u); }
  if (level >= 24) { const u = unlockAchievement(s, "clear_lv24"); if (u) out.push(u); }
  if (level >= 27) { const u = unlockAchievement(s, "clear_lv27"); if (u) out.push(u); }
  if (level >= 30) { const u = unlockAchievement(s, "clear_lv30"); if (u) out.push(u); }
  if (level >= 33) { const u = unlockAchievement(s, "clear_lv33"); if (u) out.push(u); }
  if (level >= 36) { const u = unlockAchievement(s, "clear_lv36"); if (u) out.push(u); }
  if (level >= 39) { const u = unlockAchievement(s, "clear_lv39"); if (u) out.push(u); }
  if (level >= 42) { const u = unlockAchievement(s, "clear_lv42"); if (u) out.push(u); }
  if (level >= 44) { const u = unlockAchievement(s, "clear_lv44"); if (u) out.push(u); }
  if (level >= 46) { const u = unlockAchievement(s, "clear_lv46"); if (u) out.push(u); }
  if (level >= 48) { const u = unlockAchievement(s, "clear_lv48"); if (u) out.push(u); }
  if (level >= 50) { const u = unlockAchievement(s, "clear_lv50"); if (u) out.push(u); }
  // ===== 关卡进度里程碑 =====
  if (level >= 30) { const u = unlockAchievement(s, "level_clear_30"); if (u) out.push(u); }
  if (level >= 50) { const u = unlockAchievement(s, "level_clear_50"); if (u) out.push(u); }
  // ===== 挑战类 =====
  if (!isBoss && hpPct >= 0.999) { const u = unlockAchievement(s, "flawless"); if (u) out.push(u); }
  if (isBoss && hpPct >= 0.999) { const u = unlockAchievement(s, "flawless_boss"); if (u) out.push(u); }
  if (isBoss && dmgTaken < 25) { const u = unlockAchievement(s, "bullet_dodger"); if (u) out.push(u); }
  if (level >= 13 && isBoss && dmgTaken < 10) { const u = unlockAchievement(s, "bullet_phantom"); if (u) out.push(u); }
  if (!isBoss && level >= 1 && skillUsed === 0) { const u = unlockAchievement(s, "no_powerups"); if (u) out.push(u); }
  if (isBoss && skillUsed === 0) { const u = unlockAchievement(s, "no_powerups_boss"); if (u) out.push(u); }
  return out;
}
