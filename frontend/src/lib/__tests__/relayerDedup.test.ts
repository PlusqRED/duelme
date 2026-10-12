import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Hex } from 'viem';
import {
  MAX_REMEMBERED_RELAYS,
  RELAY_REPEAT_TTL_MS,
  relayOnce,
  relayRequestKey,
  resetRelayDedup,
  trackedRelayRequests,
} from '@/lib/relayerDedup';
import { refusal, type RelayForwardRequest, type RelayOutcome } from '@/lib/relayRequest';

const signedRequest: RelayForwardRequest = {
  from: '0x328809Bc894f92807417D2dAD6b7C998c1aFdac6',
  to: '0x00000000000000000000000000000000000000d1',
  value: '0',
  gas: '400000',
  deadline: 1_800_000_000,
  data: '0xdeadbeef',
  signature: `0x${'ab'.repeat(65)}`,
};

const HASH: Hex = `0x${'cd'.repeat(32)}`;

const sent = (): Promise<RelayOutcome> => Promise.resolve({ ok: true, hash: HASH });

/** Lets relayOnce's settle handlers run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  resetRelayDedup();
});

describe('relayRequestKey', () => {
  it('is blind to address and hex letter case', () => {
    const shouted: RelayForwardRequest = {
      ...signedRequest,
      from: signedRequest.from.toLowerCase() as `0x${string}`,
      data: '0xDEADBEEF',
      signature: `0x${'AB'.repeat(65)}`,
    };

    expect(relayRequestKey(shouted)).toBe(relayRequestKey(signedRequest));
  });

  it('tells apart a request whose signed fields differ, not only its signature', () => {
    const key = relayRequestKey(signedRequest);

    expect(relayRequestKey({ ...signedRequest, gas: '400001' })).not.toBe(key);
    expect(relayRequestKey({ ...signedRequest, deadline: signedRequest.deadline + 1 })).not.toBe(key);
    expect(relayRequestKey({ ...signedRequest, signature: `0x${'ac'.repeat(65)}` })).not.toBe(key);
  });
});

describe('relayOnce', () => {
  it('runs a repeat that arrives mid-relay into the first one instead of relaying twice', async () => {
    const relay = vi.fn(sent);

    const [first, repeat] = await Promise.all([relayOnce('0x01', relay), relayOnce('0x01', relay)]);

    expect(relay).toHaveBeenCalledTimes(1);
    expect(repeat).toEqual(first);
  });

  it('answers a repeat of a relayed request with its hash until the TTL runs out', async () => {
    let now = 0;
    const clock = () => now;
    const relay = vi.fn(sent);

    await relayOnce('0x01', relay, clock);
    await settle();

    now = RELAY_REPEAT_TTL_MS - 1;
    await expect(relayOnce('0x01', relay, clock)).resolves.toEqual({ ok: true, hash: HASH });
    expect(relay).toHaveBeenCalledTimes(1);

    now = RELAY_REPEAT_TTL_MS;
    await relayOnce('0x01', relay, clock);
    expect(relay).toHaveBeenCalledTimes(2);
  });

  it('forgets a refusal, so the same request may try again', async () => {
    const relay = vi.fn(() => Promise.resolve(refusal('RELAYER_UNAVAILABLE', 'busy', 503)));

    await relayOnce('0x01', relay);
    await settle();
    await relayOnce('0x01', relay);

    expect(relay).toHaveBeenCalledTimes(2);
  });

  it('forgets a relay that threw, and hands the error to every copy', async () => {
    const relay = vi.fn(() => Promise.reject(new Error('rpc down')));

    const copies = [relayOnce('0x01', relay), relayOnce('0x01', relay)];
    await expect(Promise.all(copies)).rejects.toThrow('rpc down');
    await settle();

    expect(trackedRelayRequests()).toBe(0);
  });

  it('drops settled entries, oldest first, once full', async () => {
    for (let i = 0; i < MAX_REMEMBERED_RELAYS; i += 1) {
      await relayOnce(`0x${i.toString(16).padStart(4, '0')}`, sent);
    }
    await settle();

    await relayOnce('0xffff', sent);

    expect(trackedRelayRequests()).toBe(MAX_REMEMBERED_RELAYS);
    const relay = vi.fn(sent);
    await relayOnce('0x0000', relay);
    expect(relay).toHaveBeenCalledTimes(1);
  });

  it('never drops a request that is still being relayed, so its copies stay collapsed', async () => {
    const pending = () => new Promise<RelayOutcome>(() => {});
    for (let i = 0; i < MAX_REMEMBERED_RELAYS; i += 1) {
      void relayOnce(`0x${i.toString(16).padStart(4, '0')}`, pending);
    }

    void relayOnce('0xffff', pending);
    const relay = vi.fn(sent);
    void relayOnce('0x0000', relay);

    expect(trackedRelayRequests()).toBe(MAX_REMEMBERED_RELAYS + 1);
    expect(relay).not.toHaveBeenCalled();
  });
});
