import { describe, expect, it } from 'vitest';
import { languageOfPath, localePath, stripLanguage } from '@/i18n/localePath';

describe('languageOfPath', () => {
  it.each([
    ['/', 'en'],
    ['/games', 'en'],
    ['/ru', 'ru'],
    ['/ru/games', 'ru'],
    ['/ru/duel/7', 'ru'],
  ] as const)('reads %s as %s', (pathname, language) => {
    expect(languageOfPath(pathname)).toBe(language);
  });

  it.each(['/rus', '/runner', '/en', '/en/games', '/games/ru'])('reads %s as English: only a whole first segment names a language', (pathname) => {
    expect(languageOfPath(pathname)).toBe('en');
  });
});

describe('stripLanguage', () => {
  it.each([
    ['/ru/games', '/games'],
    ['/ru', '/'],
    ['/ru/', '/'],
    ['/games', '/games'],
    ['/', '/'],
    ['/rus', '/rus'],
  ])('turns %s into %s', (pathname, page) => {
    expect(stripLanguage(pathname)).toBe(page);
  });
});

describe('localePath', () => {
  it('keeps an English page at its route’s own address', () => {
    expect(localePath('/games', 'en')).toBe('/games');
  });

  it('puts a Russian page under /ru', () => {
    expect(localePath('/games', 'ru')).toBe('/ru/games');
  });

  it('makes the Russian home page /ru, with no trailing slash', () => {
    expect(localePath('/', 'ru')).toBe('/ru');
  });

  it('carries the query and the hash along', () => {
    expect(localePath('/duels/recent?q=chess#top', 'ru')).toBe('/ru/duels/recent?q=chess#top');
    expect(localePath('/?q=1', 'ru')).toBe('/ru?q=1');
    expect(localePath('/dashboard#collect', 'ru')).toBe('/ru/dashboard#collect');
  });

  it('moves a page already in a language to the one asked for', () => {
    expect(localePath('/ru/games', 'en')).toBe('/games');
    expect(localePath('/ru/games', 'ru')).toBe('/ru/games');
    expect(localePath('/ru', 'en')).toBe('/');
  });

  it.each(['#demo', 'https://t.me/duelme_info', '//example.com/x', 'mailto:someone@example.com', ''])(
    'leaves %j alone: it is not a page of the site',
    (href) => {
      expect(localePath(href, 'ru')).toBe(href);
    }
  );
});
