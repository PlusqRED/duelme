'use client';

import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { easings } from '@/lib/easings';

/** The list's rows, told apart by their `data-key`. */
function rowsOf(list: HTMLElement | null): HTMLElement[] {
  return Array.from(list?.children ?? []).filter(
    (row): row is HTMLElement => row instanceof HTMLElement && row.dataset.key !== undefined
  );
}

/**
 * Moves a list's rows to their new places when `key` changes, instead of letting them jump: a row
 * that stays slides from where it was, and a new one rises in after a moment, one after another.
 * `capture` notes where the rows are, just before whatever changes `key`; the list is what they are
 * positioned in. Only a captured change moves, so rows that change for another reason (new data)
 * do not. With motion reduced, nothing moves.
 */
export function useListReflow(list: RefObject<HTMLElement | null>, key: unknown) {
  const reducedMotion = useReducedMotion();
  const tops = useRef<Map<string, number> | null>(null);

  const capture = useCallback(() => {
    tops.current = new Map(rowsOf(list.current).map((row) => [row.dataset.key ?? '', row.offsetTop]));
  }, [list]);

  useLayoutEffect(() => {
    const before = tops.current;
    tops.current = null;
    if (!before || reducedMotion) {
      return;
    }
    let entering = 0;
    for (const row of rowsOf(list.current)) {
      const top = before.get(row.dataset.key ?? '');
      if (top === undefined) {
        row.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], {
          duration: 380,
          delay: 140 + entering * 70,
          easing: easings.sheet,
          fill: 'backwards',
        });
        entering += 1;
      } else if (top !== row.offsetTop) {
        row.animate([{ transform: `translateY(${top - row.offsetTop}px)` }, { transform: 'none' }], {
          duration: 440,
          easing: easings.sheet,
        });
      }
    }
  }, [key, list, reducedMotion]);

  return { capture };
}
