import { describe, it, expect } from 'vitest';
import { isValidInstagramHandle, stripInstagramAt } from '../profile';

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
