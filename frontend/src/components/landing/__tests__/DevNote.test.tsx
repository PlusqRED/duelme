// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_HEADER } from '@/i18n/language';
import { DEVLOG_URL } from '@/lib/constants';

const reader = vi.hoisted(() => ({ language: 'en' }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ [LANGUAGE_HEADER]: reader.language }),
}));

const { DevNote } = await import('@/components/landing/DevNote');

const NOW = new Date('2026-10-19T12:00:00Z');

beforeEach(() => {
  reader.language = 'en';
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.stubEnv('DUELME_BUILT_AT', '2026-10-17T08:30:00.000Z');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('DevNote', () => {
  it('says when the site was last built, in calendar days, with the moment for machines', async () => {
    render(await DevNote());

    const stamp = screen.getByText(/^Last update:/);
    expect(stamp.textContent).toBe('Last update: 2 days ago');
    expect(stamp.getAttribute('dateTime')).toBe('2026-10-17T08:30:00.000Z');
  });

  it('arrives in the reader’s language', async () => {
    reader.language = 'ru';
    vi.stubEnv('DUELME_BUILT_AT', '2026-10-18T23:00:00.000Z');

    render(await DevNote());

    expect(screen.getByRole('complementary', { name: 'Соло-проект. Для комьюнити, не ради прибыли.' })).toBeTruthy();
    expect(screen.getByText('Обновление: вчера')).toBeTruthy();
  });

  it('fails loudly on a build that did not write its time in', async () => {
    vi.stubEnv('DUELME_BUILT_AT', '');

    await expect(DevNote()).rejects.toThrow('DUELME_BUILT_AT');
  });

  it('keeps the rest of the note closed until asked, then opens it', async () => {
    render(await DevNote());
    const toggle = screen.getByRole('button', { name: 'Read the note' });
    const more = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(more?.hidden).toBe(true);

    fireEvent.click(toggle);

    expect(more?.hidden).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide the note' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('leads to the devlog in a new tab', async () => {
    render(await DevNote());

    const link = screen.getByRole('link', { name: 't.me/duelme_info' });
    expect(link.getAttribute('href')).toBe(DEVLOG_URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
