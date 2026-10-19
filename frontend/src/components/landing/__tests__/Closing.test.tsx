// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_COOKIE } from '@/i18n/language';
import { translations } from '@/i18n/translations';

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === LANGUAGE_COOKIE ? { name, value: 'ru' } : undefined),
  }),
}));

const { Closing } = await import('@/components/landing/Closing');

afterEach(cleanup);

describe('Closing', () => {
  it('ends the page with the way to create a duel, in the reader’s language', async () => {
    render(await Closing());

    expect(screen.getByRole('region', { name: translations.ru['cta.title'] })).toBeTruthy();
    expect(screen.getByRole('link', { name: translations.ru['hero.cta'] }).getAttribute('href')).toBe('/duel/create');
  });
});
