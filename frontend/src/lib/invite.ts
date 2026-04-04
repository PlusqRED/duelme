import { isHex, keccak256, size, toHex } from 'viem';

const INVITE_STORAGE_PREFIX = 'duelme-invite';

export function generateInviteSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function hashInviteSecret(inviteSecret: `0x${string}`): `0x${string}` {
  return keccak256(inviteSecret);
}

export function isInviteSecret(value: string | null | undefined): value is `0x${string}` {
  return typeof value === 'string' && isHex(value, { strict: true }) && size(value) === 32;
}

export function buildInviteLink(duelId: number, inviteSecret: `0x${string}`): string {
  return `${window.location.origin}/duel/${duelId}#${inviteSecret}`;
}

function getInviteStorageKey(chainId: number, duelId: number): string {
  return `${INVITE_STORAGE_PREFIX}:${chainId}:${duelId}`;
}

export function storeInviteSecret(chainId: number, duelId: number, inviteSecret: `0x${string}`): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getInviteStorageKey(chainId, duelId), inviteSecret);
}

export function readStoredInviteSecret(chainId: number, duelId: number): `0x${string}` | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(getInviteStorageKey(chainId, duelId));
  return isInviteSecret(stored) ? stored : null;
}

export function readInviteSecretFromHash(): `0x${string}` | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  return isInviteSecret(hash) ? hash : null;
}

/** Well-known invite secret for public duels — anyone can compute it. */
export const PUBLIC_INVITE_SECRET: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000001';

/** keccak256 hash of PUBLIC_INVITE_SECRET — stored on-chain for public duels. */
export const PUBLIC_INVITE_HASH: `0x${string}` = keccak256(PUBLIC_INVITE_SECRET);

/** Returns true if the duel's inviteHash matches the well-known public hash. */
export function isPublicDuel(inviteHash: `0x${string}`): boolean {
  return inviteHash.toLowerCase() === PUBLIC_INVITE_HASH.toLowerCase();
}

/** Build a shareable link for any duel type. Public duels get a clean URL. */
export function buildDuelLink(duelId: number, inviteHash: `0x${string}`, inviteSecret?: `0x${string}` | null): string {
  if (isPublicDuel(inviteHash)) {
    return `${window.location.origin}/duel/${duelId}`;
  }
  return inviteSecret ? buildInviteLink(duelId, inviteSecret) : `${window.location.origin}/duel/${duelId}`;
}
