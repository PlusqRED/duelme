import type { TranslationKey } from '@/i18n/translations';

export type ReputationLevel = 'new' | 'honorable' | 'fair' | 'unreliable';

export interface ReputationSummary {
  honored: number;
  abandoned: number;
  total: number;
  score: number;
  level: ReputationLevel;
}

export function wilsonScore(honored: number, abandoned: number): number {
  const total = honored + abandoned;
  if (total === 0) return -1;

  const p = honored / total;
  const z = 1.96;
  const z2 = z * z;
  const n = total;

  const numerator =
    p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  const denominator = 1 + z2 / n;

  return Math.max(0, numerator / denominator);
}

export function getReputationLevel(
  score: number,
  honored: number,
  abandoned: number
): ReputationLevel {
  const total = honored + abandoned;
  if (total === 0) return 'new';

  if (abandoned === 0) {
    return honored >= 5 ? 'honorable' : 'fair';
  }

  if (score >= 0.75) return 'honorable';
  if (score >= 0.4) return 'fair';
  return 'unreliable';
}

export function getReputationLevelFromStats(
  honored: number,
  abandoned: number
): ReputationLevel {
  return getReputationSummaryFromStats(honored, abandoned).level;
}

export function getReputationSummaryFromStats(
  honored: number,
  abandoned: number
): ReputationSummary {
  const score = wilsonScore(honored, abandoned);
  return {
    honored,
    abandoned,
    total: honored + abandoned,
    score,
    level: getReputationLevel(score, honored, abandoned),
  };
}

export function getReputationLabelKey(level: ReputationLevel): TranslationKey {
  switch (level) {
    case 'new':
      return 'rep.new';
    case 'honorable':
      return 'rep.honorable';
    case 'fair':
      return 'rep.fair';
    case 'unreliable':
      return 'rep.unreliable';
  }
}

/** The way to the next level, as the wallet menu and the dashboard draw it. */
export interface LevelQuest {
  level: ReputationLevel;
  /** The level the next honored duels lead to, or null at the top. */
  next: ReputationLevel | null;
  /** Honored duels so far, and how many the next level needs. At the top both are 1. */
  have: number;
  need: number;
}

const LEVEL_RANK: Record<ReputationLevel, number> = { new: 0, unreliable: 1, fair: 2, honorable: 3 };

/**
 * The fewest more honored duels that lift the level, by the rule `getReputationLevel` applies: a
 * new player needs one, a clean record five, and an abandoned duel more the more of them there are.
 * The level only rises with honored duels, so the answer is found by doubling and then halving.
 */
export function levelQuest(honored: number, abandoned: number): LevelQuest {
  const level = getReputationLevelFromStats(honored, abandoned);
  if (level === 'honorable') {
    return { level, next: null, have: 1, need: 1 };
  }
  const lifts = (more: number) =>
    LEVEL_RANK[getReputationLevelFromStats(honored + more, abandoned)] > LEVEL_RANK[level];

  let high = 1;
  while (!lifts(high)) {
    high *= 2;
  }
  let low = high / 2;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (lifts(middle)) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return {
    level,
    next: getReputationLevelFromStats(honored + high, abandoned),
    have: honored,
    need: honored + high,
  };
}

/** Past this many, a quest's cells each stand for more than one duel, so the line keeps its width. */
const MAX_QUEST_CELLS = 12;

/** The quest's cells: one per duel it needs, up to `MAX_QUEST_CELLS`, and how many of them are lit. */
export function questCells(quest: LevelQuest): { count: number; lit: number } {
  const count = Math.min(quest.need, MAX_QUEST_CELLS);
  return { count, lit: Math.round((quest.have / quest.need) * count) };
}
