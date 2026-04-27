import { describe, it, expect } from 'vitest';
import { isValidInstagramHandle, stripInstagramAt, PROFILE_LIMITS } from '../profile';

describe('stripInstagramAt', () => {
  it('strips a leading @', () => {
    expect(stripInstagramAt('@alice')).toBe('alice');
  });

  it('returns the input unchanged when no @', () => {
    expect(stripInstagramAt('alice')).toBe('alice');
  });

  it('trims surrounding whitespace', () => {
    expect(stripInstagramAt(' @alice ')).toBe('alice');
  });

  it('only strips one leading @', () => {
    expect(stripInstagramAt('@@alice')).toBe('@alice');
  });
});

describe('isValidInstagramHandle', () => {
  it.each([
    'user',
    'user.name',
    'user_123',
    'a',
    'a.b_c',
    '1',
    '1user',
    'user.name.with.dots',
    'abcdefghij1234567890abcdefghij', // 30 chars
    '@valid',
    '@user.name',
    ' @valid ',
  ])('accepts valid handle %s', (handle) => {
    expect(isValidInstagramHandle(handle)).toBe(true);
  });

  it.each([
    '.leading',
    'trailing.',
    'consec..utive',
    'a..b',
    'abcdefghij1234567890abcdefghij1', // 31 chars
    'hello world',
    'user-name',
    'user@name',
    'спасибо',
    '',
  ])('rejects invalid handle %s', (handle) => {
    expect(isValidInstagramHandle(handle)).toBe(false);
  });

  it('rejects empty string and null-ish', () => {
    expect(isValidInstagramHandle('')).toBe(false);
    // @ts-expect-error -- runtime safety: non-string input
    expect(isValidInstagramHandle(null)).toBe(false);
    // @ts-expect-error -- runtime safety: non-string input
    expect(isValidInstagramHandle(undefined)).toBe(false);
  });
});

describe('PROFILE_LIMITS', () => {
  it('exposes expected text limits', () => {
    expect(PROFILE_LIMITS.nickname).toBe(30);
    expect(PROFILE_LIMITS.battleCry).toBe(100);
    expect(PROFILE_LIMITS.aboutMe).toBe(500);
    expect(PROFILE_LIMITS.pronouns).toBe(16);
    expect(PROFILE_LIMITS.region).toBe(30);
    expect(PROFILE_LIMITS.gameTag).toBe(30);
    expect(PROFILE_LIMITS.gamesMax).toBe(20);
  });
});
