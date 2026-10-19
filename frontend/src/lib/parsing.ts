/** Checks for a value read from outside — a response, storage, a request — before it is trusted. */

/** A plain object whose fields can be read, not null and not an array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accepts only a canonical non-negative decimal string, so "0x10" / "1e9" / "-1" are out. */
export function parseUintString(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    return null;
  }
  return BigInt(value);
}
