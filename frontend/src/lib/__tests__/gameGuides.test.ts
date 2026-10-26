import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/i18n/language';
import { GAME_GUIDES, gameGuide, guideGame } from '@/lib/gameGuides';
import { isFormal } from './helpers/russianVoice';

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
    expect(copies.filter(({ copy }) => `${copy.title} | DuelMe`.length > 60).map(({ guide, language }) => `${guide.slug}:${language}`)).toEqual([]);
  });

  it('keeps every description within what a search result shows', () => {
    expect(copies.filter(({ copy }) => copy.description.length > 160).map(({ guide, language }) => `${guide.slug}:${language}`)).toEqual([]);
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

  it('turns a guide into a game nobody has duelled in yet', () => {
    expect(guideGame(GAME_GUIDES[0])).toMatchObject({ slug: 'cs2', name: 'CS2', category: 'FPS', duelCount: 0 });
  });
});
