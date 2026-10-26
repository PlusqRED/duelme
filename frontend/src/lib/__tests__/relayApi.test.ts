import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RelayAnswerLostError, submitRelayRequest, submitRelayTransfer } from '@/lib/relayApi';
import type { RelayTransfer } from '@/lib/relayedTransfer';
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

function bodyLost() {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new TypeError('network error');
    },
  } as unknown as Response;
}

/** Fails like a real fetch with no connection, which rejects with the deadline once it has passed. */
async function noConnection(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  init?.signal?.throwIfAborted();
  throw new TypeError('Failed to fetch');
}

/** Waits for an answer that never comes, until the deadline aborts the post. */
function noAnswer(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });
}

// AbortSignal.timeout runs on a timer fake timers do not reach, so the deadline is fired by hand.
let deadline: AbortController;

function runOutTheDeadline() {
  deadline.abort(new DOMException('signal timed out', 'TimeoutError'));
}

beforeEach(() => {
  vi.useFakeTimers();
  deadline = new AbortController();
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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

  it('takes a code it does not know for an answer lost rather than passing it on', async () => {
    vi.mocked(fetch).mockReturnValue(respond(400, { code: 'SOMETHING_NEW', error: 'x' }));

    await expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({
      name: 'RelayAnswerLostError',
      message: 'x',
    });
  });

  it('takes a refusal without the relay\'s body, a proxy\'s error page, for an answer lost', async () => {
    vi.mocked(fetch).mockReturnValue(respond(502, null));

    await expect(submitRelayRequest(42161, signedRequest)).rejects.toBeInstanceOf(RelayAnswerLostError);
  });

  it('takes a success response with no usable hash for an answer lost, since the relayer may have sent it', async () => {
    vi.mocked(fetch).mockReturnValue(respond(200, { hash: 'not-a-hash' }));

    await expect(submitRelayRequest(42161, signedRequest)).rejects.toBeInstanceOf(RelayAnswerLostError);
  });

  it('gives up rather than hanging when the relayer never answers', async () => {
    vi.mocked(fetch).mockImplementation(noAnswer);

    const submitted = expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({
      name: 'RelayAnswerLostError',
      message: 'The relayer did not answer in time.',
    });
    runOutTheDeadline();

    await submitted;
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('stops at the deadline even while it waits to post again', async () => {
    vi.mocked(fetch).mockImplementation(noConnection);

    const submitted = expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({
      message: 'The relayer did not answer in time.',
    });
    await vi.advanceTimersByTimeAsync(1_000);
    runOutTheDeadline();
    await vi.runAllTimersAsync();

    await submitted;
    expect(fetch).toHaveBeenCalledTimes(2);
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

  it('posts again when a success arrives without its body, since the hash is what got lost', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(bodyLost())
      .mockReturnValue(respond(200, { hash: HASH }));

    const submitted = submitRelayRequest(42161, signedRequest);
    await vi.runAllTimersAsync();

    await expect(submitted).resolves.toBe(HASH);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('stops after four lost answers', async () => {
    vi.mocked(fetch).mockImplementation(noConnection);

    const submitted = expect(submitRelayRequest(42161, signedRequest)).rejects.toMatchObject({
      name: 'RelayAnswerLostError',
      message: 'No answer came back from the relayer.',
    });
    await vi.runAllTimersAsync();

    await submitted;
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('spaces its posts out so the last outlasts a phone switching networks', async () => {
    const postedAt: number[] = [];
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      postedAt.push(Date.now());
      return postedAt.length < 4 ? noConnection(input, init) : respond(200, { hash: HASH });
    });

    const submitted = submitRelayRequest(42161, signedRequest);
    await vi.runAllTimersAsync();

    await expect(submitted).resolves.toBe(HASH);
    expect(postedAt[3] - postedAt[0]).toBeGreaterThanOrEqual(40_000);
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

  it('bounds every post of one request by a single deadline, so reposts never extend the wait', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockReturnValue(respond(200, { hash: HASH }));

    const submitted = submitRelayRequest(42161, signedRequest);
    await vi.runAllTimersAsync();
    await submitted;

    const [first, second] = vi.mocked(fetch).mock.calls.map(([, init]) => init?.signal);
    expect(first).toBeInstanceOf(AbortSignal);
    expect(second).toBe(first);
  });
});

describe('submitRelayTransfer', () => {
  const signedTransfer: RelayTransfer = {
    from: '0x328809Bc894f92807417D2dAD6b7C998c1aFdac6',
    to: '0x32a3FE56F4FeE248E4f19ca3D4374a018ac9AA23',
    value: '5000000',
    validBefore: 1_800_000_000,
    nonce: `0x${'33'.repeat(32)}`,
    signature: `0x${'11'.repeat(65)}`,
  };

  it('posts the chain id and the signed authorization to the transfer route', async () => {
    vi.mocked(fetch).mockReturnValue(respond(200, { hash: HASH }));

    await expect(submitRelayTransfer(42161, signedTransfer)).resolves.toBe(HASH);

    const [endpoint, init] = vi.mocked(fetch).mock.calls[0];
    expect(endpoint).toBe('/api/relay/transfer');
    expect(JSON.parse(String(init?.body))).toEqual({ chainId: 42161, transfer: signedTransfer });
  });

  it('surfaces the transfer route\'s own codes', async () => {
    vi.mocked(fetch).mockReturnValue(respond(409, { code: 'TRANSFER_USED', error: 'Already sent today.' }));

    await expect(submitRelayTransfer(42161, signedTransfer)).rejects.toMatchObject({
      name: 'RelayRequestError',
      code: 'TRANSFER_USED',
    });
  });

  it('posts the same authorization again while its answer keeps getting lost', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockReturnValue(respond(200, { hash: HASH }));

    const submitted = submitRelayTransfer(42161, signedTransfer);
    await vi.runAllTimersAsync();

    await expect(submitted).resolves.toBe(HASH);
    const bodies = vi.mocked(fetch).mock.calls.map(([, init]) => init?.body);
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toBe(bodies[0]);
  });
});
