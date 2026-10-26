import { afterEach, describe, expect, it, vi } from 'vitest';
import { readGame } from '@/lib/serverGame';
import { mockFetch } from './helpers/mockFetch';

const chess = { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 1, createdAt: null, updatedAt: null };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('readGame', () => {
  it('asks the backend at its address inside the deploy network', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://backend:8080/api/v1');
    const fetchMock = mockFetch({ json: async () => chess });

    await readGame('chess');

    expect(fetchMock.mock.calls[0][0]).toBe('http://backend:8080/api/v1/games/chess');
  });

  it('gives the game the backend has', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://backend:8080/api/v1');
    mockFetch({ json: async () => chess });

    await expect(readGame('chess')).resolves.toEqual({ status: 'found', game: chess });
  });

  it('calls a game the backend does not have missing', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://backend:8080/api/v1');
    mockFetch({ ok: false, status: 404 });

    await expect(readGame('nope')).resolves.toEqual({ status: 'missing' });
  });

  it('fails when the backend does, rather than call the game missing', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://backend:8080/api/v1');
    mockFetch({ ok: false, status: 503 });

    await expect(readGame('chess')).rejects.toThrow();
  });

  it('gives up on a backend that does not answer', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'http://backend:8080/api/v1');
    const fetchMock = mockFetch({ json: async () => chess });

    await readGame('chess');

    expect(fetchMock.mock.calls[0][1]).toEqual({ signal: expect.any(AbortSignal) });
  });

  it('reads nothing where no backend runs', async () => {
    vi.stubEnv('API_INTERNAL_URL', '');
    const fetchMock = mockFetch();

    await expect(readGame('chess')).resolves.toEqual({ status: 'unread' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
