// @vitest-environment happy-dom
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { pageTranslations } from '@/i18n/pageTranslations';
import { GAME_GUIDES } from '@/content/gameGuides';
import { renderIn } from '@/lib/__tests__/helpers/renderIn';

vi.mock('next/headers', () => ({ headers: async () => new Headers({ [LANGUAGE_HEADER]: 'ru' }) }));

const { GuideShortcuts } = await import('@/components/game/GuideShortcuts');

afterEach(cleanup);

function links() {
  const nav = screen.getByRole('navigation', { name: pageTranslations.ru['games.guidesLabel'] });
  return within(nav).getAllByRole('link').map((link) => link.getAttribute('href'));
}

const allGames = () => screen.getByRole('link', { name: pageTranslations.ru['games.allGames'] });

describe('GuideShortcuts', () => {
  it('leads to the games it is given, at their addresses in the page’s language, then to the whole catalog', async () => {
    const guides = GAME_GUIDES.slice(0, 3);

    renderIn('ru', await GuideShortcuts({ guides }));

    expect(links()).toEqual([...guides.map((guide) => `/ru/games/${guide.slug}`), '/ru/games']);
  });

  it('counts the guides it leaves out on the way to the catalog', async () => {
    renderIn('ru', await GuideShortcuts({ guides: GAME_GUIDES.slice(0, 3) }));

    expect(allGames().textContent).toBe(`+${GAME_GUIDES.length - 3}${pageTranslations.ru['games.allGames']}`);
  });
});
