// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { translations } from '@/i18n/translations';

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ [LANGUAGE_HEADER]: 'ru' }),
}));

const { default: NotFound } = await import('@/app/not-found');
const { default: ErrorPage } = await import('@/app/error');

afterEach(cleanup);

describe('NotFound', () => {
  it('says there is nothing at the address, in the reader’s language', async () => {
    render(await NotFound());

    expect(screen.getByRole('heading', { level: 1, name: translations.ru['notFound.title'] })).toBeTruthy();
  });

  it('leads home and to the open duels, at the language’s addresses', async () => {
    render(<LanguageProvider language="ru">{await NotFound()}</LanguageProvider>);

    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/ru', '/ru/duels/public']);
  });
});

describe('ErrorPage', () => {
  it('tries the screen again on request', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: translations.en['action.tryAgain'] }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it('says the page did not load and leads home', () => {
    render(<ErrorPage error={new Error('boom')} reset={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 1, name: translations.en['error.title'] })).toBeTruthy();
    expect(screen.getByRole('link', { name: translations.en['notFound.home'] }).getAttribute('href')).toBe('/');
  });
});
