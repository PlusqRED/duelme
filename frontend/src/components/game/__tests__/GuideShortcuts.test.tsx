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

describe('GuideShortcuts', () => {
  it('leads to every game with a guide, at its address in the page’s language', async () => {
    renderIn('ru', await GuideShortcuts({}));

    expect(links()).toEqual(GAME_GUIDES.map((guide) => `/ru/games/${guide.slug}`));
  });

  it('leaves out the game whose page it is on', async () => {
    renderIn('ru', await GuideShortcuts({ except: 'cs2' }));

    expect(links()).not.toContain('/ru/games/cs2');
    expect(links()).toHaveLength(GAME_GUIDES.length - 1);
  });
});
