/** 3 存档槽系统（localStorage + 校验和 + 槽预览/删除）。 */
import type { QualityTier } from "../engine/HardwareDetect";
import type { SaveSlot, SkillId, SkillLevel } from "../types";

const PREFIX = "si_save_v1_";
const SKILLS_ALL: SkillId[] = ["s1_nuke", "s2_shield", "s3_haste", "s4_cruise", "s5_emp", "s6_timewarp", "p1_power", "p2_regen", "p3_maxhp", "p4_maxenergy", "p5_crit", "p6_lifesteal", "p7_armor"];

const zeroSkills = (): Record<SkillId, SkillLevel> => ({ s1_nuke: 0, s2_shield: 0, s3_haste: 0, s4_cruise: 0, s5_emp: 0, s6_timewarp: 0, p1_power: 0, p2_regen: 0, p3_maxhp: 0, p4_maxenergy: 0, p5_crit: 0, p6_lifesteal: 0, p7_armor: 0 });

export function emptySlot(slot: 0 | 1 | 2): SaveSlot {
  return {
    version: 1, slot, name: `存档 ${slot + 1}`, savedAtMs: 0,
    level: 1, totalScore: 0, bestScore: 0,
    skills: zeroSkills(), skillPoints: 0, clearedLevels: 0,
    unlockedAchievements: [],
    settings: { sfx: 0.8, bgm: 0.6, quality: "auto", input: "keyboard" },
  };
}

function checksum(s: SaveSlot): number {
  const core =
    `${s.version}:${s.slot}:${s.level}:${s.totalScore}:${s.bestScore}:` +
    `${s.skillPoints}:${s.clearedLevels}:${SKILLS_ALL.map((k) => s.skills[k]).join(",")}:` +
    s.unlockedAchievements.length;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < core.length; i++) {
    h ^= core.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function loadSlot(slot: 0 | 1 | 2): SaveSlot {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return emptySlot(slot);
    const parsed = JSON.parse(raw) as { data: SaveSlot; check: number };
    if (!parsed || !parsed.data || parsed.check !== checksum(parsed.data)) return emptySlot(slot);
    return { ...emptySlot(slot), ...parsed.data, skills: { ...zeroSkills(), ...(parsed.data.skills || {}) } };
  } catch {
    return emptySlot(slot);
  }
}

export function saveSlot(slot: SaveSlot): void {
  slot.savedAtMs = Date.now();
  const payload = { data: slot, check: checksum(slot) };
  localStorage.setItem(PREFIX + slot.slot, JSON.stringify(payload));
}

export function deleteSlot(slot: 0 | 1 | 2): void {
  localStorage.removeItem(PREFIX + slot);
}

export type { SaveSlot };
export type { SkillLevel, SkillId };

export function previewSlots(): Array<SaveSlot & { exists: boolean }> {
  return [0, 1, 2].map((i) => {
    const s = loadSlot(i as 0 | 1 | 2);
    return { ...s, exists: s.savedAtMs > 0 };
  });
}

export type { QualityTier };
