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
