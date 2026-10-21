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

const { Footer } = await import('@/components/layout/Footer');

afterEach(cleanup);

describe('Footer', () => {
  it('arrives from the server in the reader\'s language', async () => {
    render(await Footer());

    expect(screen.getByText(translations.ru['footer.tagline'])).toBeTruthy();
  });

  it('links both channels by name, opening them in a new tab', async () => {
    render(await Footer());

    for (const name of ['Telegram', 'Instagram']) {
      const link = screen.getByRole('link', { name });
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});
