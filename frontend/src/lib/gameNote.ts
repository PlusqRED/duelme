import type { ContractConfig } from '@/lib/contractConfig';
import { isDuelMessageValid, normalizeDuelMessage } from '@/lib/duelMessage';

/** How many of a game's latest duels are read for a note. */
const LOOKBACK = 20;

/** A game's latest duels, newest first: where its note is looked for. */
export function latestDuelIds(ids: readonly number[]): number[] {
  return [...ids].sort((a, b) => b - a).slice(0, LOOKBACK);
}

/**
 * The newest note a duel of this game was made with that the message field would take today: a real
 * example of what players write for it (a map, a mode, a rating), shown as the field's placeholder.
 */
export function pickGameNote(duels: readonly { id: number; message: string }[], limits: ContractConfig): string | null {
  const newest = [...duels]
    .sort((a, b) => b.id - a.id)
    .map((duel) => normalizeDuelMessage(duel.message))
    .find((note) => note !== '' && isDuelMessageValid(note, limits));
  return newest ?? null;
}
