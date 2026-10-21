import { describe, expect, it } from 'vitest';
import { getContractConfig } from '@/lib/contractConfig';
import {
  countDuelMessageCharacters,
  hasVisibleDuelMessage,
  isDuelMessageValid,
  normalizeDuelMessage,
} from '@/lib/duelMessage';

const LIMITS = { ...getContractConfig(), maxMessageCharacters: 32, maxMessageBytes: 128 };

describe('normalizeDuelMessage', () => {
  it('drops the spaces around a message', () => {
    expect(normalizeDuelMessage('  1x1 dust 2 awp \n')).toBe('1x1 dust 2 awp');
  });

  it('keeps the spaces inside it', () => {
    expect(normalizeDuelMessage('best  of 3')).toBe('best  of 3');
  });

  it('turns a message of spaces into none', () => {
    expect(normalizeDuelMessage('   ')).toBe('');
  });
});

describe('countDuelMessageCharacters', () => {
  it('counts an emoji as one character, as the contract does', () => {
    expect(countDuelMessageCharacters('gg 🎮')).toBe(4);
  });
});

describe('isDuelMessageValid', () => {
  it('accepts a message at the limit', () => {
    expect(isDuelMessageValid('x'.repeat(32), LIMITS)).toBe(true);
  });

  it('refuses one past it', () => {
    expect(isDuelMessageValid('x'.repeat(33), LIMITS)).toBe(false);
  });

  it('refuses a message within the characters but over the bytes', () => {
    expect(isDuelMessageValid('🎮'.repeat(33), { ...LIMITS, maxMessageCharacters: 40 })).toBe(false);
  });

  it('accepts no message', () => {
    expect(isDuelMessageValid('', LIMITS)).toBe(true);
  });

  it('judges a message the limit fits only once it is normalized', () => {
    const typed = `${'x'.repeat(32)}   `;

    expect([isDuelMessageValid(typed, LIMITS), isDuelMessageValid(normalizeDuelMessage(typed), LIMITS)]).toEqual([false, true]);
  });
});

describe('hasVisibleDuelMessage', () => {
  it.each([null, undefined, '', '  '])('sees nothing to show in %j', (value) => {
    expect(hasVisibleDuelMessage(value)).toBe(false);
  });

  it('sees a message with words', () => {
    expect(hasVisibleDuelMessage(' gg ')).toBe(true);
  });
});
