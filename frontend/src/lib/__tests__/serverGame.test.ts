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
  vi.restoreAllMocks();
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

  it('leaves a game the backend failed on to the browser, rather than call it missing, and logs it', async () => {
    mockFetch({ ok: false, status: 503 });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(readGame('chess')).resolves.toEqual({ status: 'unread' });
    expect(log).toHaveBeenCalledOnce();
  });

  it('takes nothing for a game that is not one', async () => {
    mockFetch({ json: async () => ({ error: 'Bad gateway' }) });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(readGame('chess')).resolves.toEqual({ status: 'unread' });
  });

  it.each(['50%', 'cs2;drop', 'CS2'])('calls %s missing without asking: no catalog slug looks like it', async (slug) => {
    const fetchMock = mockFetch();

    await expect(readGame(slug)).resolves.toEqual({ status: 'missing' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads nothing where no backend runs', async () => {
    vi.stubEnv('API_INTERNAL_URL', '');
    const fetchMock = mockFetch();

    await expect(readGame('chess')).resolves.toEqual({ status: 'unread' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
