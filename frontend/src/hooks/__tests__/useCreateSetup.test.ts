// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateSetup } from '@/hooks/useCreateSetup';
import { CREATE_DUEL_DRAFT_KEY } from '@/lib/createDuelDraft';
import type { Game } from '@/lib/game';

const CHAIN_ID = 421614;
const LIMITS = { minWager: 0.3, claimTimeout: 3600, maxMessageCharacters: 32, maxMessageBytes: 128 };
const CHESS: Game = { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 1, createdAt: null, updatedAt: null };

function stored(fields: Record<string, unknown>) {
  window.sessionStorage.setItem(
    CREATE_DUEL_DRAFT_KEY,
    JSON.stringify({ chainId: CHAIN_ID, game: null, amount: '', message: '', isPublic: false, ...fields })
  );
}

function setup(isDraftClosed = false) {
  return renderHook(({ closed }) => useCreateSetup({ chainId: CHAIN_ID, limits: LIMITS, isDraftClosed: closed }), {
    initialProps: { closed: isDraftClosed },
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useCreateSetup', () => {
  it('starts on the game step with nothing chosen', () => {
    const { result } = setup();

    expect(result.current.progress.open).toBe('game');
    expect(result.current.answers).toEqual({ game: false, stake: false, access: true, message: true });
    expect(result.current.focusTurn).toBe(0);
  });

  it('opens the stake step a moment after a game is picked, for the player to see it picked', () => {
    vi.useFakeTimers();
    const { result } = setup();

    act(() => result.current.pickGame(CHESS));
    expect(result.current.progress.open).toBe('game');
    act(() => vi.advanceTimersByTime(320));

    expect(result.current.form.game).toBe(CHESS);
    expect(result.current.progress.open).toBe('stake');
    expect(result.current.focusTurn).toBe(1);
  });

  it('stays where the player went before the moment is up', () => {
    vi.useFakeTimers();
    const { result } = setup();
    act(() => result.current.pickGame(CHESS));

    act(() => result.current.open('access'));
    act(() => vi.advanceTimersByTime(320));

    expect(result.current.progress.open).toBe('access');
  });

  it('reads the stake the way it is typed', () => {
    const { result } = setup();

    act(() => result.current.update({ stakeText: '4,2' }));

    expect(result.current.reading).toMatchObject({ kind: 'valid', amount: '4.2', raw: 4_200_000n });
    expect(result.current.answers.stake).toBe(true);
  });

  it('judges the message without the spaces around it', () => {
    const { result } = setup();

    act(() => result.current.update({ message: `  ${'x'.repeat(32)}  ` }));

    expect(result.current.message).toBe('x'.repeat(32));
    expect(result.current.answers.message).toBe(true);
  });

  it('goes on to the next step that needs an answer', () => {
    const { result } = setup();
    act(() => result.current.update({ game: CHESS, stakeText: '5' }));

    act(() => result.current.next('game'));
    act(() => result.current.next('stake'));

    expect(result.current.progress.open).toBe('access');
  });

  it('brings a stored draft back with its answered steps closed', () => {
    stored({ game: { slug: 'chess', name: 'Chess', category: 'STRATEGY' }, amount: '5', message: 'gg' });

    const { result } = setup();

    expect(result.current.form).toMatchObject({ stakeText: '5', message: 'gg' });
    expect(result.current.form.game?.name).toBe('Chess');
    expect(result.current.progress.open).toBeNull();
    expect(result.current.focusTurn).toBe(0);
  });

  it('keeps the form in the tab as it is typed', () => {
    const { result } = setup();

    act(() => result.current.update({ stakeText: '7' }));

    expect(JSON.parse(window.sessionStorage.getItem(CREATE_DUEL_DRAFT_KEY) ?? '{}').amount).toBe('7');
  });

  it('drops the stored form once the duel is on its way', () => {
    stored({ amount: '5' });
    const { result, rerender } = setup();

    rerender({ closed: true });
    act(() => result.current.update({ stakeText: '9' }));

    expect(window.sessionStorage.getItem(CREATE_DUEL_DRAFT_KEY)).toBeNull();
  });

  it('starts over for another duel', () => {
    const { result } = setup();
    act(() => result.current.update({ game: CHESS, stakeText: '5', isPublic: true }));

    act(() => result.current.reset());

    expect(result.current.form).toEqual({ game: null, stakeText: '', isPublic: false, message: '' });
    expect(result.current.progress.open).toBe('game');
  });
});
