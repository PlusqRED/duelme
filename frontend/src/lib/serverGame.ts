import { cache } from 'react';
import type { Game } from '@/lib/game';
import { fetchGameBySlug } from '@/lib/gameApi';

/**
 * Long enough for the backend beside the page server; short enough that a stuck one fails the page
 * rather than holding it open.
 */
const READ_TIMEOUT_MS = 3000;

/** What the page server knows of a game before the page renders; `unread` with no backend to ask. */
export type ServerGameRead = { status: 'found'; game: Game } | { status: 'missing' } | { status: 'unread' };

/**
 * One game of the catalog, read on the page server once per request however many parts of the page
 * ask. The server reaches the backend inside the deploy's network (`API_INTERNAL_URL`): the
 * browser's relative `/api/v1` means nothing to it. Where no backend runs — a local dev server, the
 * browser tests — the variable is unset and the page reads the game in the browser instead. A
 * backend that fails throws, so the page errors rather than call the game missing.
 */
export const readGame = cache(async (slug: string): Promise<ServerGameRead> => {
  const base = process.env.API_INTERNAL_URL?.trim();
  if (!base) return { status: 'unread' };
  const game = await fetchGameBySlug(slug, { base, signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
  return game ? { status: 'found', game } : { status: 'missing' };
});
