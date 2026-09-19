import { encodeAbiParameters, isHex, keccak256, size, toHex } from 'viem';

const INVITE_STORAGE_PREFIX = 'duelme-invite';

export function generateInviteSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Mirrors the public `DuelMe.hashInviteSecret`. The contract address and chain id are hashed in with the
 * secret, so an invite link cannot be replayed against a duel on another deployment — the same
 * secret produces a different hash on dev, on mainnet, and on any future redeploy.
 */
export function hashInviteSecret(
  inviteSecret: `0x${string}`,
  contractAddress: `0x${string}`,
  chainId: number
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'uint256' }, { type: 'bytes32' }],
      [contractAddress, BigInt(chainId), inviteSecret]
    )
  );
}

export function isInviteSecret(value: string | null | undefined): value is `0x${string}` {
  return typeof value === 'string' && isHex(value, { strict: true }) && size(value) === 32;
}

export function buildInviteLink(duelId: number, inviteSecret: `0x${string}`): string {
  return `${window.location.origin}/duel/${duelId}#${inviteSecret}`;
}

/**
 * Keyed by the contract the duel lives in, not by the chain alone. Duel ids restart at zero on
 * every redeploy, and `hashInviteSecret` binds a secret to one contract — so a secret stored
 * against `chainId:3` under a previous deployment would be loaded for the new duel 3, put in the
 * URL fragment, and handed out by `buildDuelLink` as an invite the contract rejects.
 */
function getInviteStorageKey(
  chainId: number,
  contractAddress: `0x${string}`,
  duelId: number
): string {
  return `${INVITE_STORAGE_PREFIX}:${chainId}:${contractAddress.toLowerCase()}:${duelId}`;
}

export function storeInviteSecret(
  chainId: number,
  contractAddress: `0x${string}`,
  duelId: number,
  inviteSecret: `0x${string}`
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getInviteStorageKey(chainId, contractAddress, duelId), inviteSecret);
}

export function readStoredInviteSecret(
  chainId: number,
  contractAddress: `0x${string}`,
  duelId: number
): `0x${string}` | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(getInviteStorageKey(chainId, contractAddress, duelId));
  return isInviteSecret(stored) ? stored : null;
}

export function readInviteSecretFromHash(): `0x${string}` | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  return isInviteSecret(hash) ? hash : null;
}

/**
 * An open duel stores bytes32(0) as its invite hash — the contract reads that as "anyone may
 * join, no secret involved". It replaces the old convention of publishing a well-known secret:
 * that secret also unlocked `declineDuel`, so any passer-by could kill a duel in the open lobby.
 */
export const OPEN_DUEL_INVITE_HASH: `0x${string}` = `0x${'0'.repeat(64)}`;

/**
 * Placeholder secret for joining an open duel. The contract ignores it when the duel carries no
 * invite hash, so both duel kinds go through the same call.
 */
export const OPEN_DUEL_INVITE_SECRET: `0x${string}` = OPEN_DUEL_INVITE_HASH;

/**
 * True when the duel carries no secret. It says nothing about who may join: a duel can be
 * secret-less and still addressed to one player, which is why the join and decline controls gate
 * on `invitedOpponent` as well.
 */
export function isPublicDuel(inviteHash: string): boolean {
  return inviteHash.toLowerCase() === OPEN_DUEL_INVITE_HASH;
}

/**
 * Does this secret open this duel? The comparison lives here, with the formula, rather than at
 * each call site: the hash is bound to the contract and chain, so every caller needs both, and a
 * forgotten `toLowerCase()` degrades into a "private invite missing" toast with no other symptom.
 */
export function matchesInviteHash(
  inviteSecret: `0x${string}` | null | undefined,
  inviteHash: string,
  contractAddress: `0x${string}`,
  chainId: number
): boolean {
  if (!inviteSecret) {
    return false;
  }
  return hashInviteSecret(inviteSecret, contractAddress, chainId).toLowerCase() === inviteHash.toLowerCase();
}

/**
 * May this caller present themselves on this duel at all?
 *
 * The contract asks this once, in `_requireAdmitted`: a duel with no hash lets anyone in, and
 * otherwise the caller has to hold the secret. Join and decline both go through it there, so they
 * go through one predicate here too — a client that spells the rule out per call site drifts into
 * offering a button the contract will refuse.
 *
 * It answers only the secret half. A duel can be secret-less and still addressed to one player,
 * so callers that care about `invitedOpponent` still have to check it.
 */
export function canPresentInvite(
  inviteSecret: `0x${string}` | null | undefined,
  inviteHash: string,
  contractAddress: `0x${string}`,
  chainId: number
): boolean {
  return isPublicDuel(inviteHash) || matchesInviteHash(inviteSecret, inviteHash, contractAddress, chainId);
}

/** Build a shareable link for any duel type. Public duels get a clean URL. */
export function buildDuelLink(duelId: number, inviteHash: `0x${string}`, inviteSecret?: `0x${string}` | null): string {
  if (isPublicDuel(inviteHash)) {
    return `${window.location.origin}/duel/${duelId}`;
  }
  return inviteSecret ? buildInviteLink(duelId, inviteSecret) : `${window.location.origin}/duel/${duelId}`;
}
