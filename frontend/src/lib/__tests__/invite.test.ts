import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { keccak256 } from 'viem';
import {
  PUBLIC_INVITE_SECRET,
  PUBLIC_INVITE_HASH,
  isPublicDuel,
  buildDuelLink,
  hashInviteSecret,
  generateInviteSecret,
  isInviteSecret,
} from '../invite';

describe('PUBLIC_INVITE_SECRET / PUBLIC_INVITE_HASH', () => {
  it('PUBLIC_INVITE_SECRET is a valid 32-byte hex string', () => {
    expect(PUBLIC_INVITE_SECRET).toMatch(/^0x[0-9a-f]{64}$/i);
  });

  it('PUBLIC_INVITE_HASH equals keccak256(PUBLIC_INVITE_SECRET)', () => {
    expect(PUBLIC_INVITE_HASH.toLowerCase()).toBe(
      keccak256(PUBLIC_INVITE_SECRET).toLowerCase()
    );
  });

  it('PUBLIC_INVITE_HASH is not zero bytes', () => {
    expect(PUBLIC_INVITE_HASH).not.toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });
});

describe('isPublicDuel', () => {
  it('returns true for PUBLIC_INVITE_HASH', () => {
    expect(isPublicDuel(PUBLIC_INVITE_HASH)).toBe(true);
  });

  it('returns true for PUBLIC_INVITE_HASH in different case', () => {
    expect(isPublicDuel(PUBLIC_INVITE_HASH.toUpperCase() as `0x${string}`)).toBe(true);
  });

  it('returns false for a random hash', () => {
    const randomHash = hashInviteSecret(generateInviteSecret());
    expect(isPublicDuel(randomHash)).toBe(false);
  });

  it('returns false for zero hash', () => {
    expect(
      isPublicDuel('0x0000000000000000000000000000000000000000000000000000000000000000')
    ).toBe(false);
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
    const url = buildDuelLink(42, PUBLIC_INVITE_HASH);
    expect(url).toBe(`${origin}/duel/42`);
    expect(url).not.toContain('#');
  });

  it('returns invite URL with fragment for private duels with secret', () => {
    const secret = '0xabcdef0000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
    const privateHash = hashInviteSecret(secret);
    const url = buildDuelLink(7, privateHash, secret);
    expect(url).toBe(`${origin}/duel/7#${secret}`);
  });

  it('returns clean URL for private duels without secret', () => {
    const secret = '0xabcdef0000000000000000000000000000000000000000000000000000000001' as `0x${string}`;
    const privateHash = hashInviteSecret(secret);
    const url = buildDuelLink(7, privateHash);
    expect(url).toBe(`${origin}/duel/7`);
  });

  it('ignores inviteSecret param for public duels', () => {
    const someSecret = '0xdeadbeef00000000000000000000000000000000000000000000000000000000' as `0x${string}`;
    const url = buildDuelLink(10, PUBLIC_INVITE_HASH, someSecret);
    expect(url).toBe(`${origin}/duel/10`);
    expect(url).not.toContain('#');
  });
});

describe('hashInviteSecret', () => {
  it('produces consistent output', () => {
    const secret = generateInviteSecret();
    expect(hashInviteSecret(secret)).toBe(hashInviteSecret(secret));
  });

  it('produces different hashes for different secrets', () => {
    const s1 = generateInviteSecret();
    const s2 = generateInviteSecret();
    expect(hashInviteSecret(s1)).not.toBe(hashInviteSecret(s2));
  });
});

describe('isInviteSecret', () => {
  it('accepts valid 32-byte hex', () => {
    expect(isInviteSecret(PUBLIC_INVITE_SECRET)).toBe(true);
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
