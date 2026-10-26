// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

const { GameGuideBody } = await import('@/components/game/GameGuideBody');

const sections = [
  { heading: 'Agree on the match', text: 'Pick the time control.' },
  { heading: 'Playing it', text: 'Send a challenge.' },
  { heading: 'Settling the result', text: 'The winner claims the pot.' },
];

afterEach(cleanup);

describe('GameGuideBody', () => {
  it('heads the guide with the game it is about', async () => {
    render(await GameGuideBody({ gameName: 'Chess', category: 'STRATEGY', sections }));

    expect(screen.getByRole('heading', { level: 2, name: 'How a duel in Chess goes' })).toBeTruthy();
  });

  it('gives each part its own heading and text, in order', async () => {
    render(await GameGuideBody({ gameName: 'Chess', category: 'STRATEGY', sections }));

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(
      sections.map((section) => section.heading)
    );
    expect(screen.getByText('The winner claims the pot.')).toBeTruthy();
  });
});
