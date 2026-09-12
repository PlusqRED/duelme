import {
  getSponsoredTransactionConfig,
  isSponsoredWriteAllowed,
  SPONSORSHIP_UNAVAILABLE_CODE,
  type SponsoredTransactionConfig,
  type SponsoredTransactionEnv,
} from '@/lib/sponsoredTransactionConfig';

// Error type + classification shared by both sponsored write paths (embedded
// EIP-7702 in lib/sponsoredTransactions, external EIP-5792 in
// lib/sponsoredWalletCalls) and by guidedFlowRuntime's message mapping.

export class SponsorshipUnavailableError extends Error {
  readonly code = SPONSORSHIP_UNAVAILABLE_CODE;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SponsorshipUnavailableError';
  }
}

/** Resolves the Pimlico config and enforces the sponsored-write allowlist, or throws SponsorshipUnavailableError. */
export function requireSponsoredWriteConfig(
  chainId: number,
  address: `0x${string}`,
  functionName: string,
  env?: SponsoredTransactionEnv
): SponsoredTransactionConfig {
  const config = getSponsoredTransactionConfig(chainId, env);

  if (!config) {
    throw new SponsorshipUnavailableError(
      'Network fee sponsorship is not configured for this network.'
    );
  }

  if (!isSponsoredWriteAllowed(chainId, address, functionName)) {
    throw new SponsorshipUnavailableError(
      'Network fee sponsorship is not allowed for this action.'
    );
  }

  return config;
}

/**
 * Catch-block policy for the sponsored senders: user rejections and
 * already-classified errors pass through untouched; likely sponsorship
 * failures are wrapped as SponsorshipUnavailableError (cause logged — the
 * wrapped message is deliberately generic); everything else surfaces raw.
 */
export function rethrowSponsoredWriteError(error: unknown, logLabel: string): never {
  const details =
    error instanceof SponsorshipUnavailableError ? [] : collectErrorDetails(error);

  if (error instanceof SponsorshipUnavailableError || matchesUserRejection(details)) {
    throw error;
  }

  console.error(logLabel, error);

  if (matchesSponsorshipFailure(details)) {
    throw new SponsorshipUnavailableError(
      'Network fee sponsorship is temporarily unavailable.',
      { cause: error }
    );
  }

  throw error;
}

export function isUserRejection(error: unknown): boolean {
  return matchesUserRejection(collectErrorDetails(error));
}

export function isLikelySponsorshipFailure(error: unknown): boolean {
  return matchesSponsorshipFailure(collectErrorDetails(error));
}

function matchesUserRejection(details: string[]): boolean {
  return details.some(
    (detail) =>
      /user|wallet/.test(detail) && /reject|denied|cancelled|canceled/.test(detail)
  );
}

const SPONSORSHIP_FAILURE_PATTERNS = [
  'paymaster',
  'policy',
  'sponsor',
  'sponsorship',
  'bundler',
  'user operation',
  'useroperation',
  '7702',
  'calls status',
];

function matchesSponsorshipFailure(details: string[]): boolean {
  return details.some((detail) =>
    SPONSORSHIP_FAILURE_PATTERNS.some((pattern) => detail.includes(pattern))
  );
}

/**
 * Collects every human-readable detail from an error graph (message /
 * shortMessage / details / reason, walking cause / error / data recursively),
 * normalized to lowercase single-space strings.
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

function addDetail(details: Set<string>, value: unknown) {
  if (typeof value !== 'string') {
    return;
  }

  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (normalized) {
    details.add(normalized);
  }
}
