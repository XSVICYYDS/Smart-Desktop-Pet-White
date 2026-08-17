/** 太空侵略者终极版顶层 Container：把 28 模块组合起来对外以单组件暴露。 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ACHIEVEMENTS, BALANCE, ENEMY_STATS, LEVELS, WORLD } from "./config";
import { useGameLoop } from "./game/useGameLoop";
import {
  computeDynamicMul, finalizeClear, startLevel, tickLevelEnemies, bossKindOfLevel, type LevelRuntime,
} from "./game/LevelSystem";
import { applyBossDamage, createBoss, resetBossBulletIds, tickBoss } from "./game/BossSystem";
import {
  clampLv, computePlayerBulletDamage, createInitialSkillState, skillLevelCfg, tickSkills, tryBlock, tryCastActive,
} from "./game/SkillSystem";
import { resetEnemyIds, spawnEnemy } from "./game/EnemyFactory";

import { BatchRenderer } from "./engine/BatchRenderer";
import { detectHardware, selectQualityProfile, type QualityProfile } from "./engine/HardwareDetect";
import { intersectsAABB, SpatialHash, type Bounded } from "./engine/SpatialHash";

import { drawParallax, createParallax, tickParallax, type ParallaxState } from "./render/ParallaxBackground";
import { addLight, createLighting, drawLighting, type LightingState } from "./render/DynamicLighting";
import {
  drawBoss, drawEnemy, drawPlayer,
  createFloatTexts, createParticleSystem, drawFloats, drawParticles, spawnBurst, spawnFloatText, stepFloats, stepParticles,
  type FloatText, type Particle,
} from "./render/UIAssets";

import { MainMenu } from "./ui/MainMenu";
import { HUD } from "./ui/HUD";
import { SettingsPanel } from "./ui/SettingsPanel";
import { SkillTree } from "./ui/SkillTree";
import { SaveSlots } from "./ui/SaveSlots";
import { AchievementBoard } from "./ui/AchievementBoard";
import { TransitionOverlay, type TransitionKind } from "./ui/TransitionOverlay";
import { TouchControls } from "./ui/TouchControls";
import { GameOverScreen } from "./ui/GameOverScreen";
import { LevelSelect } from "./ui/LevelSelect";

import type { InputMode, LevelClearResult, PlayerRuntime, ScreenState, SkillId, SkillLevel, SkillRuntimeState } from "./types";
import type { BossRuntime, BulletRuntime, EnemyRuntime } from "./types";

import {
  createAchievementState, onAchievementUnlock, unlockAchievement,
  tryClearLevelAchievements, tryScoreAchievements, type AchievementState,
} from "./systems/AchievementSystem";
import {
  ensureAudio, playBGM, playSFX, setBgmVolume, setSfxVolume,
} from "./systems/AudioSystem";
import { emptySlot, loadSlot, saveSlot, type SaveSlot } from "./systems/SaveSystem";
import type { QualityTier } from "./engine/HardwareDetect";

let BULLET_ID = 1;

export interface ContainerProps {
  onFinalize?: (finalScore: number, isNewRecordHint: boolean) => void;
  initialGameId?: string;
}

type TabId = "play" | "settings" | "skills" | "leaderboard" | "help";

function bossTitle(k: NonNullable<BossRuntime>["kind"]): string {
  switch (k) {
    case "guardian": return "外星护卫者";
    case "corruptor": return "腐蚀者";
    case "mothership": return "元首母舰";
    case "fuhrer": return "元首本体";
  }
}

/** 顶层组件：组合 si/* 下所有模块，完成单组件封装。 */
export const Container: React.FC<ContainerProps> = (props) => {
  void props.initialGameId;
  const [tab, setTab] = useState<TabId>("play");

  // ===== 硬件/画质（一次检测，允许设置覆盖）=====
  const [quality, setQuality] = useState<QualityTier | "auto">("auto");
  const [hardware] = useState(() => detectHardware());
  const profile: QualityProfile = useMemo(() => selectQualityProfile(hardware, quality === "auto" ? null : quality), [hardware, quality]);

  // ===== 存档 / 全局进度 =====
  const [, setSlotIndex] = useState<0 | 1 | 2>(0);
  const [saveTick, setSaveTick] = useState(0);
  const [save, setSave] = useState<SaveSlot>(() => loadSlot(0));
  const applySave = (s: SaveSlot) => { setSave(s); setSlotIndex(s.slot); setSaveTick((x) => x + 1); };

  // ===== 设置 =====
  const [inputMode, setInputMode] = useState<InputMode>(save.settings.input || (hardware.isMobile ? "touch" : "keyboard"));
  const [sfxVol, setSfxVolState] = useState<number>(save.settings.sfx);
  const [bgmVol, setBgmVolState] = useState<number>(save.settings.bgm);
  useEffect(() => { setSfxVolume(sfxVol); }, [sfxVol]);
  useEffect(() => { setBgmVolume(bgmVol); }, [bgmVol]);

  // ===== 面板开关 =====
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [savesOpen, setSavesOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [levelSelectOpen, setLevelSelectOpen] = useState(false);
  const [screen, setScreen] = useState<ScreenState>("menu");
  const paused = screen === "paused";

  // ===== 游戏内浮层 / 过渡动画 =====
  const [transTick, setTransTick] = useState(0);
  const [transKind, setTransKind] = useState<TransitionKind>("level-start");
  const [transTitle, setTransTitle] = useState<string | undefined>(undefined);
  const [transSub, setTransSub] = useState<string | undefined>(undefined);
  const fireTransition = (k: TransitionKind, title?: string, sub?: string) => {
    setTransKind(k); setTransTitle(title); setTransSub(sub); setTransTick((x) => x + 1);
  };

  // ===== 成就 =====
  const achStateRef = useRef<AchievementState>(createAchievementState(save.unlockedAchievements));
  useEffect(() => {
    achStateRef.current = createAchievementState(save.unlockedAchievements);
  }, [save.unlockedAchievements, saveTick]);
  const [toastAch, setToastAch] = useState<string | null>(null);
  useEffect(() => {
    return onAchievementUnlock(achStateRef.current, (_id, a) => {
      setToastAch(`${a.icon} ${a.name}`);
      playSFX("achievement");
      window.setTimeout(() => setToastAch((cur) => (cur === `${a.icon} ${a.name}` ? null : cur)), 2200);
    });
  }, []);

  // ===== 画布 =====
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ===== 玩家 & 运行时 =====
  const makePlayer = (): PlayerRuntime => ({
    x: WORLD.WIDTH / 2,
    y: WORLD.PLAYER_Y,
    vx: 0, baseSpeed: BALANCE.PLAYER_BASE_SPEED,
    hp: BALANCE.BASE_HP, maxHp: BALANCE.BASE_HP,
    energy: BALANCE.BASE_ENERGY, maxEnergy: BALANCE.BASE_ENERGY,
    shieldHits: 0, shieldUntilMs: 0, speedBoostUntilMs: 0,
    fireCooldownMs: 0, invulnUntilMs: 0,
  });

  const makeSkills = (s: SaveSlot): SkillRuntimeState => ({
    ...createInitialSkillState(),
    levels: { ...s.skills },
  });

  const playerRef = useRef<PlayerRuntime>(makePlayer());
  const skillsRef = useRef<SkillRuntimeState>(makeSkills(save));
  const bulletsRef = useRef<BulletRuntime[]>([]);
  const levelRuntimeRef = useRef<LevelRuntime | null>(null);
  const bossRef = useRef<BossRuntime | null>(null);
  const scoreRef = useRef<number>(0);
  const statsRef = useRef<{ killed: number; skillsUsed: number; totalDamageTaken: number }>({ killed: 0, skillsUsed: 0, totalDamageTaken: 0 });
  const clearResultRef = useRef<LevelClearResult | null>(null);
  const particlesRef = useRef<Particle[]>(createParticleSystem());
  const floatsRef = useRef<FloatText[]>(createFloatTexts());
  const parallaxRef = useRef<ParallaxState>(createParallax(profile.maxParticles >= 240 ? 260 : 140));
  const lightingRef = useRef<LightingState>(createLighting());
  const hashRef = useRef<SpatialHash<Bounded & { id?: number; ref?: unknown }>>(new SpatialHash(96));
  const batchRef = useRef<BatchRenderer>(new BatchRenderer());

  const keysRef = useRef<Record<string, boolean>>({});
  const inputDirRef = useRef<-1 | 0 | 1>(0);
  const inputDirYRef = useRef<-1 | 0 | 1>(0);
  const shootBtnRef = useRef(false);
  const mouseXRef = useRef<number | null>(null);
  const mouseYRef = useRef<number | null>(null);
  const mouseDownRef = useRef(false);
  const shootHoldRef = useRef(false);
  void shootHoldRef;
  void inputDirYRef;

  const [currentLevelIndex, setCurrentLevelIndex] = useState(Math.max(0, save.level - 1));
  const [hudTick, setHudTick] = useState(0);
  const hudThrottleRef = useRef(0);

  /** 成就辅助：单 id 解锁（已在 import 直接拿到 unlockAchievement）。 */
  const unlockSingle = (st: AchievementState, id: string) => unlockAchievement(st, id);
  const unlockAchs = (ids: string[]) => {
    const st = achStateRef.current;
    for (const id of ids) unlockSingle(st, id);
  };

  /** 启动一关。 */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bootLevel = useCallback((idx: number) => {
    const safe = Math.max(0, Math.min(LEVELS.length - 1, idx));
    setCurrentLevelIndex(safe);
    const now = performance.now();
    const lv = startLevel(safe, now);
    skillsRef.current = makeSkills(save);
    playerRef.current = makePlayer();
    const bossKind = bossKindOfLevel(safe);
    if (bossKind) {
      resetBossBulletIds();
      bossRef.current = createBoss(bossKind);
      lv.enemies = [];
    } else {
      bossRef.current = null;
    }
    bulletsRef.current = [];
    levelRuntimeRef.current = lv;
    clearResultRef.current = null;
    statsRef.current = { killed: 0, skillsUsed: 0, totalDamageTaken: 0 };
    scoreRef.current = 0;
    particlesRef.current = createParticleSystem();
    floatsRef.current = createFloatTexts();
    resetEnemyIds();
    const def = LEVELS[safe];
    playBGM(def?.isBoss ? "boss" : "battle");
    setScreen("playing");
    fireTransition("level-start", `${safe + 1}. ${def?.name ?? "未知关卡"}`, def?.isBoss ? "BOSS 战 · 集中火力攻击弱点！" : "消灭所有外星单位即可过关");
  }, [save]);

  /** 从主菜单点击存档槽开始。 */
  const handleStartSlot = (s: 0 | 1 | 2) => {
    ensureAudio();
    playSFX("click");
    const loaded = loadSlot(s);
    applySave(loaded.savedAtMs ? loaded : { ...emptySlot(s) });
    setQuality(loaded.settings.quality || "auto");
    setInputMode(loaded.settings.input || (hardware.isMobile ? "touch" : "keyboard"));
    setSfxVolState(loaded.settings.sfx);
    setBgmVolState(loaded.settings.bgm);
    const startIdx = Math.max(0, (loaded.level || 1) - 1);
    playBGM("menu");
    // 状态更新滞后一次，用 setTimeout 保证 save 已生效
    window.setTimeout(() => bootLevel(startIdx), 10);
  };

  // ===== 键盘事件 =====
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) e.preventDefault();
      if (k === "p" || k === "escape") {
        e.preventDefault();
        if (screen === "playing") {
          setScreen("paused");
          playBGM("menu");
          fireTransition("pause");
        } else if (screen === "paused") {
          const def = LEVELS[currentLevelIndex];
          playBGM(def?.isBoss ? "boss" : "battle");
          setScreen("playing");
        }
      }
      if (screen !== "playing") return;
      if (k === "q") castSlot(0);
      if (k === "e") castSlot(1);
      if (k === "shift") castSlot(2);
    };
    const onUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, currentLevelIndex]);

  // ===== 鼠标事件 =====
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const toLogicalX = (clientX: number) => {
      const r = c.getBoundingClientRect();
      return ((clientX - r.left) / r.width) * WORLD.WIDTH;
    };
    const toLogicalY = (clientY: number) => {
      const r = c.getBoundingClientRect();
      return ((clientY - r.top) / r.height) * WORLD.HEIGHT;
    };
    const onMouseMove = (e: MouseEvent) => {
      mouseXRef.current = toLogicalX(e.clientX);
      mouseYRef.current = toLogicalY(e.clientY);
    };
    const onDown = (e: MouseEvent) => { if (e.button === 0) mouseDownRef.current = true; ensureAudio(); };
    const onUp = (e: MouseEvent) => { if (e.button === 0) mouseDownRef.current = false; };
    const onWheel = (e: WheelEvent) => {
      if (screen !== "playing") return;
      e.preventDefault();
      castSlot(e.deltaY >= 0 ? 0 : 2);
    };
    c.addEventListener("mousemove", onMouseMove);
    c.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      c.removeEventListener("mousemove", onMouseMove);
      c.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      c.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, currentLevelIndex]);

  /** 主动技能释放。 */
  function castSlot(slot: 0 | 1 | 2): void {
    if (screen !== "playing") return;
    const now = performance.now();
    const r = tryCastActive(skillsRef.current, slot, playerRef.current, now);
    if (!r) return;
    const lr = levelRuntimeRef.current;
    if (lr) lr.skillsUsed += 1;
    statsRef.current.skillsUsed += 1;
    if (r.skill === "s1_nuke") {
      playSFX("nuke");
      fireTransition("skill-nuke");
      for (const e of lr?.enemies || []) {
        if (!e.alive) continue;
        applyEnemyDamage(e, e.maxHp + 1, e.x, e.y);
      }
      const b = bossRef.current;
      if (b && b.alive) {
        const d = Math.max(1, Math.round(b.maxHp * (r.cfg.valuePct ?? 0.5)));
        const final = applyBossDamage(b, d, b.weakX, b.weakY);
        spawnFloatText(floatsRef.current, b.weakX, b.weakY - 30, `-${final}`, "#fde68a", 28, 900);
        spawnBurst(particlesRef.current, b.x, b.y, 60, ["#fde047", "#f59e0b", "#ef4444", "#fca5a5"], 6, 4, 900);
        if (profile.enableLighting) addLight(lightingRef.current, b.x, b.y, 600, "#fde68a", 0.8);
      }
      for (const bl of bulletsRef.current) { if (bl.from !== "player") bl.alive = false; }
    } else if (r.skill === "s2_shield") {
      playSFX("shield");
      fireTransition("skill-shield", "护盾展开", `可抵挡 ${Math.round(r.cfg.valuePct ?? 0)} 次，持续 ${((r.cfg.durationMs || 0) / 1000).toFixed(1)} 秒`);
    } else if (r.skill === "s3_haste") {
      playSFX("haste");
      fireTransition("skill-haste", "引擎过载", `速度倍率 ×${(r.cfg.valuePct ?? 0).toFixed(2)}，持续 ${((r.cfg.durationMs || 0) / 1000).toFixed(1)} 秒`);
    } else if (r.skill === "s4_cruise") {
      playSFX("missile");
      const targetCount = r.cfg.valuePct ?? 3;
      const targets = (lr?.enemies || []).filter(e => e.alive).slice(0, targetCount);
      for (const e of targets) {
        applyEnemyDamage(e, BALANCE.PLAYER_BULLET_DMG * (r.cfg.dmgBonus ?? 2.0), e.x, e.y);
        spawnBurst(particlesRef.current, e.x, e.y, 20, ["#f97316", "#ef4444", "#fde047"], 5, 3, 500);
      }
      const b = bossRef.current;
      if (b && b.alive) {
        const d = Math.max(1, Math.round(b.maxHp * 0.15 * (r.cfg.dmgBonus ?? 2.0)));
        const final = applyBossDamage(b, d, b.weakX, b.weakY);
        spawnFloatText(floatsRef.current, b.weakX, b.weakY - 30, `-${final}`, "#fde68a", 28, 900);
      }
      fireTransition("skill-cruise", "巡航导弹", `锁定 ${targets.length} 个目标`);
    } else if (r.skill === "s5_emp") {
      playSFX("emp");
      const radius = r.cfg.radius ?? 200;
      const duration = r.cfg.durationMs ?? 3000;
      for (const e of lr?.enemies || []) {
        if (!e.alive) continue;
        const dist = Math.hypot(e.x - (playerRef.current?.x || WORLD.WIDTH/2), e.y - (playerRef.current?.y || WORLD.PLAYER_Y));
        if (dist < radius) {
          e.cooldownMs = Math.max(e.cooldownMs, duration);
          spawnFloatText(floatsRef.current, e.x, e.y - 20, "眩晕", "#a78bfa", 16, duration);
        }
      }
      fireTransition("skill-emp", "电磁脉冲", `半径 ${radius}px 内敌人眩晕 ${(duration/1000).toFixed(1)}s`);
    } else if (r.skill === "s6_timewarp") {
      playSFX("timewarp");
      const duration = r.cfg.durationMs ?? 5000;
      if (lr) lr.timeScale = r.cfg.slowPct ?? 0.50;
      fireTransition("skill-timewarp", "时间扭曲", `时间减缓 50%，持续 ${(duration/1000).toFixed(1)}s`);
      setTimeout(() => { if (lr) lr.timeScale = 1.0; }, duration);
    }
    if (statsRef.current.skillsUsed >= 10) unlockAchs(["skill_master"]);
  }

  /** 对敌人施加伤害（先扣护盾），处理死亡/分裂/治疗。 */
  function applyEnemyDamage(e: EnemyRuntime, dmg: number, hx: number, hy: number): void {
    if (!e.alive) return;
    let d = Math.max(1, Math.round(dmg));
    if (e.shieldHp > 0) {
      const absorb = Math.min(e.shieldHp, d);
      e.shieldHp -= absorb; d -= absorb;
    }
    if (d > 0) e.hp -= d;
    spawnFloatText(floatsRef.current, hx, hy - 18, `-${Math.max(1, Math.round(dmg))}`, "#fecaca", 16, 520);
    if (e.hp <= 0) {
      e.alive = false;
      scoreRef.current += e.scoreValue;
      statsRef.current.killed += 1;
      const colors = ["#f87171", "#fde047", "#60a5fa", "#34d399", "#c4b5fd", "#f0abfc"];
      spawnBurst(particlesRef.current, e.x, e.y, 14, colors, 4.5, 3, 600);
      playSFX("boom");
      unlockSingle(achStateRef.current, "first_blood");
      if (e.kind === 3 && levelRuntimeRef.current) {
        const mul = levelRuntimeRef.current.dynamicMul;
        const splitSpawn = (sx: number) => {
          const child = spawnEnemy(1, sx, e.y + 12, mul);
          const baseHp = Math.round(ENEMY_STATS[1].hp * mul.hp * 0.7);
          child.maxHp = Math.max(1, baseHp);
          child.hp = child.maxHp;
          child.scoreValue = 8;
          levelRuntimeRef.current?.enemies.push(child);
        };
        splitSpawn(e.x - 28); splitSpawn(e.x + 28);
      }
      if (e.kind === 8 && levelRuntimeRef.current) {
        for (const o of levelRuntimeRef.current.enemies) {
          if (o.id !== e.id && o.alive) {
            const dd = Math.hypot(o.x - e.x, o.y - e.y);
            if (dd < 260) {
              o.hp = Math.min(o.maxHp, o.hp + 10);
              spawnFloatText(floatsRef.current, o.x, o.y - 20, "+10", "#5eead4", 14, 520);
            }
          }
        }
        playSFX("heal");
      }
    } else {
      playSFX("hit");
      spawnBurst(particlesRef.current, hx, hy, 5, ["#fde68a", "#fca5a5"], 2, 2, 350);
    }
  }

  /** 按玩家操作开火。 */
  function firePlayerBullet(dmg: number): void {
    const p = playerRef.current;
    bulletsRef.current.push({
      id: BULLET_ID++, x: p.x, y: p.y - 44,
      vx: 0, vy: -BALANCE.PLAYER_BULLET_SPEED, dmg,
      from: "player", kind: "normal", lifeMs: 3500, alive: true,
    });
    playSFX("shoot");
  }

  const onTouchMove = useCallback((dx: -1 | 0 | 1, dy: -1 | 0 | 1) => {
    void dx; void dy;
    inputDirRef.current = dx;
    inputDirYRef.current = dy;
  }, []);
  const onTouchBtn = useCallback((which: "shoot" | "s1" | "s2" | "s3", pressed: boolean) => {
    if (which === "shoot") { shootBtnRef.current = pressed; return; }
    if (pressed) {
      ensureAudio();
      if (which === "s1") castSlot(0);
      if (which === "s2") castSlot(1);
      if (which === "s3") castSlot(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 主逻辑 tick =====
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onTick = useCallback((dtMs: number) => {
    if (screen !== "playing") return;
    const now = performance.now();
    const p = playerRef.current;
    const skills = skillsRef.current;
    const lr = levelRuntimeRef.current;
    if (!lr) return;

    lr.dynamicMul = computeDynamicMul(p, now - lr.startedAtMs, lr.index);

    // ===== 多波次触发：若有剩余波次且场上敌人清空，则放出下一波 =====
    if (!lr.spawnedAll && lr.wavesRemaining > 0 && lr.enemies.every((e) => !e.alive)) {
      const def = LEVELS[lr.index];
      if (def) {
        const waveIndex = def.waves.length - lr.wavesRemaining;
        const nextWave = def.waves[waveIndex];
        if (nextWave && nextWave.length) {
          const mul = lr.dynamicMul;
          for (const w of nextWave) lr.enemies.push(spawnEnemy(w.kind, w.x, w.y, mul));
        }
      }
      lr.wavesRemaining -= 1;
      if (lr.wavesRemaining <= 0) lr.spawnedAll = true;
    }

    const baseSpd = p.baseSpeed * (p.speedBoostUntilMs > now ? skillLevelCfg("s3_haste", skills.levels.s3_haste).valuePct ?? 1.5 : 1);
    let dirX: -1 | 0 | 1 = 0;
    let dirY: -1 | 0 | 1 = 0;
    if (inputMode !== "mouse") {
      const k = keysRef.current;
      if (k["arrowleft"] || k["a"]) dirX = -1;
      else if (k["arrowright"] || k["d"]) dirX = 1;
      if (k["arrowup"] || k["w"]) dirY = -1;
      else if (k["arrowdown"] || k["s"]) dirY = 1;
      if (dirX === 0) dirX = inputDirRef.current;
      if (dirY === 0) dirY = inputDirYRef.current;
    }
    const stepPx = baseSpd * (dtMs / 1000);
    if (inputMode === "mouse" && mouseXRef.current != null) {
      const tX = mouseXRef.current;
      const tY = mouseYRef.current ?? p.y;
      const dX = tX - p.x;
      const dY = tY - p.y;
      // 双轴同步移动：直接朝目标点按步进逼近
      const dist = Math.hypot(dX, dY);
      if (dist <= stepPx) {
        p.x = tX;
        p.y = tY;
      } else {
        p.x += (dX / dist) * stepPx;
        p.y += (dY / dist) * stepPx;
      }
    } else {
      // 斜向速度归一化
      const len = (dirX === 0 || dirY === 0) ? 1 : Math.SQRT2;
      p.x += (dirX / len) * stepPx;
      p.y += (dirY / len) * stepPx;
    }
    // X/Y 轴边界钳制：底部保留玩家活动空间，顶部避开出生区
    p.x = Math.max(56, Math.min(WORLD.WIDTH - 56, p.x));
    p.y = Math.max(WORLD.HEIGHT * 0.50, Math.min(WORLD.HEIGHT - 90, p.y));

    tickSkills(skills, p, dtMs, now);

    p.fireCooldownMs -= dtMs;
    const k2 = keysRef.current;
    const actuallyShoot =
      k2[" "] || k2["j"] || k2["k"] || k2["r"] || k2["enter"] ||
      mouseDownRef.current || shootBtnRef.current;
    if (actuallyShoot && p.fireCooldownMs <= 0) {
      p.fireCooldownMs = BALANCE.FIRE_INTERVAL_MS;
      firePlayerBullet(computePlayerBulletDamage(skills));
    }

    tickLevelEnemies(lr, dtMs, (enemy) => {
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const kind = enemy.kind;
      const speed =
        kind === 7 ? 580 :
          kind === 6 ? 640 :
            kind === 5 ? 700 : 420;
      const dmgCfg = ENEMY_STATS[kind];
      const vxRatio = (kind === 7 || kind === 6) ? 0.35 : 0.05;
      const fromEnemy: BulletRuntime = {
        id: BULLET_ID++,
        x: enemy.x, y: enemy.y + 12,
        vx: (dx / len) * speed * vxRatio,
        vy: speed,
        dmg: dmgCfg.dmg,
        from: "enemy",
        kind: kind === 6 ? "laser" : "normal",
        lifeMs: 4000, alive: true,
      };
      bulletsRef.current.push(fromEnemy);
    });
    const boss = bossRef.current;
    if (boss && boss.alive) {
      const timeScale = lr.timeScale || 1.0;
      const bShots = tickBoss(boss, dtMs * timeScale, p.x, p.y);
      if (bShots.length) bulletsRef.current.push(...bShots);
    }

    const bullets = bulletsRef.current;
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (!b.alive) continue;
      b.x += b.vx * (dtMs / 1000);
      b.y += b.vy * (dtMs / 1000);
      b.lifeMs -= dtMs;
      if (b.lifeMs <= 0 || b.y < -40 || b.y > WORLD.HEIGHT + 40 || b.x < -40 || b.x > WORLD.WIDTH + 40) b.alive = false;
    }
    const hash = hashRef.current;
    hash.clear();
    const aabbs: { b: Bounded; e?: EnemyRuntime; boss?: BossRuntime; type: "enemy" | "boss" }[] = [];
    for (const en of lr.enemies) {
      if (!en.alive) continue;
      const bb: Bounded = { x: en.x, y: en.y, w: 56, h: 48 };
      aabbs.push({ b: bb, e: en, type: "enemy" });
      hash.insert(bb);
    }
    if (boss && boss.alive) {
      const w = boss.kind === "mothership" ? 680 : boss.kind === "fuhrer" ? 420 : boss.kind === "corruptor" ? 360 : 300;
      const h = boss.kind === "mothership" ? 240 : boss.kind === "fuhrer" ? 400 : boss.kind === "corruptor" ? 220 : 180;
      const bb: Bounded = { x: boss.x, y: boss.y, w, h };
      aabbs.push({ b: bb, boss, type: "boss" });
      hash.insert(bb);
    }
    const pBox: Bounded = { x: p.x, y: p.y, w: 70, h: 54 };
    const candi: Bounded[] = [];
    for (let i = 0; i < bullets.length; i++) {
      const bl = bullets[i]; if (!bl.alive) continue;
      const bw = bl.kind === "big" ? 22 : bl.kind === "laser" ? 6 : 8;
      const bh = bl.kind === "laser" ? 40 : 24;
      const bulletBox: Bounded = { x: bl.x, y: bl.y, w: bw, h: bh };
      if (bl.from === "player") {
        hash.query(bulletBox, candi);
        for (let c = 0; c < candi.length; c++) {
          const cb = candi[c];
          const match = aabbs.find((x) => x.b === cb);
          if (!match) continue;
          if (!intersectsAABB(bulletBox, cb)) continue;
          bl.alive = false;
          if (match.e) applyEnemyDamage(match.e, bl.dmg, bl.x, bl.y);
          else if (match.boss) {
            const dealt = applyBossDamage(match.boss, bl.dmg, bl.x, bl.y);
            spawnFloatText(floatsRef.current, bl.x, bl.y - 20, `-${dealt}`, "#fde047", 20, 620);
            spawnBurst(particlesRef.current, bl.x, bl.y, 10, ["#fde047", "#f59e0b", "#ef4444"], 3, 3, 520);
            playSFX("hit");
          }
          break;
        }
      } else {
        if (intersectsAABB(bulletBox, pBox) && p.invulnUntilMs <= now) {
          bl.alive = false;
          if (tryBlock(p, now)) {
            spawnFloatText(floatsRef.current, p.x, p.y - 60, "格挡!", "#93c5fd", 22, 700);
            spawnBurst(particlesRef.current, p.x, p.y - 18, 10, ["#93c5fd", "#dbeafe"], 3.4, 3, 500);
            playSFX("shield");
            continue;
          }
          p.hp = Math.max(0, p.hp - bl.dmg);
          p.invulnUntilMs = now + 260;
          statsRef.current.totalDamageTaken += bl.dmg;
          spawnFloatText(floatsRef.current, p.x, p.y - 60, `-${bl.dmg}`, "#fecaca", 22, 680);
          spawnBurst(particlesRef.current, p.x, p.y - 18, 18, ["#ef4444", "#f97316", "#fbbf24"], 5, 3.5, 650);
          playSFX("boom");
        }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) if (!bullets[i].alive) bullets.splice(i, 1);
    if (bullets.length > 800) bullets.splice(0, bullets.length - 800);

    for (const en of lr.enemies) {
      if (!en.alive) continue;
      if (en.y > WORLD.HEIGHT - 90) {
        en.alive = false;
        if (p.invulnUntilMs <= now && !tryBlock(p, now)) {
          p.hp = Math.max(0, p.hp - 18);
          statsRef.current.totalDamageTaken += 18;
          spawnFloatText(floatsRef.current, p.x, p.y - 70, "-18 突破防线!", "#fecaca", 20, 800);
          p.invulnUntilMs = now + 400;
        }
      }
    }

    stepParticles(particlesRef.current, dtMs, profile.maxParticles);
    stepFloats(floatsRef.current, dtMs);
    tickParallax(parallaxRef.current, dtMs, 1.0);

    tryScoreAchievements(achStateRef.current, scoreRef.current);

    const clr = finalizeClear(lr, p, skills, now, boss);
    if (clr) {
      clearResultRef.current = clr;
      if (scoreRef.current > save.bestScore) save.bestScore = scoreRef.current;
      save.totalScore += scoreRef.current;
      save.clearedLevels = Math.max(save.clearedLevels, clr.level);
      save.level = Math.min(LEVELS.length, Math.max(save.level, clr.level + (clr.level < LEVELS.length ? 1 : 0)));
      save.skillPoints += clr.skillPointReward;
      save.unlockedAchievements = Array.from(achStateRef.current.unlocked);
      saveSlot(save);
      tryClearLevelAchievements(achStateRef.current, clr.level, clr.hpLeftPct, clr.skillsUsed, statsRef.current.totalDamageTaken);
      save.unlockedAchievements = Array.from(achStateRef.current.unlocked);
      saveSlot(save);
      playSFX("levelup");
      playBGM("menu");
      fireTransition("level-clear", `第 ${clr.level} 关通过 · 评级 ${clr.grade}`, `技能点 +${clr.skillPointReward}`);
      props.onFinalize?.(save.bestScore, save.bestScore === scoreRef.current);
      if (clr.level >= LEVELS.length) setScreen("victory");
      else setScreen("cleared");
    }

    if (p.hp <= 0 && screen === "playing") {
      spawnBurst(particlesRef.current, p.x, p.y - 10, 60, ["#ef4444", "#f97316", "#fbbf24", "#f87171"], 6, 5, 1000);
      playSFX("boom");
      if (scoreRef.current > save.bestScore) save.bestScore = scoreRef.current;
      save.unlockedAchievements = Array.from(achStateRef.current.unlocked);
      saveSlot(save);
      props.onFinalize?.(save.bestScore, save.bestScore === scoreRef.current);
      setScreen("gameover");
    }

    hudThrottleRef.current += dtMs;
    if (hudThrottleRef.current > 100) {
      hudThrottleRef.current = 0;
      setHudTick((x) => x + 1);
    }
  }, [screen, currentLevelIndex, inputMode, profile, save, props]);

  // ===== 渲染 =====
  const onRender = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const cssW = c.clientWidth || 1;
    const cssH = c.clientHeight || 1;
    const dpr = profile.targetDPR || 1;
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(w / WORLD.WIDTH, h / WORLD.HEIGHT);
    const lr = levelRuntimeRef.current;
    const def = LEVELS[currentLevelIndex];
    drawParallax(ctx, parallaxRef.current, profile, def?.theme || "void");
    if (def && !def.isBoss) {
      for (const bk of def.blocks) {
        batchRef.current.drawRect(bk.x, bk.y, bk.w, bk.h, "#475569");
        batchRef.current.drawRect(bk.x + 4, bk.y + 4, bk.w - 8, bk.h - 8, "#334155");
      }
    }
    batchRef.current.flush(ctx);
    batchRef.current.reset();

    if (lr) for (const e of lr.enemies) drawEnemy(ctx, e, performance.now());
    const bs = bossRef.current;
    if (bs) drawBoss(ctx, bs, performance.now());
    drawPlayer(ctx, playerRef.current, performance.now(), 1);

    const bullets = bulletsRef.current;
    for (let i = 0; i < bullets.length; i++) {
      const bl = bullets[i];
      if (!bl.alive) continue;
      if (bl.from === "player") {
        ctx.fillStyle = "#f87171";
        ctx.fillRect(bl.x - 3, bl.y - 10, 6, 20);
        ctx.fillStyle = "#fecaca";
        ctx.fillRect(bl.x - 1, bl.y - 14, 2, 22);
      } else if (bl.from === "boss") {
        if (bl.kind === "big") {
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath(); ctx.arc(bl.x, bl.y, 10, 0, Math.PI * 2); ctx.fill();
        } else if (bl.kind === "laser") {
          ctx.fillStyle = "#fb7185"; ctx.fillRect(bl.x - 3, bl.y - 16, 6, 32);
        } else if (bl.kind === "spread") {
          ctx.fillStyle = "#f472b6"; ctx.beginPath(); ctx.arc(bl.x, bl.y, 7, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = "#a78bfa"; ctx.fillRect(bl.x - 4, bl.y - 8, 8, 16);
        }
      } else {
        ctx.fillStyle = bl.kind === "laser" ? "#fb7185" : "#a78bfa";
        ctx.fillRect(bl.x - 3, bl.y - 8, 6, 16);
      }
    }

    drawParticles(ctx, particlesRef.current);
    drawFloats(ctx, floatsRef.current);
    if (profile.enableLighting) drawLighting(ctx, lightingRef.current);

    if (screen === "paused") {
      ctx.fillStyle = "rgba(15,23,42,0.58)";
      ctx.fillRect(0, 0, WORLD.WIDTH, WORLD.HEIGHT);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 80px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("⏸ 已暂停", WORLD.WIDTH / 2, WORLD.HEIGHT / 2 - 10);
      ctx.font = "26px system-ui";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("按 P / ESC 继续，或点击右上角菜单返回主菜单 / 重开本关", WORLD.WIDTH / 2, WORLD.HEIGHT / 2 + 50);
    }
  }, [currentLevelIndex, profile, screen]);

  useGameLoop(
    screen === "playing" || screen === "paused" || screen === "cleared" || screen === "gameover" || screen === "victory",
    onTick, onRender,
  );

  const handleUpgrade = (id: SkillId): void => {
    const cur = save.skills[id];
    if (cur >= 3 || save.skillPoints <= 0) return;
    save.skills[id] = clampLv(cur + 1) as SkillLevel;
    save.skillPoints -= 1;
    saveSlot(save);
    setSaveTick((x) => x + 1);
    playSFX("levelup");
    unlockSingle(achStateRef.current, "upgrade_any");
    const allMax = (Object.keys(save.skills) as SkillId[]).every((k) => save.skills[k] >= 3);
    if (allMax) unlockSingle(achStateRef.current, "all_upgrade_max");
  };

  const onMenuBack = () => {
    setScreen("menu");
    playBGM("menu");
    save.unlockedAchievements = Array.from(achStateRef.current.unlocked);
    saveSlot(save);
  };

  const restart = (): void => {
    ensureAudio();
    bootLevel(currentLevelIndex);
  };

  const nextLevel = (): void => {
    const nxt = Math.min(LEVELS.length - 1, currentLevelIndex + 1);
    bootLevel(nxt);
  };

  const p = playerRef.current;
  const skills = skillsRef.current;
  const enemiesLeft = levelRuntimeRef.current ? (levelRuntimeRef.current.enemies.filter((e) => e.alive).length + (bossRef.current?.alive ? 1 : 0)) : 0;
  void hudTick;

  return (
    <div ref={wrapRef} className="w-full relative">
      <div className="w-full">
        {screen === "menu" && (
          <MainMenu tab={tab} onTab={setTab} onStart={handleStartSlot}
            onOpenLevelSelect={() => { ensureAudio(); playSFX("click"); setLevelSelectOpen(true); }}
            highScore={save.bestScore}
            skillPoints={save.skillPoints}
            unlockedAchievements={save.unlockedAchievements.length}
            totalAchievements={ACHIEVEMENTS.length}
            unlockedLevel={save.level}
            totalLevels={LEVELS.length} />
        )}

        {screen !== "menu" && (
          <div className="relative mx-auto w-full max-w-[900px] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 bg-black">
            <canvas
              ref={canvasRef}
              width={WORLD.WIDTH}
              height={WORLD.HEIGHT}
              className="w-full h-auto block"
              style={{ aspectRatio: `${WORLD.WIDTH} / ${WORLD.HEIGHT}` }}
            />
            <HUD
              score={scoreRef.current}
              hp={p.hp} maxHp={p.maxHp}
              energy={p.energy} maxEnergy={p.maxEnergy}
              level={currentLevelIndex + 1} levelName={LEVELS[currentLevelIndex]?.name ?? ""}
              enemiesLeft={enemiesLeft}
              bossHpPct={bossRef.current?.alive ? (bossRef.current.hp / bossRef.current.maxHp) : null}
              bossName={bossRef.current ? bossTitle(bossRef.current.kind) : null}
              skills={skills}
              paused={paused}
              onTogglePause={() => {
                if (screen === "playing") { setScreen("paused"); playBGM("menu"); fireTransition("pause"); }
                else if (screen === "paused") {
                  const def = LEVELS[currentLevelIndex];
                  playBGM(def?.isBoss ? "boss" : "battle");
                  setScreen("playing");
                }
              }}
              onOpenMenu={() => {
                setScreen("paused");
                playBGM("menu");
                setSavesOpen(true);
              }}
              onCast={(s) => { ensureAudio(); castSlot(s); }}
            />
            <TransitionOverlay trigger={transTick} kind={transKind} title={transTitle} subtitle={transSub} />
            {inputMode === "touch" && (
              <TouchControls onMove={onTouchMove} onButton={onTouchBtn} />
            )}
          </div>
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}
        sfx={sfxVol} bgm={bgmVol} quality={quality} input={inputMode}
        onChange={(patch) => {
          if (typeof patch.sfx === "number") setSfxVolState(patch.sfx);
          if (typeof patch.bgm === "number") setBgmVolState(patch.bgm);
          if (patch.quality) { setQuality(patch.quality); save.settings.quality = patch.quality; saveSlot(save); }
          if (patch.input) { setInputMode(patch.input); save.settings.input = patch.input; saveSlot(save); }
        }}
      />
      <SkillTree open={skillsOpen} onClose={() => setSkillsOpen(false)}
        levels={save.skills} skillPoints={save.skillPoints} onUpgrade={handleUpgrade} />
      <SaveSlots open={savesOpen} refreshTick={saveTick} onClose={() => setSavesOpen(false)}
        onLoad={(i) => { const loaded = loadSlot(i); applySave(loaded); }}
        onNew={(i) => { applySave(emptySlot(i)); }} />
      <AchievementBoard open={achOpen} onClose={() => setAchOpen(false)} unlocked={achStateRef.current.unlocked} />

      <GameOverScreen
        open={screen === "cleared" || screen === "gameover" || screen === "victory"}
        victory={screen === "cleared" || screen === "victory"}
        score={scoreRef.current}
        level={currentLevelIndex + 1}
        totalLevels={LEVELS.length}
        cleared={clearResultRef.current}
        stats={{ ...statsRef.current }}
        onRestartLevel={restart}
        onNextLevel={nextLevel}
        onSelectLevel={() => { ensureAudio(); playSFX("click"); setLevelSelectOpen(true); }}
        onBackToMenu={onMenuBack}
        onOpenSkillTree={() => setSkillsOpen(true)}
      />

      <LevelSelect
        open={levelSelectOpen}
        unlockedLevel={save.level}
        currentLevel={currentLevelIndex + 1}
        onPick={(idx) => { setLevelSelectOpen(false); bootLevel(idx); }}
        onClose={() => setLevelSelectOpen(false)}
      />

      {screen !== "menu" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 justify-center">
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setSettingsOpen(true); }}>⚙️ 设置</GamePill>
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setSkillsOpen(true); }}>🎯 技能</GamePill>
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setSavesOpen(true); }}>💾 存档</GamePill>
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setAchOpen(true); }}>🏅 成就</GamePill>
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); setLevelSelectOpen(true); }}>🗺️ 选关</GamePill>
          {(screen === "playing" || screen === "paused") && (
            <GamePill onClick={() => { ensureAudio(); playSFX("click"); restart(); }}>🔁 重玩</GamePill>
          )}
          <GamePill onClick={() => { ensureAudio(); playSFX("click"); onMenuBack(); }}>🏠 主菜单</GamePill>
        </div>
      )}

      {toastAch && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-4 py-2 shadow-lg animate-bounce">
          🏆 成就解锁：{toastAch}
        </div>
      )}
    </div>
  );
};

const GamePill: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (p) => (
  <button {...p}
    className={
      "rounded-xl bg-white border border-slate-200 text-slate-700 px-3.5 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 " +
      (p.className || "")
    } />
);
