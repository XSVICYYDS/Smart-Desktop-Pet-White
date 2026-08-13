/** requestAnimationFrame + dt 驱动的稳定游戏循环 Hook；自动暂停/恢复。 */
import { useEffect, useRef } from "react";

const TICK_MS = 1000 / 60;

export function useGameLoop(
  running: boolean,
  onTick: (dtMs: number) => void,
  onRender: (alpha: number) => void,
  onFPS?: (fps: number) => void,
): void {
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const fpsAccRef = useRef<number>(0);
  const fpsFramesRef = useRef<number>(0);
  const runningRef = useRef(running);
  runningRef.current = running;
  const tickRef = useRef(onTick);
  tickRef.current = onTick;
  const renderRef = useRef(onRender);
  renderRef.current = onRender;
  const fpsCbRef = useRef(onFPS);
  fpsCbRef.current = onFPS;

  useEffect(() => {
    const frame = (ts: number): void => {
      rafRef.current = requestAnimationFrame(frame);
      const last = lastTsRef.current || ts;
      let delta = ts - last;
      if (delta > 250) delta = 250; // 切后台回来钳制
      lastTsRef.current = ts;
      if (fpsCbRef.current) {
        fpsAccRef.current += delta;
        fpsFramesRef.current += 1;
        if (fpsAccRef.current >= 1000) {
          fpsCbRef.current((fpsFramesRef.current * 1000) / fpsAccRef.current);
          fpsAccRef.current = 0;
          fpsFramesRef.current = 0;
        }
      }
      if (!runningRef.current) return;
      accRef.current += delta;
      // 固定步长 tick，插值渲染
      let safety = 4;
      while (accRef.current >= TICK_MS && safety-- > 0) {
        tickRef.current(TICK_MS);
        accRef.current -= TICK_MS;
      }
      renderRef.current(accRef.current / TICK_MS);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
}
