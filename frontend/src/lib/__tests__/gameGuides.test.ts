import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/i18n/language';
import { GAME_GUIDES } from '@/content/gameGuides';
import { gameGuide } from '@/lib/gameGuides';
import { isFormal } from './helpers/russianVoice';
import { RESULT_DESCRIPTION_LIMIT, RESULT_TITLE_LIMIT, resultTitle } from './helpers/searchResult';

/** The backend's `GameService.toSlug` for a Latin name: the slug a game gets when a player names it in a duel. */
function backendSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const copies = GAME_GUIDES.flatMap((guide) => LANGUAGES.map((language) => ({ guide, language, copy: guide.copy[language] })));

describe('game guides', () => {
  it.each(GAME_GUIDES.map((guide) => [guide.name, guide.slug]))(
    'gives %s the slug the backend makes from its name, so a duel in it lands on its guide',
    (name, slug) => {
      expect(backendSlug(name)).toBe(slug);
    }
  );

  it('has one guide per game', () => {
    expect(new Set(GAME_GUIDES.map((guide) => guide.slug)).size).toBe(GAME_GUIDES.length);
  });

  it('keeps every title whole in a search result once the site’s name follows it', () => {
    expect(copies.filter(({ copy }) => resultTitle(copy.title).length > RESULT_TITLE_LIMIT).map(({ guide, language }) => `${guide.slug}:${language}`)).toEqual([]);
  });

  it('keeps every description within what a search result shows', () => {
    expect(copies.filter(({ copy }) => copy.description.length > RESULT_DESCRIPTION_LIMIT).map(({ guide, language }) => `${guide.slug}:${language}`)).toEqual([]);
  });

  it('gives every guide the same parts in every language', () => {
    expect(copies.filter(({ copy }) => copy.sections.length !== 3).map(({ guide, language }) => `${guide.slug}:${language}`)).toEqual([]);
  });

  it('says «ты» in Russian', () => {
    const texts = GAME_GUIDES.flatMap(({ slug, copy: { ru } }) =>
      [ru.title, ru.description, ru.lead, ...ru.sections.flatMap((section) => [section.heading, section.text])].map((text) => ({ slug, text }))
    );

    expect(texts.filter(({ text }) => isFormal(text))).toEqual([]);
  });

  it('finds a guide by its slug, and none for a game without one', () => {
    expect([gameGuide('cs2')?.name, gameGuide('lineage-2')]).toEqual(['CS2', null]);
  });
});
