import { Address } from "@ton/core";

// ─── TON amount formatting ────────────────────────────────────────────────

/** Convert nanoTON bigint to a friendly TON string with grouping. */
export function formatTon(nano: bigint | number | string, opts: { precision?: number } = {}): string {
  const { precision = 4 } = opts;
  const value = typeof nano === "bigint" ? nano : BigInt(nano);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / 1_000_000_000n;
  const fraction = abs % 1_000_000_000n;
  const fractionStr = fraction.toString().padStart(9, "0").slice(0, precision).replace(/0+$/, "");
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (fractionStr.length === 0) {
    return `${negative ? "-" : ""}${wholeStr}`;
  }
  return `${negative ? "-" : ""}${wholeStr}.${fractionStr}`;
}

/** Parse a TON decimal string (e.g. "5.25") into nanoTON. */
export function parseTon(input: string): bigint {
  const trimmed = input.trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,9})?$/.test(trimmed)) {
    throw new Error("Invalid TON amount");
  }
  const [wholeRaw, frac = ""] = trimmed.split(".");
  const whole = wholeRaw ?? "0";
  const fracPadded = frac.padEnd(9, "0");
  return BigInt(whole) * 1_000_000_000n + BigInt(fracPadded);
}

// ─── Address formatting ───────────────────────────────────────────────────

/** Shorten an address for display: `EQ1234…ABCD`. */
export function shortenAddress(input: string | Address, head = 4, tail = 4): string {
  const str = typeof input === "string" ? input : input.toString();
  if (str.length <= head + tail + 1) {
    return str;
  }
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export function safeParseAddress(input: string | null | undefined): Address | null {
  if (!input) return null;
  try {
    return Address.parse(input);
  } catch {
    return null;
  }
}

export function addressEquals(a: Address | null | undefined, b: Address | null | undefined): boolean {
  if (!a || !b) return false;
  return a.toRawString() === b.toRawString();
}

// ─── Time formatting ──────────────────────────────────────────────────────

export function relativeTime(unixSec: number, now = Math.floor(Date.now() / 1000)): string {
  const diff = now - unixSec;
  if (diff < 60) return `${Math.max(0, diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function countdown(targetSec: number, now = Math.floor(Date.now() / 1000)): string {
  const diff = targetSec - now;
  if (diff <= 0) return "00:00";
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
