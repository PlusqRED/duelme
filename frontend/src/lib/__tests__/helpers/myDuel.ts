import { DuelState } from '@/lib/contracts';
import type { MyDuel } from '@/lib/dashboard';
import { seatOf, type DuelRecord } from '@/lib/duel';
import { duelPhase } from '@/lib/duelPhase';
import { duelView } from './duelView';

/** The reader of the dashboard in a test, and the player they meet. */
export const READER: `0x${string}` = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
export const RIVAL: `0x${string}` = '0x32a3000000000000000000000000000000aa23';
/** The moment a test's dashboard is read at, in seconds, and the contract's time to answer. */
export const DASH_NOW = 1_800_000_000;
export const DASH_TIMEOUT = 86_400;

/**
 * One of the reader's duels as the dashboard files it: by default a match on between the reader
 * (creator) and their rival, with the fields a test cares about overridden. Not named `*.test.ts`,
 * so vitest's `include` glob does not collect it.
 */
export function myDuel(id: number, overrides: Partial<DuelRecord> = {}): MyDuel {
  const duel: DuelRecord = { ...duelView({ creator: READER, opponent: RIVAL, state: DuelState.Funded, ...overrides }), id };
  const seat = seatOf(duel, READER);
  if (!seat) throw new Error('The reader sits in every dashboard duel');
  return { duel, phase: duelPhase(duel, DASH_NOW, DASH_TIMEOUT), seat };
}
