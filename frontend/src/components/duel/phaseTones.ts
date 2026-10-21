import type { PhaseLabel } from '@/lib/duelPhase';

/** A duel state's colour, the colour of what the duel waits on: `--tone` for its dot, and its pill's ground. */
export const PHASE_TONES: Record<PhaseLabel['tone'], string> = {
  waiting: '[--tone:var(--color-blue)] bg-blue-soft',
  live: '[--tone:var(--color-ink)] bg-canvas-deep',
  paused: '[--tone:var(--color-ink-3)] bg-canvas',
  confirm: '[--tone:var(--color-sun-edge)] bg-sun-soft',
  late: '[--tone:var(--color-orange)] bg-orange-soft',
  paid: '[--tone:var(--color-sun-edge)] bg-sun-soft',
  back: '[--tone:var(--color-ink-3)] bg-canvas',
};
