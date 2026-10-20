import { describe, expect, it } from 'vitest';
import { returnPath } from '@/i18n/languageSwitch';

describe('returnPath', () => {
  it.each(['/', '/games', '/duel/7?from=list#0x5f2a', '/duels/public?q=dota%202'])('keeps the page %s', (path) => {
    expect(returnPath(path)).toBe(path);
  });

  it.each([
    ['another site', 'https://evil.example/'],
    ['a site named after two slashes', '//evil.example'],
    ['a site named after a backslash', '/\\evil.example'],
    ['a path without its slash', 'games'],
    ['a line break', '/games\r\nSet-Cookie: x=1'],
    ['a space', '/games now'],
    ['a value far too long', `/${'a'.repeat(2048)}`],
    ['nothing', undefined],
    ['a file', new Blob(['/games'])],
  ])('sends the reader home instead of to %s', (_, value) => {
    expect(returnPath(value)).toBe('/');
  });
});
