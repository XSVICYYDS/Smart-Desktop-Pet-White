/** 硬件检测 + 自适应画质档位（低/中/高）。 */
export type QualityTier = "low" | "medium" | "high";

export interface HardwareInfo {
  cores: number;
  memoryGB: number | null;
  dpr: number;
  viewport: { w: number; h: number };
  isMobile: boolean;
  isLowEnd: boolean;
}

export interface QualityProfile {
  tier: QualityTier;
  parallaxLayers: number; // 1/2/4
  maxParticles: number; // 120 / 240 / 480
  enableLighting: boolean; // F/T/T
  enableShockwave: boolean;
  spriteScale: number; // 0.75 / 1 / 1.25
  targetDPR: number; // 1 / dpr capped 1.5 / native
}

/** 检测硬件信息（Node SSR 安全兜底）。 */
export function detectHardware(): HardwareInfo {
  const nav = (typeof globalThis !== "undefined" && (globalThis as { navigator?: Navigator }).navigator) || null;
  const win = (typeof globalThis !== "undefined" && (globalThis as { window?: Window }).window) || null;
  const cores = (nav && typeof (nav as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency === "number"
    ? ((nav as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency as number)
    : 4);
  const memKey = "deviceMemory" as keyof Navigator;
  const memoryGB = nav && typeof (nav as unknown as Record<string, unknown>)[memKey as string] === "number"
    ? ((nav as unknown as Record<string, number>)[memKey as string] as number)
    : null;
  const dpr = win && typeof win.devicePixelRatio === "number" ? win.devicePixelRatio : 1;
  const vw = win && win.innerWidth ? win.innerWidth : 1280;
  const vh = win && win.innerHeight ? win.innerHeight : 720;
  const ua = nav ? nav.userAgent : "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(ua);
  const isLowEnd = cores <= 2 || (memoryGB !== null && memoryGB <= 2) || (isMobile && cores <= 4);
  return { cores: cores | 0, memoryGB, dpr, viewport: { w: vw, h: vh }, isMobile, isLowEnd };
}

/** 把硬件信息映射到画质档位 + 具体参数。 */
export function selectQualityProfile(hw: HardwareInfo, override?: QualityTier | null): QualityProfile {
  let tier: QualityTier;
  if (override) {
    tier = override;
  } else if (hw.isLowEnd) {
    tier = "low";
  } else if (hw.cores >= 8 && (!hw.memoryGB || hw.memoryGB >= 6) && !hw.isMobile) {
    tier = "high";
  } else {
    tier = "medium";
  }
  switch (tier) {
    case "low":
      return { tier, parallaxLayers: 1, maxParticles: 120, enableLighting: false, enableShockwave: false, spriteScale: 0.75, targetDPR: 1 };
    case "high":
      return { tier, parallaxLayers: 4, maxParticles: 480, enableLighting: true, enableShockwave: true, spriteScale: 1.25, targetDPR: Math.min(2, hw.dpr) };
    case "medium":
    default:
      return { tier, parallaxLayers: 2, maxParticles: 240, enableLighting: false, enableShockwave: true, spriteScale: 1, targetDPR: Math.min(1.5, hw.dpr) };
  }
}
