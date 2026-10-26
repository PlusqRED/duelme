import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '@/i18n/language';
import { GAME_GUIDES } from '@/content/gameGuides';
import { featuredGuides, gameGuide, relatedGuides } from '@/lib/gameGuides';
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

const APPLICATION_YML = readFileSync(join(__dirname, '../../../../backend/src/main/resources/application.yml'), 'utf8');

/** `duelme.catalog.games` in the backend's application.yml: every game it writes into the catalog, with its category. */
function readBackendCatalog(): Map<string, string> {
  const block = /^ {2}catalog:\n {4}games:\n((?: {6}.*\n)+)/m.exec(APPLICATION_YML)?.[1] ?? '';
  const catalog = new Map<string, string>();
  let category = '';
  for (const line of block.split('\n')) {
    const heading = /^ {6}([A-Z]+):$/.exec(line);
    const name = /^ {8}- "?(.+?)"?$/.exec(line);
    if (heading) category = heading[1];
    else if (name) catalog.set(name[1], category);
  }
  return catalog;
}

const BACKEND_CATALOG = readBackendCatalog();

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

  it.each(GAME_GUIDES.map((guide) => [guide.name, guide.category]))(
    'has the backend put %s into the catalog under %s, so a player finds it before anyone has played it',
    (name, category) => {
      expect(BACKEND_CATALOG.get(name)).toBe(category);
    }
  );

  it('finds a guide by its slug, and none for a game without one', () => {
    expect([gameGuide('cs2')?.name, gameGuide('lineage-2')]).toEqual(['CS2', null]);
  });
});

describe('featuredGuides', () => {
  const leaders = GAME_GUIDES.filter((guide, index) => GAME_GUIDES.findIndex(({ category }) => category === guide.category) === index);

  it('offers the most searched game of every category first, then the most searched of the rest, in the guides’ order', () => {
    const featured = featuredGuides(leaders.length + 2);
    const rest = GAME_GUIDES.filter((guide) => !leaders.includes(guide)).slice(0, 2);

    expect(featured).toEqual(GAME_GUIDES.filter((guide) => leaders.includes(guide) || rest.includes(guide)));
  });

  it('keeps to the count, taking the categories’ leaders in the guides’ order when they are more', () => {
    expect(featuredGuides(2)).toEqual(leaders.slice(0, 2));
  });
});

describe('relatedGuides', () => {
  it('offers the games of the same category first, then the most searched, never the page’s own', () => {
    const chess = gameGuide('chess');
    const boardGames = GAME_GUIDES.filter((guide) => guide.category === 'BOARD' && guide.slug !== 'chess');

    const related = relatedGuides('chess', chess?.category, boardGames.length + 1);

    expect(related.slice(0, boardGames.length)).toEqual(boardGames);
    expect(related.at(-1)).toBe(GAME_GUIDES.find((guide) => guide.category !== 'BOARD'));
  });

  it('offers the most searched games under a game with no category of guides', () => {
    expect(relatedGuides('lineage-2', 'OTHER', 3)).toEqual(GAME_GUIDES.slice(0, 3));
  });
});
