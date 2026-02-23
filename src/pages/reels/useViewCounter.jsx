import { useRef } from "react";

export function useViewCounter({ minWatchMs = 1200, onView }) {
  const seen = useRef(new Set());
  const timer = useRef(null);

  const start = (reelId) => {
    if (!reelId) return;
    if (seen.current.has(String(reelId))) return;

    stop();
    timer.current = setTimeout(() => {
      seen.current.add(String(reelId));
      onView?.(reelId);
    }, minWatchMs);
  };

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return { start, stop, seen: seen.current };
}