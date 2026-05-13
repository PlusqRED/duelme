import { describe, expect, it } from "vitest";
import {
  decodeInviteToken,
  encodeInviteToken,
  generateInvite,
  sha256BigInt,
  _internals,
} from "@/lib/invite";

describe("invite hash", () => {
  it("matches on-chain hash for a known secret", async () => {
    // Pinned value: SHA-256(0x0000…0001 as 32-byte BE).
    // Generated via: echo -n 0000000000000000000000000000000000000000000000000000000000000001 | xxd -r -p | sha256sum
    const secret = 1n;
    const expected =
      0xec4916dd28fc4c10d78e287ca5d9cc51ee1ae73cbfde08c6b37324cbfaac8bc5n;
    expect(await sha256BigInt(secret)).toBe(expected);
  });

  it("generates a non-zero secret and matching hash", async () => {
    const { secret, inviteHash } = await generateInvite();
    expect(secret).toBeTypeOf("bigint");
    expect(secret).not.toBe(0n);
    expect(inviteHash).not.toBe(0n);
    expect(await sha256BigInt(secret)).toBe(inviteHash);
  });
});

describe("invite token encoding", () => {
  it("round-trips duelId + secret losslessly", () => {
    const payload = { duelId: 0xfeedfacecafebaben, secret: (1n << 200n) | 12345n };
    const token = encodeInviteToken(payload);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    const decoded = decodeInviteToken(token);
    expect(decoded.duelId).toBe(payload.duelId);
    expect(decoded.secret).toBe(payload.secret);
  });

  it("rejects malformed tokens", () => {
    expect(() => decodeInviteToken("not-a-real-token")).toThrow();
  });

  it("uses url-safe base64 (no padding)", () => {
    const token = encodeInviteToken({ duelId: 0n, secret: 0n });
    expect(token).not.toContain("=");
    expect(token).not.toContain("+");
    expect(token).not.toContain("/");
  });
});

describe("internal byte helpers", () => {
  it("converts bigint <-> bytes losslessly", () => {
    const value = 0x1234567890ABCDEFn;
    const bytes = _internals.bigIntToBytes(value, 8);
    expect(_internals.bytesToBigInt(bytes)).toBe(value);
  });
});
