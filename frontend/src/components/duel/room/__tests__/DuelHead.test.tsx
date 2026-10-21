// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DuelHead } from '@/components/duel/room/DuelHead';
import { translations } from '@/i18n/translations';
import type { PhaseLabel } from '@/lib/duelPhase';

afterEach(cleanup);

const en = translations.en;
const WAITING: PhaseLabel = { key: 'duel.waiting', tone: 'waiting', isLive: false };
const LIVE: PhaseLabel = { key: 'duel.inProgress', tone: 'live', isLive: true };
const CREATED_AT = BigInt(Math.floor(Date.now() / 1000) - 600);

function head(overrides: Partial<Parameters<typeof DuelHead>[0]> = {}) {
  return (
    <DuelHead
      duelId={6}
      titleId="arena-title"
      game={{ name: 'Chess', category: 'STRATEGY' }}
      isPublic
      createdAt={CREATED_AT}
      label={WAITING}
      {...overrides}
    />
  );
}

describe('DuelHead', () => {
  it('heads the duel with its game, its number beside', () => {
    render(head());

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Chess');
    expect(screen.getByRole('heading', { level: 1 }).id).toBe('arena-title');
    expect(screen.getByText(en['duel.title'].replace('{id}', '6'))).toBeTruthy();
    expect(screen.getByText(en['category.STRATEGY'])).toBeTruthy();
  });

  it('heads a duel created without a game with its number', () => {
    render(head({ game: null }));

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en['duel.title'].replace('{id}', '6'));
  });

  it.each([
    [true, 'duel.public'],
    [false, 'duel.private'],
  ] as const)('says who may join (public: %s)', (isPublic, key) => {
    render(head({ isPublic }));

    expect(screen.getByText(en[key])).toBeTruthy();
  });

  it('says when the duel was made', () => {
    render(head());

    expect(screen.getByText(en['room.created'].replace('{when}', en['timeAgo.minutes'].replace('{n}', '10')))).toBeTruthy();
  });

  it('pulses the state only while a player has to act', () => {
    const { rerender } = render(head());
    expect(document.querySelector('.after\\:animate-on-air')).toBeNull();

    rerender(head({ label: LIVE }));

    expect(screen.getByText(en['duel.inProgress'])).toBeTruthy();
    expect(document.querySelector('.after\\:animate-on-air')).not.toBeNull();
  });

  it('pops the state when it changes while the page is open, not as it opens', () => {
    const { rerender } = render(head());
    expect(screen.getByText(en['duel.waiting']).parentElement?.className).not.toContain('animate-pop');

    rerender(head({ label: LIVE }));

    expect(screen.getByText(en['duel.inProgress']).parentElement?.className).toContain('animate-pop');
  });

  it('keeps the state in a region a screen reader reads out when it changes', () => {
    render(head());

    expect(screen.getByText(en['duel.waiting']).closest('[aria-live="polite"]')).not.toBeNull();
  });
});
