import { getReputationSummaryFromStats, type ReputationLevel } from '@/lib/reputation';

/** The reputation scale's zones, left to right: the levels from New to Reliable. */
export const gaugeLevels: readonly ReputationLevel[] = ['new', 'unreliable', 'fair', 'honorable'];

function clampToZone(spot: number): number {
  return Math.min(0.9, Math.max(0.1, spot));
}

/**
 * Where inside its level's zone a record stands, from 0 at its left end to 1 at its right. A clean
 * record walks one step per duel toward Reliable, five steps away; otherwise the score places it,
 * between the score that starts its level and the one that starts the next.
 */
function spotInZone(honored: number, abandoned: number, level: ReputationLevel, score: number): number {
  if (level === 'new') return 0.5;
  if (level === 'fair' && abandoned === 0) return clampToZone(honored / 5);
  if (level === 'unreliable') return clampToZone(score / 0.4);
  if (level === 'fair') return clampToZone((score - 0.4) / 0.35);
  return clampToZone((score - 0.55) / 0.45);
}

export interface GaugePoint {
  level: ReputationLevel;
  /** Where in its level's zone the record stands: 0 is the zone's left end, 1 its right, and neither is reached. */
  spot: number;
}

/** Where a record of honored and abandoned duels stands on the reputation scale. */
export function gaugePoint(honored: number, abandoned: number): GaugePoint {
  const { level, score } = getReputationSummaryFromStats(honored, abandoned);
  return { level, spot: spotInZone(honored, abandoned, level, score) };
}
