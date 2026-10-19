import { describe, expect, it } from 'vitest';
import { getReputationLevelFromStats, levelQuest, questCells } from '@/lib/reputation';

describe('levelQuest', () => {
  it('asks a new player for one honored duel to become Mixed', () => {
    expect(levelQuest(0, 0)).toEqual({ level: 'new', next: 'fair', have: 0, need: 1 });
  });

  it('asks a clean record for five honored duels to become Reliable', () => {
    expect(levelQuest(3, 0)).toEqual({ level: 'fair', next: 'honorable', have: 3, need: 5 });
  });

  it('has nothing further at the top', () => {
    expect(levelQuest(9, 0)).toEqual({ level: 'honorable', next: null, have: 1, need: 1 });
  });

  it.each([
    [1, 3],
    [2, 2],
    [4, 1],
    [0, 7],
    [30, 40],
  ])('asks %i honored and %i abandoned for exactly the duels that lift the level', (honored, abandoned) => {
    const quest = levelQuest(honored, abandoned);
    const rank = ['new', 'unreliable', 'fair', 'honorable'];

    expect(quest.next).toBe(getReputationLevelFromStats(quest.need, abandoned));
    expect(rank.indexOf(quest.next ?? '')).toBeGreaterThan(rank.indexOf(quest.level));
    expect(getReputationLevelFromStats(quest.need - 1, abandoned)).toBe(quest.level);
  });

  it('finds the way up even behind many abandoned duels', () => {
    const quest = levelQuest(0, 5000);

    expect(quest.level).toBe('unreliable');
    expect(getReputationLevelFromStats(quest.need, 5000)).toBe(quest.next);
  });
});

describe('questCells', () => {
  it('lights one cell per honored duel when the quest is short', () => {
    expect(questCells({ level: 'fair', next: 'honorable', have: 3, need: 5 })).toEqual({ count: 5, lit: 3 });
  });

  it('shares out at most twelve cells on a long quest', () => {
    expect(questCells({ level: 'unreliable', next: 'fair', have: 30, need: 60 })).toEqual({ count: 12, lit: 6 });
  });

  it('lights the one cell at the top', () => {
    expect(questCells({ level: 'honorable', next: null, have: 1, need: 1 })).toEqual({ count: 1, lit: 1 });
  });
});
