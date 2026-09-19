import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  OPEN_DUEL_INVITE_HASH,
  OPEN_DUEL_INVITE_SECRET,
  isPublicDuel,
  buildDuelLink,
  hashInviteSecret,
  generateInviteSecret,
  isInviteSecret,
} from '../invite';

const CONTRACT = '0x990aD70C168B184a84d6d9491303fa344154e317' as `0x${string}`;
const CHAIN_ID = 421614;

describe('OPEN_DUEL_INVITE_HASH', () => {
  it('is bytes32(0) — what the contract reads as "anyone may join"', () => {
    expect(OPEN_DUEL_INVITE_HASH).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  it('carries no secret to leak', () => {
    expect(OPEN_DUEL_INVITE_SECRET).toBe(OPEN_DUEL_INVITE_HASH);
  });
});

describe('isPublicDuel', () => {
  it('returns true for the open-duel hash', () => {
    expect(isPublicDuel(OPEN_DUEL_INVITE_HASH)).toBe(true);
  });

  it('returns true for the open-duel hash in different case', () => {
    expect(isPublicDuel(OPEN_DUEL_INVITE_HASH.toUpperCase() as `0x${string}`)).toBe(true);
  });

  it('returns false for a real invite hash', () => {
    const randomHash = hashInviteSecret(generateInviteSecret(), CONTRACT, CHAIN_ID);
    expect(isPublicDuel(randomHash)).toBe(false);
  });
});

describe('buildDuelLink', () => {
  // buildDuelLink uses window.location.origin, so we need to mock it
  const origin = 'https://duelme.pro';

  beforeAll(() => {
    // @ts-expect-error -- mocking window for test
    globalThis.window = { location: { origin } };
  });

  afterAll(() => {
    // @ts-expect-error -- cleanup
    delete globalThis.window;
  });

  it('returns clean URL for public duels (no fragment)', () => {
    const url = buildDuelLink(42, OPEN_DUEL_INVITE_HASH);
    expect(url).toBe(`${origin}/duel/42`);
    expect(url).not.toContain('#');
  });

  it('returns invite URL with fragment for private duels with secret', () => {
    const secret = '0xabcdef0000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
    const privateHash = hashInviteSecret(secret, CONTRACT, CHAIN_ID);
    const url = buildDuelLink(7, privateHash, secret);
    expect(url).toBe(`${origin}/duel/7#${secret}`);
  });

  it('returns clean URL for private duels without secret', () => {
    const secret = '0xabcdef0000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
    const privateHash = hashInviteSecret(secret, CONTRACT, CHAIN_ID);
    const url = buildDuelLink(7, privateHash);
    expect(url).toBe(`${origin}/duel/7`);
  });

  it('ignores inviteSecret param for public duels', () => {
    const someSecret = '0xdeadbeef00000000000000000000000000000000000000000000000000000000' as `0x${string}`;
    const url = buildDuelLink(10, OPEN_DUEL_INVITE_HASH, someSecret);
    expect(url).toBe(`${origin}/duel/10`);
    expect(url).not.toContain('#');
  });
});

describe('hashInviteSecret', () => {
  it('produces different hashes for different secrets', () => {
    const s1 = generateInviteSecret();
    const s2 = generateInviteSecret();
    expect(hashInviteSecret(s1, CONTRACT, CHAIN_ID)).not.toBe(hashInviteSecret(s2, CONTRACT, CHAIN_ID));
  });

  it('binds the hash to the contract, so an invite cannot be replayed on another deployment', () => {
    const secret = generateInviteSecret();
    const other = '0xBd2266AB4b62E34FD5282608abeEEd425F6D7F22' as `0x${string}`;
    expect(hashInviteSecret(secret, CONTRACT, CHAIN_ID)).not.toBe(hashInviteSecret(secret, other, CHAIN_ID));
  });

  it('binds the hash to the chain', () => {
    const secret = generateInviteSecret();
    expect(hashInviteSecret(secret, CONTRACT, CHAIN_ID)).not.toBe(hashInviteSecret(secret, CONTRACT, 42161));
  });

  // The Solidity half of this pin is `testInviteHashGoldenVector` in DuelMeInvites.t.sol: the
  // same triple, the same expected hash, produced by the contract itself. Re-deriving the formula
  // here instead would pass even if both sides changed together — and a divergence between them
  // shows up only as "Invalid invite", on a duel nobody can join.
  it('matches the vector the contract produces', () => {
    const GOLDEN_SECRET = `0x${'0'.repeat(63)}1` as `0x${string}`;
    const GOLDEN_HASH = '0xda7c092f120dfd4d9631abd89f76109b95b7d4b5271e33d47ce81102e37abe5f';

    expect(hashInviteSecret(GOLDEN_SECRET, CONTRACT, CHAIN_ID)).toBe(GOLDEN_HASH);
  });
});

describe('isInviteSecret', () => {
  it('accepts valid 32-byte hex', () => {
    expect(isInviteSecret(OPEN_DUEL_INVITE_SECRET)).toBe(true);
  });

  it('rejects null and undefined', () => {
    expect(isInviteSecret(null)).toBe(false);
    expect(isInviteSecret(undefined)).toBe(false);
  });

  it('rejects non-hex strings', () => {
    expect(isInviteSecret('hello world')).toBe(false);
  });

  it('rejects short hex strings', () => {
    expect(isInviteSecret('0xabcd')).toBe(false);
  });
});
