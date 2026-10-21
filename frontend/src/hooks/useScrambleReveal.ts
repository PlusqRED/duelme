'use client';

import { useEffect, useState, type RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const REVEAL_MS = 900;
const HEX = '0123456789abcdef';

function noise(length: number): string {
  return Array.from({ length }, () => HEX.charAt(Math.floor(Math.random() * HEX.length))).join('');
}

interface Reveal {
  groups: string[];
  /** Each group's width as it will end, so the line does not jitter while the noise runs. */
  widths: number[];
}

/**
 * Groups of text that settle out of random hex one after another, the way a block explorer fills
 * in, once `isOn` turns on; as they are otherwise, and always with motion reduced. `holder` is what
 * the groups are drawn in, one child each, measured before the noise starts.
 */
export function useScrambleReveal(groups: readonly string[], isOn: boolean, holder: RefObject<HTMLElement | null>) {
  const reducedMotion = useReducedMotion();
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useEffect(() => {
    if (!isOn || reducedMotion) {
      return;
    }
    const widths = Array.from(holder.current?.children ?? [], (child) => (child instanceof HTMLElement ? child.offsetWidth : 0));
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = (now - start) / REVEAL_MS;
      if (progress >= 1) {
        setReveal(null);
        return;
      }
      setReveal({
        groups: groups.map((group, index) => (progress >= (index + 1) / groups.length ? group : noise(group.length))),
        widths,
      });
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [isOn, reducedMotion, groups, holder]);

  return reveal ?? { groups, widths: [] };
}
