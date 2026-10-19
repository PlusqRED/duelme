'use client';

import { useState } from 'react';
import { getReputationLevelFromStats, levelRank, type ReputationLevel, type ReputationMark } from '@/lib/reputation';
import { gaugePoint } from '@/lib/reputationGauge';

/** A record goes no higher than two digits: the lab is for trying the score, not filling it. */
const MOST = 99;

export interface SampleChange {
  /** Counts each change, so what plays for one plays again for the next. */
  id: number;
  mark: ReputationMark | 'reset';
  /** Whether the change moved the player to a higher level or a lower one. */
  level: 'up' | 'down' | null;
}

interface Sample {
  honored: number;
  abandoned: number;
  change: SampleChange | null;
}

function levelChange(before: ReputationLevel, after: ReputationLevel): SampleChange['level'] {
  if (before === after) return null;
  return levelRank(after) > levelRank(before) ? 'up' : 'down';
}

/**
 * A made-up player to try the reputation score on: each duel seen through or walked away from
 * moves them along the scale, and the last change says what it did.
 */
export function useReputationSample() {
  const [sample, setSample] = useState<Sample>({ honored: 0, abandoned: 0, change: null });
  const point = gaugePoint(sample.honored, sample.abandoned);

  function update(mark: SampleChange['mark'], honored: number, abandoned: number) {
    const after = getReputationLevelFromStats(honored, abandoned);
    setSample({
      honored,
      abandoned,
      change: { id: (sample.change?.id ?? 0) + 1, mark, level: levelChange(point.level, after) },
    });
  }

  return {
    ...sample,
    point,
    add: (mark: ReputationMark) =>
      mark === 'honored'
        ? update(mark, Math.min(MOST, sample.honored + 1), sample.abandoned)
        : update(mark, sample.honored, Math.min(MOST, sample.abandoned + 1)),
    reset: () => update('reset', 0, 0),
  };
}
