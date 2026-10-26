import { cache } from 'react';
import type { Game } from '@/lib/game';
import { fetchGameBySlug } from '@/lib/gameApi';

/**
 * Long enough for the backend beside the page server; short enough that a stuck one does not hold
 * the page open.
 */
const READ_TIMEOUT_MS = 3000;

/** What a catalog slug can be: `GameService.toSlug` keeps a-z, digits and hyphens (`g-<hex>` included). */
const CATALOG_SLUG = /^[a-z0-9-]+$/;

/** What the page server knows of a game before the page renders; `unread` leaves it to the browser. */
export type ServerGameRead = { status: 'found'; game: Game } | { status: 'missing' } | { status: 'unread' };

/**
 * One game of the catalog, read on the page server once per request however many parts of the page
 * ask. The server reaches the backend inside the deploy's network (`API_INTERNAL_URL`): the
 * browser's relative `/api/v1` means nothing to it. A slug the catalog could never hold is missing
 * without asking. Where no backend runs — a local dev server, the browser tests — or the read
 * fails, the game is `unread`, and the page reads it in the browser, with its own retry; a failed
 * read is logged.
 */
export const readGame = cache(async (slug: string): Promise<ServerGameRead> => {
  if (!CATALOG_SLUG.test(slug)) return { status: 'missing' };
  const base = process.env.API_INTERNAL_URL?.trim();
  if (!base) return { status: 'unread' };
  try {
    const game = await fetchGameBySlug(slug, { base, signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
    return game ? { status: 'found', game } : { status: 'missing' };
  } catch (error) {
    console.error(`[game page] ${slug}: the catalog could not be read, the browser reads it`, error);
    return { status: 'unread' };
  }
});
