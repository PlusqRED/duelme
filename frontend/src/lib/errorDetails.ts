/**
 * Collects every human-readable detail from an error graph (message /
 * shortMessage / details / reason, walking cause / error / data recursively),
 * normalized to lowercase single-space strings.
 *
 * Wallet and RPC errors nest the useful text at unpredictable depths, so the
 * callers that classify a failure — guidedFlowRuntime's message mapping, the
 * relayer's error reporting — match against this flattened list rather than
 * guessing which field holds the reason this time.
 */
export function collectErrorDetails(error: unknown): string[] {
  const details = new Set<string>();
  const stack: unknown[] = [error];
  const seen = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    if (typeof current === 'string') {
      addDetail(details, current);
      continue;
    }

    if (current instanceof Error) {
      addDetail(details, current.message);
      stack.push(current.cause);
    }

    if (typeof current !== 'object' || seen.has(current)) {
      continue;
    }

    seen.add(current);

    const record = current as Record<string, unknown>;
    addDetail(details, record.shortMessage);
    addDetail(details, record.details);
    addDetail(details, record.message);
    addDetail(details, record.reason);
    stack.push(record.cause, record.error, record.data);
  }

  return Array.from(details);
}

/**
 * The one detail worth showing a person, or undefined when the graph carries nothing but
 * noise.
 *
 * `collectErrorDetails` visits an error's own `message` before its `shortMessage` / `reason`,
 * and for a viem error that `message` is the whole multi-line "Contract Call / Request
 * Arguments / Version" dump. The bare revert string is in the same list and is always the
 * shortest candidate, so length picks the sentence a player can act on rather than the dump.
 */
export function bestErrorDetail(error: unknown): string | undefined {
  return collectErrorDetails(error)
    .filter((detail) => !detail.includes('execution reverted for an unknown reason'))
    // viem spells the same reason three ways; the "execution reverted" preamble adds
    // nothing once the string is embedded in a sentence of ours.
    .map((detail) => detail.replace(/^execution reverted(?: with reason)?:?\s*/, ''))
    .filter((detail) => detail.length > 0)
    .sort((a, b) => a.length - b.length)[0];
}

function addDetail(details: Set<string>, value: unknown) {
  if (typeof value !== 'string') {
    return;
  }

  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (normalized) {
    details.add(normalized);
  }
}
