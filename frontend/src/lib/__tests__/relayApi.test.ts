import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RelayRequestError, submitRelayRequest } from '@/lib/relayApi';
import type { RelayForwardRequest } from '@/lib/relayRequest';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';

const signedRequest: RelayForwardRequest = {
  from: '0x328809Bc894f92807417D2dAD6b7C998c1aFdac6',
  to: DUELME_ADDRESSES[SUPPORTED_CHAINS.arbitrum.id],
  value: '0',
  gas: '400000',
  deadline: 1_800_000_000,
  data: '0xdeadbeef',
  signature: `0x${'11'.repeat(65)}`,
};

const HASH = `0x${'ab'.repeat(32)}`;

function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('submitRelayRequest', () => {
  it('returns the relayed transaction hash', async () => {
    vi.mocked(fetch).mockReturnValue(respond(200, { hash: HASH }));

    await expect(submitRelayRequest(42161, signedRequest)).resolves.toBe(HASH);
  });

  it('posts the chain id alongside the request', async () => {
    vi.mocked(fetch).mockReturnValue(respond(200, { hash: HASH }));

    await submitRelayRequest(42161, signedRequest);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ chainId: 42161, request: signedRequest });
  });

  it('surfaces the server error code so callers can tell failures apart', async () => {
    vi.mocked(fetch).mockReturnValue(
      respond(429, { code: 'BUDGET_EXCEEDED', error: 'Daily gas allowance used up.' })
    );

    await expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({
      name: 'RelayRequestError',
      code: 'BUDGET_EXCEEDED',
    });
  });

  it('surfaces the per-client rate limit as its own code', async () => {
    vi.mocked(fetch).mockReturnValue(respond(429, { code: 'RATE_LIMITED', error: 'Too many relay requests.' }));

    await expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('reads a code it does not know as RELAYER_UNAVAILABLE rather than passing it on', async () => {
    vi.mocked(fetch).mockReturnValue(respond(400, { code: 'SOMETHING_NEW', error: 'x' }));

    await expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({
      code: 'RELAYER_UNAVAILABLE',
      message: 'x',
    });
  });

  it('falls back to RELAYER_UNAVAILABLE when the body carries no code', async () => {
    vi.mocked(fetch).mockReturnValue(respond(502, null));

    await expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({
      code: 'RELAYER_UNAVAILABLE',
    });
  });

  it('rejects a success response with no usable hash', async () => {
    vi.mocked(fetch).mockReturnValue(respond(200, { hash: 'not-a-hash' }));

    await expect(submitRelayRequest(42161, signedRequest)).rejects.toBeInstanceOf(RelayRequestError);
  });

  it('gives up rather than hanging when the relayer never answers', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

    const submitted = expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({
      name: 'RelayRequestError',
      code: 'RELAYER_UNAVAILABLE',
      message: 'The relayer did not answer in time.',
    });
    await vi.runAllTimersAsync();

    await submitted;
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('posts the same signed request again when the answer is lost, and takes the relayed hash', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockReturnValue(respond(200, { hash: HASH }));

    const submitted = submitRelayRequest(42161, signedRequest);
    await vi.runAllTimersAsync();

    await expect(submitted).resolves.toBe(HASH);
    const [first, second] = vi.mocked(fetch).mock.calls.map(([, init]) => init?.body);
    expect(second).toBe(first);
  });

  it('does not post a refused request again', async () => {
    vi.mocked(fetch).mockReturnValue(respond(503, { code: 'RELAYER_UNAVAILABLE', error: 'Relayer is busy.' }));

    const submitted = expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({
      message: 'Relayer is busy.',
    });
    await vi.runAllTimersAsync();

    await submitted;
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('bounds the request with an abort signal', async () => {
    vi.mocked(fetch).mockReturnValue(respond(200, { hash: HASH }));

    await submitRelayRequest(42161, signedRequest);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
