import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachGameToDuel,
  DUEL_META_BATCH_SIZE,
  duelMetaBatches,
  fetchDuelMeta,
  fetchDuelMetaBatch,
  fetchDuelsByGame,
} from '../gameApi';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import { mockFetch } from './helpers/mockFetch';

const CHAIN_ID = SUPPORTED_CHAINS.arbitrum.id;
const CONTRACT = DUELME_ADDRESSES[CHAIN_ID];

/** The query string of the single fetch the call under test made. */
function requestedQuery(fetchMock: ReturnType<typeof mockFetch>): URLSearchParams {
  const [url] = fetchMock.mock.calls[0] as [string];
  return new URLSearchParams(url.slice(url.indexOf('?') + 1));
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * A duel id does not identify a duel on its own — it restarts at zero on every redeploy — so
 * each of these calls has to name the deployment as well as the chain. Dropping the address is
 * not a type error on the wire, it just silently reads another deployment's metadata.
 */
describe('duel metadata calls name the deployment', () => {
  it('sends chainId and contractAddress when attaching a game', async () => {
    const fetchMock = mockFetch({ json: async () => ({ duelId: 7 }) });

    await attachGameToDuel('token-abc', 7, CHAIN_ID, CONTRACT, 'CS2', 'FPS');

    const query = requestedQuery(fetchMock);
    expect(query.get('chainId')).toBe(String(CHAIN_ID));
    expect(query.get('contractAddress')).toBe(CONTRACT.toLowerCase());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/duels/7/meta');
    expect(init.headers.Authorization).toBe('Bearer token-abc');
    expect(JSON.parse(init.body)).toEqual({ gameName: 'CS2', category: 'FPS' });
  });

  it('sends chainId and contractAddress when reading one duel', async () => {
    const fetchMock = mockFetch({ json: async () => ({ duelId: 7 }) });

    await fetchDuelMeta(7, CHAIN_ID, CONTRACT);

    const query = requestedQuery(fetchMock);
    expect(query.get('chainId')).toBe(String(CHAIN_ID));
    expect(query.get('contractAddress')).toBe(CONTRACT.toLowerCase());
  });

  it('sends chainId and contractAddress alongside the ids in a batch', async () => {
    const fetchMock = mockFetch({ json: async () => [] });

    await fetchDuelMetaBatch(CHAIN_ID, CONTRACT, [3, 1, 2]);

    const query = requestedQuery(fetchMock);
    expect(query.get('chainId')).toBe(String(CHAIN_ID));
    expect(query.get('contractAddress')).toBe(CONTRACT.toLowerCase());
    expect(query.get('duelIds')).toBe('3,1,2');
  });

  it('sends the game slug with chainId and contractAddress when listing a game', async () => {
    const fetchMock = mockFetch({ json: async () => [] });

    await fetchDuelsByGame('counter-strike 2', CHAIN_ID, CONTRACT);

    const query = requestedQuery(fetchMock);
    expect(query.get('gameSlug')).toBe('counter-strike 2');
    expect(query.get('chainId')).toBe(String(CHAIN_ID));
    expect(query.get('contractAddress')).toBe(CONTRACT.toLowerCase());
  });

  it('lowercases a checksummed address so it matches the stored one', async () => {
    const fetchMock = mockFetch({ json: async () => ({ duelId: 7 }) });

    await fetchDuelMeta(7, CHAIN_ID, CONTRACT.toUpperCase().replace('0X', '0x') as `0x${string}`);

    expect(requestedQuery(fetchMock).get('contractAddress')).toBe(CONTRACT.toLowerCase());
  });
});

describe('duel metadata error handling', () => {
  it('returns null when a single duel has no metadata', async () => {
    mockFetch({ ok: false, status: 404 });

    await expect(fetchDuelMeta(7, CHAIN_ID, CONTRACT)).resolves.toBeNull();
  });

  it('throws when a single read fails for any other reason', async () => {
    mockFetch({ ok: false, status: 500 });

    await expect(fetchDuelMeta(7, CHAIN_ID, CONTRACT)).rejects.toThrow('Failed to fetch duel metadata');
  });

  it('throws when attaching a game fails', async () => {
    mockFetch({ ok: false, status: 403 });

    await expect(attachGameToDuel('token', 7, CHAIN_ID, CONTRACT, 'CS2'))
      .rejects.toThrow('Failed to attach game');
  });

  it('skips the request entirely for an empty batch', async () => {
    const fetchMock = mockFetch({ json: async () => [] });

    await expect(fetchDuelMetaBatch(CHAIN_ID, CONTRACT, [])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('duelMetaBatches', () => {
  it('asks for nothing when there are no duels', () => {
    expect(duelMetaBatches([])).toEqual([]);
  });

  it('asks for each duel once, in order', () => {
    expect(duelMetaBatches([7, 3, 7, 1])).toEqual([[1, 3, 7]]);
  });

  it('keeps every batch within what the backend takes', () => {
    const ids = Array.from({ length: DUEL_META_BATCH_SIZE * 2 + 1 }, (_, id) => id);

    const batches = duelMetaBatches(ids);

    expect(batches.map((batch) => batch.length)).toEqual([DUEL_META_BATCH_SIZE, DUEL_META_BATCH_SIZE, 1]);
    expect(batches.flat()).toEqual(ids);
  });

  it('changes only the last batch when one more duel comes', () => {
    const ids = Array.from({ length: DUEL_META_BATCH_SIZE + 5 }, (_, id) => id);

    const before = duelMetaBatches(ids);
    const after = duelMetaBatches([...ids, DUEL_META_BATCH_SIZE + 5]);

    expect(after[0]).toEqual(before[0]);
    expect(after[1]).toEqual([...before[1], DUEL_META_BATCH_SIZE + 5]);
  });
});
