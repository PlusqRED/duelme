import { describe, expect, it } from 'vitest';
import { getContractConfig } from '@/lib/contractConfig';
import { latestDuelIds, pickGameNote } from '@/lib/gameNote';

const LIMITS = { ...getContractConfig(), maxMessageCharacters: 32, maxMessageBytes: 128 };

describe('latestDuelIds', () => {
  it('puts the newest duels first', () => {
    expect(latestDuelIds([3, 11, 7])).toEqual([11, 7, 3]);
  });

  it('reads no more than the latest twenty', () => {
    const ids = Array.from({ length: 30 }, (_, index) => index);

    expect(latestDuelIds(ids)).toEqual(ids.slice(10).reverse());
  });
});

describe('pickGameNote', () => {
  it('takes the newest duel’s note', () => {
    const duels = [
      { id: 2, message: '1x1 dust 2 awp' },
      { id: 5, message: 'best of 3 on mirage' },
    ];

    expect(pickGameNote(duels, LIMITS)).toBe('best of 3 on mirage');
  });

  it('passes over duels made without a note', () => {
    const duels = [
      { id: 2, message: '1x1 dust 2 awp' },
      { id: 5, message: '   ' },
    ];

    expect(pickGameNote(duels, LIMITS)).toBe('1x1 dust 2 awp');
  });

  it('passes over a note the field would not take today', () => {
    const duels = [
      { id: 2, message: '2300 ELO' },
      { id: 5, message: 'x'.repeat(40) },
    ];

    expect(pickGameNote(duels, LIMITS)).toBe('2300 ELO');
  });

  it('gives the note without the spaces around it', () => {
    expect(pickGameNote([{ id: 1, message: '  go 1x1 on sf mid ' }], LIMITS)).toBe('go 1x1 on sf mid');
  });

  it('has none for a game with no notes', () => {
    expect(pickGameNote([], LIMITS)).toBeNull();
  });
});
