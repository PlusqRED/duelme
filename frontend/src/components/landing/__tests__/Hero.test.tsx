// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
// The parts with a test of their own: the demo reads the contract, the note the build's time.
vi.mock('@/components/landing/DemoDuel', () => ({ DemoDuel: () => <section id="demo" /> }));
vi.mock('@/components/landing/DevNote', () => ({ DevNote: () => <aside /> }));
vi.mock('@/components/landing/HeroFacts', () => ({ HeroFacts: () => <dl /> }));

const { Hero } = await import('@/components/landing/Hero');

afterEach(cleanup);

describe('Hero', () => {
  it('opens the page with the motto as its one heading', async () => {
    render(await Hero());

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      `${translations.en['motto.1']}${translations.en['motto.2']}`
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
