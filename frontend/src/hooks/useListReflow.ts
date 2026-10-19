'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** The theme's `ease-sheet`: a quick start that settles. */
const SETTLE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * Moves a list's rows to their new places when `key` changes, instead of letting them jump: a row
 * that stays slides from where it was, and a new one rises in after a moment, one after another.
 * The rows are the list's children with a `data-key`; the list is what they are positioned in.
 * Their places are read after every render, so a list that changed for another reason (new data)
 * does not move. With motion reduced, nothing moves.
 */
export function useListReflow(list: RefObject<HTMLElement | null>, key: unknown) {
  const reducedMotion = useReducedMotion();
  const tops = useRef(new Map<string, number>());
  const lastKey = useRef(key);

  useLayoutEffect(() => {
    const node = list.current;
    if (!node) {
      return;
    }
    const rows = Array.from(node.children).filter(
      (row): row is HTMLElement => row instanceof HTMLElement && row.dataset.key !== undefined
    );
    const hasChanged = key !== lastKey.current;
    lastKey.current = key;
    if (hasChanged && !reducedMotion) {
      let entering = 0;
      for (const row of rows) {
        const before = tops.current.get(row.dataset.key ?? '');
        if (before === undefined) {
          row.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], {
            duration: 380,
            delay: 140 + entering * 70,
            easing: SETTLE,
            fill: 'backwards',
          });
          entering += 1;
        } else if (before !== row.offsetTop) {
          row.animate([{ transform: `translateY(${before - row.offsetTop}px)` }, { transform: 'none' }], {
            duration: 440,
            easing: SETTLE,
          });
        }
      }
    }
    tops.current = new Map(rows.map((row) => [row.dataset.key ?? '', row.offsetTop]));
  });
}
