import { describe, expect, it } from 'vitest';
import { levelRank } from '@/lib/reputation';
import { gaugeLevels, gaugePoint } from '@/lib/reputationGauge';

describe('gaugePoint', () => {
  it('stands a player with no duels in the middle of New', () => {
    expect(gaugePoint(0, 0)).toEqual({ level: 'new', spot: 0.5 });
  });

  it('walks a clean record one step per duel through Mixed', () => {
    expect([gaugePoint(1, 0), gaugePoint(2, 0)]).toEqual([
      { level: 'fair', spot: 0.2 },
      { level: 'fair', spot: 0.4 },
    ]);
  });

  it('reaches Reliable at five clean duels', () => {
    expect(gaugePoint(5, 0).level).toBe('honorable');
  });

  it('puts a record with more walked away from than seen through in Risky', () => {
    expect(gaugePoint(3, 1).level).toBe('unreliable');
  });

  it('keeps every record inside its own zone, clear of its ends', () => {
    const records = [[0, 0], [1, 0], [4, 0], [5, 0], [99, 0], [0, 99], [1, 1], [20, 1], [99, 1], [3, 1]];

    for (const [honored, abandoned] of records) {
      const { spot } = gaugePoint(honored, abandoned);
      expect(spot).toBeGreaterThan(0);
      expect(spot).toBeLessThan(1);
    }
  });
});

describe('gaugeLevels', () => {
  it('lays the zones out from the lowest level to the highest', () => {
    expect(gaugeLevels.map(levelRank)).toEqual([0, 1, 2, 3]);
  });
});
