// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pageTranslations } from '@/i18n/pageTranslations';
import { translations } from '@/i18n/translations';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
// The parts with a test of their own: the demo reads the contract, the note the build's time.
vi.mock('@/components/landing/DemoDuel', () => ({ DemoDuel: () => <section id="demo" /> }));
vi.mock('@/components/landing/DevNote', () => ({ DevNote: () => <aside /> }));
vi.mock('@/components/landing/HeroFacts', () => ({ HeroFacts: () => <dl /> }));

const { Hero } = await import('@/components/landing/Hero');

afterEach(cleanup);

describe('Hero', () => {
  it('heads the page with what the site is, in the words people search for it by', async () => {
    render(await Hero());

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(pageTranslations.en['hero.title']);
  });

  it('keeps the motto above the heading, as its own line', async () => {
    const { container } = render(await Hero());

    expect(container.querySelector('hgroup')?.textContent).toBe(
      `${translations.en['motto.1']}${translations.en['motto.2']}${pageTranslations.en['hero.title']}`
    );
  });

  it('offers creating a duel, and browsing the open ones further down the page', async () => {
    render(await Hero());

    expect(screen.getByRole('link', { name: 'Create a duel' }).getAttribute('href')).toBe('/duel/create');
    expect(screen.getByRole('link', { name: 'Browse public duels' }).getAttribute('href')).toBe('#public-duels');
  });

  it('puts the demo duel beside the words', async () => {
    const { container } = render(await Hero());

    expect(container.querySelector('#demo')).toBeTruthy();
  });
});
