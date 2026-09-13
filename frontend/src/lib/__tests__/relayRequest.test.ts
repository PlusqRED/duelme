import { describe, expect, it } from 'vitest';
import { encodeFunctionData, parseEther } from 'viem';
import { duelMeAbi } from '@/lib/contracts';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import {
  MAX_RELAY_REQUEST_GAS,
  parseRelayPayload,
  relayGasLimit,
  toForwardRequestArgs,
  RELAYABLE_DUEL_FUNCTIONS,
} from '@/lib/relayRequest';

const CHAIN_ID = SUPPORTED_CHAINS.arbitrum.id;
const DUELME = DUELME_ADDRESSES[CHAIN_ID];
const SIGNER = '0x328809Bc894f92807417D2dAD6b7C998c1aFdac6';
const SIGNATURE = `0x${'11'.repeat(65)}` as const;
const TARGET = { chainId: CHAIN_ID, duelMeAddress: DUELME };
const INVITE_HASH = `0x${'22'.repeat(32)}` as const;

const JOIN_DATA = encodeFunctionData({
  abi: duelMeAbi,
  functionName: 'joinDuel',
  args: [0n, INVITE_HASH],
});

function payload(overrides: Record<string, unknown> = {}, requestOverrides: Record<string, unknown> = {}) {
  return {
    chainId: CHAIN_ID,
    request: {
      from: SIGNER,
      to: DUELME,
      value: '0',
      gas: '400000',
      deadline: 1_800_000_000,
      data: JOIN_DATA,
      signature: SIGNATURE,
      ...requestOverrides,
    },
    ...overrides,
  };
}

describe('parseRelayPayload', () => {
  it('accepts a well-formed relayable request', () => {
    const result = parseRelayPayload(payload(), TARGET);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.functionName).toBe('joinDuel');
      expect(result.body.request.gas).toBe('400000');
    }
  });

  it('accepts the permit funding variants', () => {
    for (const [functionName, args] of [
      ['createDuelWithPermit', [10_000_000n, INVITE_HASH, '', 1_800_000_000n, 27, INVITE_HASH, INVITE_HASH]],
      ['joinDuelWithPermit', [0n, INVITE_HASH, 1_800_000_000n, 27, INVITE_HASH, INVITE_HASH]],
    ] as const) {
      const data = encodeFunctionData({ abi: duelMeAbi, functionName, args });
      const result = parseRelayPayload(payload({}, { data }), TARGET);

      expect(result.ok, functionName).toBe(true);
    }
  });

  it('refuses owner-only functions', () => {
    const data = encodeFunctionData({ abi: duelMeAbi, functionName: 'pause' });
    const result = parseRelayPayload(payload({}, { data }), TARGET);

    expect(result).toMatchObject({ ok: false, code: 'NOT_RELAYABLE' });
  });

  it('refuses token rescue even though it is a DuelMe function', () => {
    const data = encodeFunctionData({
      abi: duelMeAbi,
      functionName: 'rescueETH',
      args: [SIGNER],
    });

    expect(parseRelayPayload(payload({}, { data }), TARGET)).toMatchObject({
      ok: false,
      code: 'NOT_RELAYABLE',
    });
  });

  it('refuses a target that is not the DuelMe contract', () => {
    const elsewhere = SUPPORTED_CHAINS.arbitrum.usdt;

    expect(parseRelayPayload(payload({}, { to: elsewhere }), TARGET)).toMatchObject({
      ok: false,
      code: 'NOT_RELAYABLE',
    });
  });

  it('refuses calldata that does not decode against the DuelMe ABI', () => {
    expect(parseRelayPayload(payload({}, { data: '0xdeadbeef' }), TARGET)).toMatchObject({
      ok: false,
      code: 'NOT_RELAYABLE',
    });
  });

  it('refuses a non-zero value', () => {
    expect(parseRelayPayload(payload({}, { value: '1' }), TARGET)).toMatchObject({
      ok: false,
      code: 'INVALID_REQUEST',
    });
  });

  it('refuses gas above the cap and zero gas', () => {
    for (const gas of [(MAX_RELAY_REQUEST_GAS + 1n).toString(), '0']) {
      expect(parseRelayPayload(payload({}, { gas }), TARGET)).toMatchObject({
        ok: false,
        code: 'INVALID_REQUEST',
      });
    }
  });

  it('refuses non-decimal numeric strings', () => {
    for (const gas of ['0x1000', '1e6', '-1', '01', 400000]) {
      expect(parseRelayPayload(payload({}, { gas }), TARGET)).toMatchObject({ ok: false });
    }
  });

  it('refuses a deadline beyond uint48', () => {
    expect(parseRelayPayload(payload({}, { deadline: 281_474_976_710_656 }), TARGET)).toMatchObject({
      ok: false,
      code: 'INVALID_REQUEST',
    });
  });

  it('refuses malformed addresses and hex', () => {
    expect(parseRelayPayload(payload({}, { from: 'not-an-address' }), TARGET)).toMatchObject({ ok: false });
    expect(parseRelayPayload(payload({}, { signature: 'nope' }), TARGET)).toMatchObject({ ok: false });
  });

  it('refuses anything that is not an object', () => {
    for (const bad of [null, 'x', 42, []]) {
      expect(parseRelayPayload(bad, TARGET)).toMatchObject({ ok: false, code: 'INVALID_REQUEST' });
    }
  });

  it('refuses a request signed for another chain', () => {
    expect(parseRelayPayload(payload({ chainId: SUPPORTED_CHAINS.arbitrumSepolia.id }), TARGET)).toMatchObject({
      ok: false,
      code: 'NOT_RELAYABLE',
    });
  });

  it('refuses every chain when no DuelMe address is known', () => {
    expect(parseRelayPayload(payload(), { chainId: CHAIN_ID, duelMeAddress: undefined })).toMatchObject({
      ok: false,
      code: 'NOT_RELAYABLE',
    });
  });

  it('never allows an admin function through the allowlist', () => {
    for (const name of [
      'pause',
      'unpause',
      'setMinWager',
      'setClaimTimeout',
      'rescueToken',
      'rescueETH',
      'requestEmergencyWithdraw',
      'executeEmergencyWithdraw',
      'transferOwnership',
    ]) {
      expect(RELAYABLE_DUEL_FUNCTIONS.has(name), name).toBe(false);
    }
  });
});

describe('relayGasLimit', () => {
  it('always clears the 64/63 floor that _checkForwardedGas needs', () => {
    for (const requestGas of [100_000n, 400_000n, MAX_RELAY_REQUEST_GAS]) {
      const limit = relayGasLimit(requestGas, 0n);

      expect(limit).toBeGreaterThanOrEqual((requestGas * 64n) / 63n);
    }
  });

  it('adds the floor on top of the estimate instead of taking the larger one', () => {
    // A large estimate is how Arbitrum reports the L1 posting component, which is charged
    // out of the same limit — picking max() there would starve the forwarded call.
    const requestGas = 400_000n;
    const estimate = 900_000n;

    expect(relayGasLimit(requestGas, estimate)).toBeGreaterThan(estimate + (requestGas * 64n) / 63n - 1n);
  });

  it('grows with the requested gas', () => {
    expect(relayGasLimit(800_000n, 100_000n)).toBeGreaterThan(relayGasLimit(400_000n, 100_000n));
  });
});

describe('toForwardRequestArgs', () => {
  it('turns the wire shape into the tuple viem passes to the forwarder', () => {
    const result = parseRelayPayload(payload(), TARGET);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const args = toForwardRequestArgs(result.body.request);

    expect(args).toEqual({
      from: SIGNER,
      to: DUELME,
      value: 0n,
      gas: 400_000n,
      deadline: 1_800_000_000,
      data: JOIN_DATA,
      signature: SIGNATURE,
    });
    expect(parseEther('0')).toBe(args.value);
  });
});
