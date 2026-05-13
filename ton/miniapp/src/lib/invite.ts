// Secure invite-link generation for DuelMe.
//
// The on-chain contract stores `sha256(secret)` as the duel's `inviteHash`.
// Joining / declining a duel requires presenting the original secret, which
// is never written on-chain. The secret travels off-chain via:
//
//   1. The `t.me/<bot>/<short>?startapp=<encoded>` deep link used by the
//      share-duel flow.
//   2. The URL fragment (`#invite=<encoded>`) when shared via a regular
//      web link (e.g. copied to a non-Telegram client).
//
// Both transports keep the secret out of HTTP referrer headers / server logs.

const SECRET_BYTES = 32;

export interface InvitePayload {
  duelId: bigint;
  secret: bigint;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error("invite: odd-length hex");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return out;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let n = 0n;
  for (const b of bytes) {
    n = (n << 8n) | BigInt(b);
  }
  return n;
}

function bigIntToBytes(n: bigint, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let v = n;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/**
 * Generate a cryptographically-secure 256-bit secret + matching SHA-256 hash.
 * Returns both so the caller can store the hash on-chain and share the
 * secret off-chain.
 */
export async function generateInvite(): Promise<{ secret: bigint; inviteHash: bigint }> {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("invite: secure RNG unavailable");
  }
  const bytes = new Uint8Array(SECRET_BYTES);
  crypto.getRandomValues(bytes);
  const secret = bytesToBigInt(bytes);
  const inviteHash = await sha256BigInt(secret);
  return { secret, inviteHash };
}

/** SHA-256 of the 256-bit `secret`, returned as a non-negative bigint. */
export async function sha256BigInt(secret: bigint): Promise<bigint> {
  const bytes = bigIntToBytes(secret, SECRET_BYTES);
  // SubtleCrypto.digest wants an ArrayBuffer; pass the underlying buffer
  // (Uint8Array<ArrayBufferLike> can't be assigned to BufferSource in TS5).
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToBigInt(new Uint8Array(digest));
}

// ───── Telegram-style invite payload encoding ──────────────────────────────
//
// Telegram start_param is limited to ~64 chars of [A-Za-z0-9_-]. We use a
// URL-safe base64-without-padding of a fixed-length packed payload:
//   [duelId: u64 BE][secret: u256 BE] = 40 bytes → 54 chars base64-url.

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) {
    bin += String.fromCharCode(b);
  }
  const base64 = btoa(bin);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const base64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export function encodeInviteToken(payload: InvitePayload): string {
  const bytes = new Uint8Array(8 + SECRET_BYTES);
  bytes.set(bigIntToBytes(payload.duelId, 8), 0);
  bytes.set(bigIntToBytes(payload.secret, SECRET_BYTES), 8);
  return base64UrlEncode(bytes);
}

export function decodeInviteToken(token: string): InvitePayload {
  const bytes = base64UrlDecode(token);
  if (bytes.length !== 8 + SECRET_BYTES) {
    throw new Error("invite: malformed token");
  }
  const duelId = bytesToBigInt(bytes.slice(0, 8));
  const secret = bytesToBigInt(bytes.slice(8));
  return { duelId, secret };
}

// Helpers exposed for tests / debugging.
export const _internals = { bytesToHex, hexToBytes, bigIntToBytes, bytesToBigInt };
