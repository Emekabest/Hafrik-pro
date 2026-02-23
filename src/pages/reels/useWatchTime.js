import { useRef } from "react";

export function useWatchTime({ onFlush }) {
  const current = useRef({ reelId: null, startedAt: 0, totalMs: 0 });

  const start = (reelId) => {
    if (!reelId) return;
    // flush previous
    flush();
    current.current = { reelId, startedAt: Date.now(), totalMs: 0 };
  };

  const pause = () => {
    const c = current.current;
    if (!c.reelId || !c.startedAt) return;
    c.totalMs += Date.now() - c.startedAt;
    c.startedAt = 0;
  };

  const resume = () => {
    const c = current.current;
    if (!c.reelId || c.startedAt) return;
    c.startedAt = Date.now();
  };

  const flush = () => {
    const c = current.current;
    if (!c.reelId) return;

    // include current running segment
    const running = c.startedAt ? Date.now() - c.startedAt : 0;
    const total = c.totalMs + running;

    if (total > 0) onFlush?.(c.reelId, total);

    current.current = { reelId: null, startedAt: 0, totalMs: 0 };
  };

  return { start, pause, resume, flush };
}