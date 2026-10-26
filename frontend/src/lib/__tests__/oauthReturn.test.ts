import { describe, expect, it } from 'vitest';
import { OAUTH_RETURN_KEY, rememberOAuthReturn, takeOAuthReturn } from '@/lib/oauthReturn';

function memoryStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    has: (key: string) => map.has(key),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error('blocked');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

describe('OAuth return language', () => {
  it('gives back the language the player left in', () => {
    const storage = memoryStorage();

    rememberOAuthReturn('ru', storage);

    expect(takeOAuthReturn(storage)).toBe('ru');
  });

  it('gives it back once, so a later visit to the profile stays where it is', () => {
    const storage = memoryStorage();
    rememberOAuthReturn('ru', storage);

    takeOAuthReturn(storage);

    expect(takeOAuthReturn(storage)).toBeNull();
    expect(storage.has(OAUTH_RETURN_KEY)).toBe(false);
  });

  it('is nothing without a kept language', () => {
    expect(takeOAuthReturn(memoryStorage())).toBeNull();
  });

  it('does not take a value that is not one of the site’s languages', () => {
    expect(takeOAuthReturn(memoryStorage({ [OAUTH_RETURN_KEY]: 'de' }))).toBeNull();
  });

  it('survives a browser that blocks storage', () => {
    expect(() => rememberOAuthReturn('ru', throwingStorage())).not.toThrow();
    expect(takeOAuthReturn(throwingStorage())).toBeNull();
  });
});
