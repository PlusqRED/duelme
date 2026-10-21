import {
  CLEAN_RECORD_DUELS,
  FAIR_SCORE,
  HONORABLE_SCORE,
  getReputationSummaryFromStats,
  type ReputationLevel,
} from '@/lib/reputation';

/**
 * Where Reliable's zone starts on the scale. A clean record of five scores about 0.57 and is
 * already Reliable, so the zone reaches below `HONORABLE_SCORE`, which only a record with an
 * abandoned duel has to pass.
 */
const RELIABLE_ZONE_START = 0.55;

function clampToZone(spot: number): number {
  return Math.min(0.9, Math.max(0.1, spot));
}

/**
 * Where inside its level's zone a record stands, from 0 at its left end to 1 at its right. A clean
 * record walks one step per duel toward Reliable; otherwise the score places it, between the
 * score that starts its level and the one that starts the next.
 */
function spotInZone(honored: number, abandoned: number, level: ReputationLevel, score: number): number {
  if (level === 'new') return 0.5;
  if (level === 'fair' && abandoned === 0) return clampToZone(honored / CLEAN_RECORD_DUELS);
  if (level === 'unreliable') return clampToZone(score / FAIR_SCORE);
  if (level === 'fair') return clampToZone((score - FAIR_SCORE) / (HONORABLE_SCORE - FAIR_SCORE));
  return clampToZone((score - RELIABLE_ZONE_START) / (1 - RELIABLE_ZONE_START));
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
