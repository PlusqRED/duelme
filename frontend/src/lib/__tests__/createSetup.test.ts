import { describe, expect, it } from 'vitest';
import {
  addedGame,
  advance,
  duelIdOfPath,
  FRESH_SETUP,
  isNewGame,
  isReachable,
  openStep,
  restoredSetup,
  stepStatus,
  wayOn,
  type SetupAnswers,
  type SetupProgress,
} from '@/lib/createSetup';
import type { Game } from '@/lib/game';

const NONE: SetupAnswers = { game: false, stake: false, access: true, message: true };
const GAME: SetupAnswers = { ...NONE, game: true };
const READY: SetupAnswers = { ...GAME, stake: true };
const ALL_SEEN: SetupProgress = { open: null, visited: { game: true, stake: true, access: true, message: true } };

const CS2: Game = {
  slug: 'cs-2',
  name: 'CS 2',
  iconUrl: null,
  category: 'FPS',
  duelCount: 2,
  createdAt: null,
  updatedAt: null,
};

describe('isReachable', () => {
  it('opens the game step from the start', () => {
    expect(isReachable('game', NONE)).toBe(true);
  });

  it('keeps the stake closed until a game is picked', () => {
    expect([isReachable('stake', NONE), isReachable('stake', GAME)]).toEqual([false, true]);
  });

  it('keeps the message closed until a stake is set', () => {
    expect([isReachable('message', GAME), isReachable('message', READY)]).toEqual([false, true]);
  });
});

describe('stepStatus', () => {
  it('marks the open step current', () => {
    expect(stepStatus('game', FRESH_SETUP, NONE)).toBe('current');
  });

  it('locks a step that waits for the ones above it', () => {
    expect(stepStatus('stake', FRESH_SETUP, NONE)).toBe('locked');
  });

  it('leaves a step that can open but was never opened as ahead', () => {
    expect(stepStatus('access', { ...FRESH_SETUP, open: 'stake' }, READY)).toBe('ahead');
  });

  it('marks a seen step with its answer done', () => {
    expect(stepStatus('game', { ...FRESH_SETUP, open: 'stake' }, GAME)).toBe('done');
  });

  it('marks a seen step that lost its answer a problem', () => {
    expect(stepStatus('message', ALL_SEEN, { ...READY, message: false })).toBe('problem');
  });
});

describe('openStep', () => {
  it('opens a step and remembers it was seen', () => {
    const progress = openStep(FRESH_SETUP, 'stake');

    expect(progress).toEqual({ open: 'stake', visited: { ...FRESH_SETUP.visited, stake: true } });
  });

  it('closes every step', () => {
    expect(openStep(ALL_SEEN, null)).toEqual(ALL_SEEN);
  });
});

describe('advance', () => {
  it('opens the next step after a picked game', () => {
    expect(advance(FRESH_SETUP, 'game', GAME).open).toBe('stake');
  });

  it('skips a step already seen and answered', () => {
    const progress: SetupProgress = { open: 'game', visited: { game: true, stake: true, access: true, message: false } };

    expect(advance(progress, 'game', READY).open).toBe('message');
  });

  it('closes every step once the last one is answered', () => {
    expect(advance({ ...ALL_SEEN, open: 'message' }, 'message', READY).open).toBeNull();
  });

  it('opens a later step that lost its answer', () => {
    expect(advance({ ...ALL_SEEN, open: 'game' }, 'game', { ...READY, message: false }).open).toBe('message');
  });
});

describe('restoredSetup', () => {
  it('starts at the game when the draft has none', () => {
    expect(restoredSetup(NONE)).toEqual(FRESH_SETUP);
  });

  it('opens the stake when the draft has a game but no stake', () => {
    expect(restoredSetup(GAME)).toEqual({ open: 'stake', visited: { game: true, stake: true, access: false, message: false } });
  });

  it('closes every step for a draft ready to create', () => {
    expect(restoredSetup(READY)).toEqual(ALL_SEEN);
  });

  it('opens the message when today’s limit no longer fits it', () => {
    expect(restoredSetup({ ...READY, message: false }).open).toBe('message');
  });
});

describe('wayOn', () => {
  const signedIn = { isSignedIn: true, isShort: false };

  it('asks for a game first', () => {
    expect(wayOn(NONE, { isSignedIn: false, isShort: true })).toBe('game');
  });

  it('asks for a stake next', () => {
    expect(wayOn(GAME, signedIn)).toBe('stake');
  });

  it('asks for a shorter message', () => {
    expect(wayOn({ ...READY, message: false }, signedIn)).toBe('message');
  });

  it('lets a visitor set the whole duel up before signing in', () => {
    expect(wayOn(READY, { isSignedIn: false, isShort: false })).toBe('signIn');
  });

  it('asks to top up a wallet short of the stake', () => {
    expect(wayOn(READY, { isSignedIn: true, isShort: true })).toBe('short');
  });

  it('is ready once nothing stands in the way', () => {
    expect(wayOn(READY, signedIn)).toBe('ready');
  });
});

describe('addedGame', () => {
  it('picks the catalog’s game when the name is one it has, however spelled', () => {
    expect(addedGame([CS2], 'cs2', 'OTHER')).toBe(CS2);
  });

  it('makes a new game with the name and category given', () => {
    const game = addedGame([CS2], '  Valorant ', 'FPS');

    expect(game).toMatchObject({ name: 'Valorant', category: 'FPS', duelCount: 0 });
    expect(isNewGame(game)).toBe(true);
  });

  it('tells a catalog game from a new one', () => {
    expect(isNewGame(CS2)).toBe(false);
  });
});

describe('duelIdOfPath', () => {
  it('reads the number of a public duel page', () => {
    expect(duelIdOfPath('/duel/7')).toBe(7);
  });

  it('reads the number before a private duel key', () => {
    expect(duelIdOfPath('/duel/42#0xabc')).toBe(42);
  });

  it('refuses a path that is not a duel page', () => {
    expect(duelIdOfPath('/duel/create')).toBeNull();
    expect(duelIdOfPath('/duel/7x')).toBeNull();
  });
});
