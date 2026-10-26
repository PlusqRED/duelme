// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { translations } from '@/i18n/translations';
import { GAME_GUIDES } from '@/lib/gameGuides';

vi.mock('next/headers', () => ({ headers: async () => new Headers({ [LANGUAGE_HEADER]: 'ru' }) }));

const { GuideShortcuts } = await import('@/components/game/GuideShortcuts');

afterEach(cleanup);

function links() {
  const nav = screen.getByRole('navigation', { name: translations.ru['games.guidesLabel'] });
  return within(nav).getAllByRole('link').map((link) => link.getAttribute('href'));
}

describe('GuideShortcuts', () => {
  it('leads to every game with a guide, at its address in the page’s language', async () => {
    render(<LanguageProvider language="ru">{await GuideShortcuts({})}</LanguageProvider>);

    expect(links()).toEqual(GAME_GUIDES.map((guide) => `/ru/games/${guide.slug}`));
  });

  it('leaves out the game whose page it is on', async () => {
    render(<LanguageProvider language="ru">{await GuideShortcuts({ except: 'cs2' })}</LanguageProvider>);

    expect(links()).not.toContain('/ru/games/cs2');
    expect(links()).toHaveLength(GAME_GUIDES.length - 1);
  });
});
