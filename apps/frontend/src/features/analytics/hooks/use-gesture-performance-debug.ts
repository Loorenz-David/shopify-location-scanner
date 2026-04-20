import { useEffect, useRef } from "react";

export function useGesturePerformanceDebug(
  label: string,
  isActive: boolean,
): void {
  const renderCountRef = useRef(0);
  const sessionRenderStartRef = useRef(0);
  const frameCountRef = useRef(0);
  const sessionStartRef = useRef(0);

  renderCountRef.current += 1;

  useEffect(() => {
    if (!import.meta.env.DEV || !isActive) {
      return;
    }

    sessionRenderStartRef.current = renderCountRef.current;
    frameCountRef.current = 0;
    sessionStartRef.current = performance.now();

    let frameId = 0;
    const tick = () => {
      frameCountRef.current += 1;
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      const durationMs = Math.max(performance.now() - sessionStartRef.current, 1);
      const frames = frameCountRef.current;
      const renders = renderCountRef.current - sessionRenderStartRef.current;
      const fps = (frames * 1000) / durationMs;

      console.debug(`[perf:${label}]`, {
        durationMs: Math.round(durationMs),
        fps: Number(fps.toFixed(1)),
        renders,
      });
    };
  }, [isActive, label]);
}
