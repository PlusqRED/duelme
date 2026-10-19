'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * A figure that counts up from zero to `target`, eased out, once `isOn` turns on, after `delayMs`;
 * zero before then, and `target` at once with motion reduced. For a figure that is shown off the
 * first time it is seen, like the tests' coverage.
 */
export function useCountTo(target: number, isOn: boolean, { durationMs = 1400, delayMs = 0 } = {}): number {
  const reducedMotion = useReducedMotion();
  const [counted, setCounted] = useState(0);

  useEffect(() => {
    if (!isOn || reducedMotion) {
      return;
    }
    const start = performance.now() + delayMs;
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.max(0, Math.min(1, (now - start) / durationMs));
      setCounted(target * (1 - (1 - progress) ** 3));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isOn, reducedMotion, target, durationMs, delayMs]);

  if (!isOn) return 0;
  return reducedMotion ? target : counted;
}
