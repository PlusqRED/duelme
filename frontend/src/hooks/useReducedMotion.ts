'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';

/** Whether the reader asked for less motion, for the moves CSS cannot stop (counts, flights). */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
