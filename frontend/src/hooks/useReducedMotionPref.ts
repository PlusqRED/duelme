'use client';

import { useReducedMotion } from 'framer-motion';

export function useReducedMotionPref(): boolean {
  const reduced = useReducedMotion();
  return reduced ?? false;
}
