import type { Duel } from '@/lib/contracts';
import type { TurnViewer } from '@/lib/turnView';
import { duelView } from './duelView';

/**
 * The readers the turn panel's tests look at a duel as, and the duel two players joined.
 *
 * Not named `*.test.ts`, so vitest's `include` glob does not collect it.
 */

export const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
export const OPPONENT = '0x111111111111111111111111111111111111abcd' as const;
export const PRIVATE_HASH = `0x${'ab'.repeat(32)}` as const;

export function viewer(overrides: Partial<TurnViewer> = {}): TurnViewer {
  return { side: null, isSignedIn: false, hasKey: true, canJoin: false, shortRaw: 0n, isRelayed: true, ...overrides };
}

export const creator = viewer({ side: 'creator', isSignedIn: true });
export const opponent = viewer({ side: 'opponent', isSignedIn: true });
export const spectator = viewer({ isSignedIn: true });
export const joiner = viewer({ isSignedIn: true, canJoin: true });

export function joined(overrides: Partial<Duel> = {}): Duel {
  return duelView({ creator: CREATOR, opponent: OPPONENT, ...overrides });
}
