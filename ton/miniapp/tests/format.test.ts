import { describe, expect, it } from "vitest";
import { Address } from "@ton/core";
import { addressEquals, countdown, formatTon, parseTon, relativeTime, shortenAddress } from "@/lib/format";

describe("formatTon", () => {
  it("formats whole TON", () => {
    expect(formatTon(0n)).toBe("0");
    expect(formatTon(1_000_000_000n)).toBe("1");
    expect(formatTon(12_345_000_000_000n)).toBe("12 345");
  });

  it("formats fractional TON", () => {
    expect(formatTon(1_500_000_000n)).toBe("1.5");
    expect(formatTon(1_234_567_890n)).toBe("1.2345");
    expect(formatTon(1_234_567_890n, { precision: 9 })).toBe("1.23456789");
  });

  it("handles negative values", () => {
    expect(formatTon(-1_000_000_000n)).toBe("-1");
  });
});

describe("parseTon", () => {
  it("parses canonical decimal strings", () => {
    expect(parseTon("1")).toBe(1_000_000_000n);
    expect(parseTon("0.5")).toBe(500_000_000n);
    expect(parseTon("123.456789")).toBe(123_456_789_000n);
  });

  it("accepts comma as decimal separator", () => {
    expect(parseTon("0,1")).toBe(100_000_000n);
  });

  it("rejects bad input", () => {
    expect(() => parseTon("")).toThrow();
    expect(() => parseTon("1.2.3")).toThrow();
    expect(() => parseTon("abc")).toThrow();
  });

  it("rejects more than 9 fractional digits", () => {
    expect(() => parseTon("1.1234567890")).toThrow();
  });
});

describe("address helpers", () => {
  const a = Address.parse("EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT");
  it("shortens to head…tail", () => {
    const short = shortenAddress(a, 4, 4);
    expect(short).toMatch(/^EQAv…/);
    expect(short.endsWith("__NOT")).toBe(false);
    expect(short.length).toBeLessThan(a.toString().length);
  });

  it("addressEquals is null-safe", () => {
    expect(addressEquals(null, null)).toBe(false);
    expect(addressEquals(a, null)).toBe(false);
    expect(addressEquals(a, a)).toBe(true);
  });
});

describe("time helpers", () => {
  it("formats relative seconds, minutes, hours, days", () => {
    const now = 10_000;
    expect(relativeTime(9_999, now)).toBe("1s ago");
    expect(relativeTime(9_940, now)).toBe("1m ago");
    expect(relativeTime(now - 3600 * 2, now)).toBe("2h ago");
    expect(relativeTime(now - 86_400 * 3, now)).toBe("3d ago");
  });

  it("countdown clamps at 00:00", () => {
    expect(countdown(100, 200)).toBe("00:00");
    expect(countdown(200, 100)).toBe("01:40");
  });
});
