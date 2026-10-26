import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerGameRead } from '@/lib/serverGame';

const server = vi.hoisted(() => ({ read: { status: 'unread' } as ServerGameRead }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/serverGame', () => ({ readGame: async () => server.read }));

const { generateMetadata } = await import('@/app/games/[slug]/page');

const LINEAGE = { slug: 'lineage-2', name: 'Lineage 2', iconUrl: null, category: 'OTHER', duelCount: 2, createdAt: null, updatedAt: null } as const;

function metadataOf(slug: string) {
  return generateMetadata({ params: Promise.resolve({ slug }) });
}

afterEach(() => {
  server.read = { status: 'unread' };
});

describe('a game page', () => {
  it('is a 404 for a game neither the catalog nor a guide knows', async () => {
    server.read = { status: 'missing' };

    await expect(metadataOf('zork')).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('stands on its guide before anyone has duelled in the game, and is listed', async () => {
    server.read = { status: 'missing' };

    const metadata = await metadataOf('valorant');

    expect([metadata.title, metadata.robots]).toEqual(['Valorant 1v1 for money — USDT duels', expect.objectContaining({ index: true })]);
  });

  it('names a game without a guide, and keeps it out of search results', async () => {
    server.read = { status: 'found', game: LINEAGE };

    const metadata = await metadataOf('lineage-2');

    expect([metadata.title, metadata.robots]).toEqual(['Lineage 2: 1v1 duels for USDT', { index: false, follow: true }]);
  });

  it('gives no 404 when there is no backend to ask', async () => {
    const metadata = await metadataOf('zork');

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
