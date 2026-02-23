import { useRef } from "react";

/**
 * Returns a tap handler that distinguishes single vs double tap.
 * - Double tap (within `delay` ms): calls onDoubleTap
 * - Single tap (no second tap within `delay` ms): calls onSingleTap
 */
export function useDoubleTap(onDoubleTap, onSingleTap, delay = 280) {
  const lastTap = useRef(0);
  const timerRef = useRef(null);

  return () => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      // ── Double tap detected ──────────────────────────
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onDoubleTap?.();
    } else {
      // ── Possible single tap — wait for second tap ────
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSingleTap?.();
        timerRef.current = null;
      }, delay);
    }
    lastTap.current = now;
  };
}
