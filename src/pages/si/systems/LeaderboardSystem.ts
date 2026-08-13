/** 简单本地排行榜（localStorage top10）。 */
const KEY = "si_leaderboard_v1";

export interface LeaderboardEntry { name: string; score: number; level: number; atMs: number }

export function loadLeaderboard(): LeaderboardEntry[] {
  try { const raw = localStorage.getItem(KEY); if (!raw) return []; return JSON.parse(raw) as LeaderboardEntry[]; } catch { return []; }
}

export function submitScore(entry: LeaderboardEntry): LeaderboardEntry[] {
  const list = loadLeaderboard();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(top));
  return top;
}
