import { isAddress, isHash, isHex, keccak256, parseSignature, toHex, zeroAddress, type Hex } from 'viem';
import { parseUintString } from '@/lib/parsing';
import { parseRelayEnvelope, type RelayPayloadFailure } from '@/lib/relayRequest';

/**
 * The one USDT transfer a day DuelMe pays the fee for, from the wallet menu: an EIP-3009
 * `transferWithAuthorization` the player signs and the relayer sends to the token
 * (`/api/relay/transfer`). The signature names the recipient and the amount, so the relayer can
 * neither change them nor send anything else.
 *
 * "One a day" is the token's to keep, not the relayer's: every authorization of a UTC day signs
 * that day's nonce, and the token spends a nonce once per wallet. A second transfer the same day is
 * refused on-chain, through restarts and on any number of relayers, with nothing stored here.
 */

/** A day for the relayed transfer: a UTC day, the same as the relayer's gas budgets. */
export const RELAYED_TRANSFER_DAY_MS = 86_400_000;

/** How long the relayer has to send a signed authorization before the token refuses it. */
export const RELAYED_TRANSFER_VALIDITY_SECONDS = 10 * 60;

/** Leeway for a device clock ahead of the server's, on the authorization's expiry. */
const CLOCK_LEEWAY_SECONDS = 60;

/** EIP-3009's struct. It is signed in the token's permit domain: USD₮0 has one for both. */
export const TRANSFER_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

/** The UTC day a moment falls on, counted from 1970. */
export function relayedTransferDay(nowMs: number): number {
  return Math.floor(nowMs / RELAYED_TRANSFER_DAY_MS);
}

/** The nonce every relayed transfer of a day signs, so the token takes only one of them. */
export function relayedTransferNonce(day: number): Hex {
  return keccak256(toHex(`duelme:relayed-transfer:${day}`));
}

/** When the relayed transfer after `day`'s opens: the UTC midnight that ends it, in milliseconds. */
export function nextRelayedTransferAt(day: number): number {
  return (day + 1) * RELAYED_TRANSFER_DAY_MS;
}

export type TransferAuthorization = ReturnType<typeof transferAuthorization>;

/** The authorization a player signs to send `value` to `to` now; `validAfter` is always 0. */
export function transferAuthorization(from: `0x${string}`, to: `0x${string}`, value: bigint, nowMs: number) {
  return {
    from,
    to,
    value,
    validAfter: 0n,
    validBefore: BigInt(Math.floor(nowMs / 1000) + RELAYED_TRANSFER_VALIDITY_SECONDS),
    nonce: relayedTransferNonce(relayedTransferDay(nowMs)),
  };
}

/**
 * The wire shape of a signed authorization. `value` travels as a decimal string, since JSON has no
 * bigint; `validBefore`, in seconds, fits a JS number exactly.
 */
export interface RelayTransfer {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validBefore: number;
  nonce: Hex;
  signature: Hex;
}

/** A signed authorization as it travels to the relayer. */
export function toRelayTransfer(authorization: TransferAuthorization, signature: Hex): RelayTransfer {
  const { from, to, value, validBefore, nonce } = authorization;
  return { from, to, value: value.toString(), validBefore: Number(validBefore), nonce, signature };
}

/** The arguments of `transferWithAuthorization` a signed authorization is sent as. */
export function transferAuthorizationArgs(transfer: RelayTransfer) {
  const { r, s, v, yParity } = parseSignature(transfer.signature);
  return [
    transfer.from,
    transfer.to,
    BigInt(transfer.value),
    0n,
    BigInt(transfer.validBefore),
    transfer.nonce,
    Number(v ?? BigInt(yParity + 27)),
    r,
    s,
  ] as const;
}

export type RelayTransferPayloadResult = { ok: true; transfer: RelayTransfer } | RelayPayloadFailure;

export interface RelayTransferTarget {
  chainId: number;
  /** The server's clock, in milliseconds: it decides which day it is. */
  nowMs: number;
}

/**
 * Validates an untrusted request body down to an authorization the token could take today. Local
 * and cheap, like `parseRelayPayload`: nothing here costs the relayer a round trip.
 */
export function parseRelayTransferPayload(payload: unknown, target: RelayTransferTarget): RelayTransferPayloadResult {
  const envelope = parseRelayEnvelope(payload, target.chainId, 'transfer');
  if (!envelope.ok) {
    return envelope;
  }

  const { from, to, value, validBefore, nonce, signature } = envelope.signed;
  if (typeof from !== 'string' || !isAddress(from)) {
    return invalid('transfer.from must be an address.');
  }
  if (typeof to !== 'string' || !isAddress(to) || to.toLowerCase() === zeroAddress) {
    return invalid('transfer.to must be an address other than zero.');
  }
  if (to.toLowerCase() === from.toLowerCase()) {
    return invalid('transfer.to must be another wallet than transfer.from.');
  }

  const parsedValue = parseUintString(value);
  if (parsedValue === null || parsedValue === 0n || parsedValue >= 2n ** 256n) {
    return invalid('transfer.value must be a positive uint256.');
  }

  const nowSeconds = Math.floor(target.nowMs / 1000);
  const latestExpiry = nowSeconds + RELAYED_TRANSFER_VALIDITY_SECONDS + CLOCK_LEEWAY_SECONDS;
  if (typeof validBefore !== 'number' || !Number.isInteger(validBefore) || validBefore <= nowSeconds || validBefore > latestExpiry) {
    return invalid(`transfer.validBefore must fall within the next ${RELAYED_TRANSFER_VALIDITY_SECONDS} seconds.`);
  }

  if (typeof nonce !== 'string' || !isHash(nonce)) {
    return invalid('transfer.nonce must be 32 bytes of hex.');
  }
  if (nonce.toLowerCase() !== relayedTransferNonce(relayedTransferDay(target.nowMs))) {
    return { ok: false, code: 'TRANSFER_WRONG_DAY', error: 'The authorization is not for today (UTC).' };
  }

  if (typeof signature !== 'string' || !isHex(signature) || !isSignature(signature)) {
    return invalid('transfer.signature must be a 65-byte signature.');
  }

  return {
    ok: true,
    transfer: { from, to, value: parsedValue.toString(), validBefore, nonce, signature },
  };
}

function isSignature(signature: Hex): boolean {
  try {
    parseSignature(signature);
    return signature.length === 132;
  } catch {
    return false;
  }
}

function invalid(error: string): RelayPayloadFailure {
  return { ok: false, code: 'INVALID_REQUEST', error };
}
