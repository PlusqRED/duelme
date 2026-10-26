import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readGame } from '@/lib/serverGame';
import { mockFetch } from './helpers/mockFetch';

const chess = { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 1, createdAt: null, updatedAt: null };

beforeEach(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://backend:8080/api/v1');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('readGame', () => {
  it('asks the backend at its address inside the deploy network, and gives up on one that does not answer', async () => {
    const fetchMock = mockFetch({ json: async () => chess });

    await readGame('chess');

    expect(fetchMock).toHaveBeenCalledWith('http://backend:8080/api/v1/games/chess', { signal: expect.any(AbortSignal) });
  });

  it('gives the game the backend has', async () => {
    mockFetch({ json: async () => chess });

    await expect(readGame('chess')).resolves.toEqual({ status: 'found', game: chess });
  });

  it('calls a game the backend does not have missing', async () => {
    mockFetch({ ok: false, status: 404 });

    await expect(readGame('nope')).resolves.toEqual({ status: 'missing' });
  });

  it('fails when the backend does, rather than call the game missing', async () => {
    mockFetch({ ok: false, status: 503 });

    await expect(readGame('chess')).rejects.toThrow();
  });

  it('reads nothing where no backend runs', async () => {
    vi.stubEnv('API_INTERNAL_URL', '');
    const fetchMock = mockFetch();

    await expect(readGame('chess')).resolves.toEqual({ status: 'unread' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
