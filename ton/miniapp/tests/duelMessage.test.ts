import { describe, expect, it } from "vitest";
import { isValidDuelMessage, validateDuelMessage } from "@/lib/duelMessage";

describe("validateDuelMessage", () => {
  it("accepts empty messages", () => {
    const v = validateDuelMessage("");
    expect(v.errors).toHaveLength(0);
    expect(v.byteLength).toBe(0);
  });

  it("accepts ASCII up to 32 chars", () => {
    const msg = "A".repeat(32);
    expect(isValidDuelMessage(msg)).toBe(true);
  });

  it("rejects > 32 code points", () => {
    const msg = "A".repeat(33);
    const v = validateDuelMessage(msg);
    expect(v.errors).toContain("tooManyCodePoints");
  });

  it("rejects byte length > 128 even within 32 code points", () => {
    // Use a 5-byte emoji (e.g. women workers — different ZWJ chunks). The
    // canonical 4-byte test is the family emoji which is 4 bytes in UTF-8.
    const four = "🀄"; // 4 bytes
    // 32 of these = 128 bytes — exactly at the limit.
    expect(validateDuelMessage(four.repeat(32)).errors).toHaveLength(0);
    // 33 of these would exceed 128 bytes and 32 code points.
    const v = validateDuelMessage(four.repeat(33));
    expect(v.errors.length).toBeGreaterThan(0);
  });

  it("counts unicode code points correctly", () => {
    expect(validateDuelMessage("aé🙂").codePoints).toBe(3);
  });
});
