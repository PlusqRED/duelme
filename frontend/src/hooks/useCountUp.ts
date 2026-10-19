'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const COUNT_MS = 700;
/** A count steps in whole tenths of a USDT, so the digits it passes through stay readable. */
const STEP = 100_000n;
/** The easing's resolution: the share of the way travelled, in thousandths. */
const PARTS = 1000;

/**
 * A USDT amount, in base units, that counts to its new value, eased out, instead of jumping, the
 * way a balance moves in the design. Null until there is a value; the first value and every value
 * with motion reduced show at once. The count ends on the exact amount.
 */
export function useCountUp(value: bigint | null): bigint | null {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (value === null || from === null || from === value || reducedMotion) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / COUNT_MS);
      const travelled = BigInt(Math.round((1 - (1 - progress) ** 3) * PARTS));
      const next = progress < 1 ? ((from + ((value - from) * travelled) / BigInt(PARTS)) / STEP) * STEP : value;
      shownRef.current = next;
      setShown(next);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion]);

  return shown;
}
