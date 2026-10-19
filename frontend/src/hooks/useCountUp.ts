'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const COUNT_MS = 700;
/** A count steps in whole tenths of a USDT, so the digits it passes through stay readable. */
const STEP = 100_000n;
/** The easing's resolution: the share of the way travelled, in thousandths. */
const PARTS = 1000;

interface Count {
  from: bigint;
  to: bigint;
}

/**
 * A USDT amount, in base units, that counts to its new value, eased out, instead of jumping, the
 * way a balance moves in the design. Null until there is a value; the first value and every value
 * with motion reduced show at once. The count ends on the exact amount.
 */
export function useCountUp(value: bigint | null): bigint | null {
  const reducedMotion = useReducedMotion();
  const [target, setTarget] = useState(value);
  const [shown, setShown] = useState(value);
  const [count, setCount] = useState<Count | null>(null);

  // Whether a new value counts is decided while rendering, so one that shows at once is there in
  // the same render; a count starts from wherever the last one had got to.
  if (value !== target) {
    setTarget(value);
    const counts = value !== null && shown !== null && value !== shown && !reducedMotion;
    setCount(counts ? { from: shown, to: value } : null);
    if (!counts) {
      setShown(value);
    }
  }

  useEffect(() => {
    if (!count) {
      return;
    }
    const { from, to } = count;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / COUNT_MS);
      const travelled = BigInt(Math.round((1 - (1 - progress) ** 3) * PARTS));
      setShown(progress < 1 ? ((from + ((to - from) * travelled) / BigInt(PARTS)) / STEP) * STEP : to);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [count]);

  return shown;
}
