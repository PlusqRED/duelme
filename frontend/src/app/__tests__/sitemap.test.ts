import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';

const entries = sitemap();

function entry(url: string) {
  return entries.find((candidate) => candidate.url === url);
}

describe('sitemap', () => {
  it('lists every page in English and in Russian', () => {
    expect(entries.map((candidate) => candidate.url)).toEqual(
      expect.arrayContaining(['https://duelme.pro', 'https://duelme.pro/ru', 'https://duelme.pro/games', 'https://duelme.pro/ru/games'])
    );
  });

  it('gives each page its versions in every language and a default for the rest', () => {
    expect(entry('https://duelme.pro/ru/duels/public')?.alternates?.languages).toEqual({
      en: 'https://duelme.pro/duels/public',
      ru: 'https://duelme.pro/ru/duels/public',
      'x-default': 'https://duelme.pro/duels/public',
    });
  });

  it('leaves out a player’s own pages', () => {
    expect(entries.filter((candidate) => /\/(dashboard|profile)/.test(candidate.url))).toEqual([]);
  });

  it('claims no change date and no priority it cannot back', () => {
    expect(entries.filter((candidate) => 'lastModified' in candidate || 'priority' in candidate)).toEqual([]);
  });
});
