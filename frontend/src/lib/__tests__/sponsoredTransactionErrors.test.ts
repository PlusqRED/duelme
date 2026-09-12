import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { DUELME_ADDRESSES, SUPPORTED_CHAINS } from '@/lib/constants';
import { SPONSORSHIP_UNAVAILABLE_CODE } from '@/lib/sponsoredTransactionConfig';
import {
  isLikelySponsorshipFailure,
  isUserRejection,
  requireSponsoredWriteConfig,
  rethrowSponsoredWriteError,
  SponsorshipUnavailableError,
} from '@/lib/sponsoredTransactionErrors';
import {
  PIMLICO_TEST_ARBITRUM_POLICY,
  pimlicoTestEnv,
} from './sponsorshipTestEnv';

const CHAIN_ID = SUPPORTED_CHAINS.arbitrum.id;
const DUELME_ADDRESS = DUELME_ADDRESSES[CHAIN_ID];
const ENV = pimlicoTestEnv();

let consoleError: MockInstance;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('SponsorshipUnavailableError', () => {
  it('carries the shared code guidedFlowRuntime matches on', () => {
    const error = new SponsorshipUnavailableError('nope');

    expect(error.code).toBe(SPONSORSHIP_UNAVAILABLE_CODE);
    expect(error.name).toBe('SponsorshipUnavailableError');
  });
});

describe('isUserRejection', () => {
  it.each([
    'User rejected the request.',
    'Request denied by user',
    'Wallet: transaction cancelled',
    'canceled by the user',
  ])('detects user-scoped rejection: %s', (message) => {
    expect(isUserRejection(new Error(message))).toBe(true);
  });

  it('requires the rejection to be user/wallet scoped', () => {
    expect(isUserRejection(new Error('execution rejected by node'))).toBe(false);
  });

  it('finds the rejection in a nested cause chain', () => {
    const error = new Error('Request failed', {
      cause: { shortMessage: 'User rejected the request.' },
    });

    expect(isUserRejection(error)).toBe(true);
  });
});

describe('isLikelySponsorshipFailure', () => {
  it.each([
    'paymaster rejected the operation',
    'policy limit reached',
    'sponsorship expired',
    'bundler unavailable',
    'UserOperation reverted during simulation',
    'EIP-7702 delegation failed',
  ])('matches sponsorship-infrastructure failures: %s', (message) => {
    expect(isLikelySponsorshipFailure(new Error(message))).toBe(true);
  });

  it('matches details nested under cause/error/data records', () => {
    const error = {
      message: 'Request failed',
      data: { reason: 'paymaster deposit too low' },
    };

    expect(isLikelySponsorshipFailure(error)).toBe(true);
  });

  it('does not match unrelated transaction errors', () => {
    expect(isLikelySponsorshipFailure(new Error('insufficient funds for gas'))).toBe(
      false
    );
    expect(
      isLikelySponsorshipFailure(new Error('Gasless transaction reverted on-chain.'))
    ).toBe(false);
  });
});

describe('requireSponsoredWriteConfig', () => {
  it('returns the Pimlico config for an allowlisted duel write', () => {
    const config = requireSponsoredWriteConfig(CHAIN_ID, DUELME_ADDRESS, 'joinDuel', ENV);

    expect(config.sponsorshipPolicyId).toBe(PIMLICO_TEST_ARBITRUM_POLICY);
    expect(config.chain.id).toBe(CHAIN_ID);
  });

  it('throws SponsorshipUnavailableError when env is not configured', () => {
    expect(() =>
      requireSponsoredWriteConfig(CHAIN_ID, DUELME_ADDRESS, 'joinDuel', {})
    ).toThrow(SponsorshipUnavailableError);
  });

  it('throws SponsorshipUnavailableError for writes outside the allowlist', () => {
    expect(() =>
      requireSponsoredWriteConfig(CHAIN_ID, DUELME_ADDRESS, 'rescueETH', ENV)
    ).toThrow(SponsorshipUnavailableError);
  });
});

describe('rethrowSponsoredWriteError', () => {
  it('rethrows user rejections untouched without logging', () => {
    const rejection = new Error('User rejected the request.');

    expect(() => rethrowSponsoredWriteError(rejection, '[test]')).toThrow(rejection);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('rethrows an existing SponsorshipUnavailableError untouched', () => {
    const existing = new SponsorshipUnavailableError('not allowed');

    expect(() => rethrowSponsoredWriteError(existing, '[test]')).toThrow(existing);
  });

  it('wraps likely sponsorship failures, keeping the cause, and logs it', () => {
    const cause = new Error('paymaster balance too low');

    let thrown: unknown;
    try {
      rethrowSponsoredWriteError(cause, '[test]');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SponsorshipUnavailableError);
    expect((thrown as SponsorshipUnavailableError).cause).toBe(cause);
    expect(consoleError).toHaveBeenCalledWith('[test]', cause);
  });

  it('rethrows unrelated errors raw so the real failure surfaces', () => {
    const unrelated = new Error('Gasless transaction reverted on-chain.');

    expect(() => rethrowSponsoredWriteError(unrelated, '[test]')).toThrow(unrelated);
  });
});
