// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameGuide } from '@/lib/gameGuides';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

const { GameGuideBody } = await import('@/components/game/GameGuideBody');

const sections = [
  { heading: 'Agree on the match', text: 'Pick the time control.' },
  { heading: 'Playing it', text: 'Send a challenge.' },
  { heading: 'Settling the result', text: 'The winner claims the pot.' },
];
const copy = { title: 'Chess 1v1 for money', description: 'Play chess for USDT.', lead: 'One board.', sections };
const guide: GameGuide = { slug: 'chess', name: 'Chess', category: 'STRATEGY', copy: { en: copy, ru: copy } };

afterEach(cleanup);

describe('GameGuideBody', () => {
  it('heads the guide with the game it is about', async () => {
    render(await GameGuideBody({ guide }));

    expect(screen.getByRole('heading', { level: 2, name: 'How a duel in Chess goes' })).toBeTruthy();
  });

  it('gives each part its own heading and text, in order', async () => {
    render(await GameGuideBody({ guide }));

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(
      sections.map((section) => section.heading)
    );
    expect(screen.getByText('The winner claims the pot.')).toBeTruthy();
  });
});
