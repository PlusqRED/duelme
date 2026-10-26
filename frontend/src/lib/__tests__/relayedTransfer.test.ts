import { describe, expect, it } from 'vitest';
import {
  encodeAbiParameters,
  hashStruct,
  keccak256,
  parseAbiParameters,
  parseSignature,
  recoverTypedDataAddress,
  toHex,
} from 'viem';
import {
  nextRelayedTransferAt,
  parseRelayTransferPayload,
  relayedTransferDay,
  relayedTransferNonce,
  RELAYED_TRANSFER_VALIDITY_SECONDS,
  TRANSFER_AUTHORIZATION_TYPES,
  transferAuthorization,
  transferAuthorizationArgs,
  type RelayTransfer,
} from '@/lib/relayedTransfer';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { signTransfer, TRANSFER_TO, transferSigner, usdtDomain } from '@/lib/__tests__/helpers/relayTransfer';

const CHAIN = SUPPORTED_CHAINS.arbitrumSepolia.id;
const NOW = Date.UTC(2026, 9, 26, 21, 30);
const account = transferSigner;
const TO = TRANSFER_TO;
const DOMAIN = usdtDomain(CHAIN, SUPPORTED_CHAINS.arbitrumSepolia.usdt);

async function signedTransfer(overrides: Partial<RelayTransfer> = {}): Promise<RelayTransfer> {
  return { ...(await signTransfer({ chainId: CHAIN, token: SUPPORTED_CHAINS.arbitrumSepolia.usdt, nowMs: NOW })), ...overrides };
}

function parse(transfer: unknown, nowMs = NOW) {
  return parseRelayTransferPayload({ chainId: CHAIN, transfer }, { chainId: CHAIN, nowMs });
}

describe('the relayed transfer\'s day', () => {
  it('turns over at UTC midnight', () => {
    const lastMoment = Date.UTC(2026, 9, 26, 23, 59, 59, 999);

    expect(relayedTransferDay(lastMoment)).toBe(relayedTransferDay(Date.UTC(2026, 9, 26)));
    expect(relayedTransferDay(lastMoment + 1)).toBe(relayedTransferDay(lastMoment) + 1);
    expect(nextRelayedTransferAt(relayedTransferDay(NOW))).toBe(Date.UTC(2026, 9, 27));
  });

  it('gives every day a nonce of its own, the same for every wallet that day', () => {
    const today = relayedTransferDay(NOW);

    expect(relayedTransferNonce(today)).toMatch(/^0x[0-9a-f]{64}$/);
    expect(relayedTransferNonce(today)).toBe(relayedTransferNonce(today));
    expect(relayedTransferNonce(today + 1)).not.toBe(relayedTransferNonce(today));
  });

  it('pins the nonce to the vector the contract suites sign under', () => {
    // MockUSDTAuthorization.t.sol and UsdtPermitFork.t.sol use keccak256("duelme:relayed-transfer:20000").
    // `cast keccak "duelme:relayed-transfer:20000"`.
    expect(relayedTransferNonce(20000)).toBe('0xa724e775f7135f5d5980570828f074fe4d93b75c1b9ad6177a84ad746b2bf025');
  });
});

describe('transferAuthorization', () => {
  it('asks for the day\'s nonce, valid from the start and for ten minutes', () => {
    expect(transferAuthorization(account.address, TO, 1n, NOW)).toEqual({
      from: account.address,
      to: TO,
      value: 1n,
      validAfter: 0n,
      validBefore: BigInt(NOW / 1000 + RELAYED_TRANSFER_VALIDITY_SECONDS),
      nonce: relayedTransferNonce(relayedTransferDay(NOW)),
    });
  });

  it('hashes as the struct EIP-3009 and the token name in their typehash', () => {
    const message = transferAuthorization(account.address, TO, 1n, NOW);
    const typehash = keccak256(
      toHex('TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)')
    );
    const structHash = keccak256(
      encodeAbiParameters(
        parseAbiParameters('bytes32, address, address, uint256, uint256, uint256, bytes32'),
        [typehash, message.from, message.to, message.value, message.validAfter, message.validBefore, message.nonce]
      )
    );

    expect(hashStruct({ data: message, types: TRANSFER_AUTHORIZATION_TYPES, primaryType: 'TransferWithAuthorization' })).toBe(structHash);
  });

  it('is sent as the arguments the token checks the same signature against', async () => {
    const transfer = await signedTransfer();
    const [from, to, value, validAfter, validBefore, nonce, v, r, s] = transferAuthorizationArgs(transfer);
    const message = { from, to, value, validAfter, validBefore, nonce };

    const recovered = await recoverTypedDataAddress({
      domain: DOMAIN,
      types: TRANSFER_AUTHORIZATION_TYPES,
      primaryType: 'TransferWithAuthorization',
      message,
      signature: { r, s, v: BigInt(v) },
    });

    expect(recovered).toBe(account.address);
    expect([27, 28]).toContain(v);
    expect(parseSignature(transfer.signature).r).toBe(r);
  });
});

describe('parseRelayTransferPayload', () => {
  it('takes today\'s signed authorization', async () => {
    const transfer = await signedTransfer();

    expect(parse(transfer)).toEqual({ ok: true, transfer });
  });

  it('refuses another chain as not this relayer\'s', async () => {
    const result = parseRelayTransferPayload({ chainId: 1, transfer: await signedTransfer() }, { chainId: CHAIN, nowMs: NOW });

    expect(result).toMatchObject({ ok: false, code: 'NOT_RELAYABLE' });
  });

  it('refuses an authorization signed for another day', async () => {
    const transfer = await signedTransfer();

    expect(parse({ ...transfer, nonce: relayedTransferNonce(relayedTransferDay(NOW) - 1) })).toMatchObject({
      ok: false,
      code: 'TRANSFER_WRONG_DAY',
    });
  });

  it.each([
    ['a body that is no object', null],
    ['no sender', { from: 'me' }],
    ['the zero address as recipient', { to: '0x0000000000000000000000000000000000000000' }],
    ['a value of zero', { value: '0' }],
    ['a value past uint256', { value: (2n ** 256n).toString() }],
    ['a value written as hex', { value: '0x10' }],
    ['an expiry past the validity window', { validBefore: Math.floor(NOW / 1000) + RELAYED_TRANSFER_VALIDITY_SECONDS + 120 }],
    ['a short nonce', { nonce: '0x1234' }],
    ['a signature that is no signature', { signature: '0x1234' }],
  ])('refuses %s', async (_case, overrides) => {
    const transfer = overrides === null ? null : { ...(await signedTransfer()), ...overrides };

    expect(parse(transfer)).toMatchObject({ ok: false, code: 'INVALID_REQUEST' });
  });

  it('refuses as expired an authorization with less than two minutes left, which would revert once mined', async () => {
    const nowSeconds = Math.floor(NOW / 1000);
    const transfer = await signedTransfer();

    expect(parse({ ...transfer, validBefore: nowSeconds })).toMatchObject({ ok: false, code: 'TRANSFER_EXPIRED' });
    expect(parse({ ...transfer, validBefore: nowSeconds + 119 })).toMatchObject({ ok: false, code: 'TRANSFER_EXPIRED' });
    expect(parse({ ...transfer, validBefore: nowSeconds + 120 })).toMatchObject({ ok: true });
    expect(parse(transfer, nextRelayedTransferAt(relayedTransferDay(NOW)) + 1_000)).toMatchObject({ ok: false, code: 'TRANSFER_EXPIRED' });
  });

  it('refuses a transfer to the wallet it leaves', async () => {
    const transfer = await signedTransfer({ to: account.address.toLowerCase() as `0x${string}` });

    expect(parse(transfer)).toMatchObject({ ok: false, code: 'INVALID_REQUEST' });
  });
});
