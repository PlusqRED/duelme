import { describe, expect, it } from 'vitest';
import { bestErrorDetail, collectErrorDetails } from '@/lib/errorDetails';

describe('collectErrorDetails', () => {
  it('normalizes whitespace and case', () => {
    expect(collectErrorDetails(new Error('  Execution   Reverted \n'))).toEqual([
      'execution reverted',
    ]);
  });

  it('walks the cause chain', () => {
    const root = new Error('insufficient allowance');
    const wrapper = new Error('transfer failed', { cause: root });

    expect(collectErrorDetails(wrapper)).toEqual(
      expect.arrayContaining(['transfer failed', 'insufficient allowance'])
    );
  });

  it('reads viem-shaped fields off plain objects', () => {
    const viemError = {
      shortMessage: 'User rejected the request.',
      details: 'MetaMask Tx Signature: User denied',
      data: { reason: 'Permit failed' },
    };

    expect(collectErrorDetails(viemError)).toEqual(
      expect.arrayContaining([
        'user rejected the request.',
        'metamask tx signature: user denied',
        'permit failed',
      ])
    );
  });

  it('deduplicates repeated text', () => {
    const error = { message: 'Nonce too low', shortMessage: 'nonce too low' };

    expect(collectErrorDetails(error)).toEqual(['nonce too low']);
  });

  it('survives a cycle', () => {
    const error: Record<string, unknown> = { message: 'looping' };
    error.cause = error;

    expect(collectErrorDetails(error)).toEqual(['looping']);
  });

  it('returns nothing for empty input', () => {
    expect(collectErrorDetails(undefined)).toEqual([]);
    expect(collectErrorDetails(null)).toEqual([]);
    expect(collectErrorDetails({})).toEqual([]);
  });
});

describe('bestErrorDetail', () => {
  it('picks the revert reason over viem\'s multi-line dump of the same error', () => {
    const error = Object.assign(
      new Error(
        'The contract function "joinDuel" reverted with the following reason:\n' +
          'Duel not in Created state\n\n' +
          'Contract Call:\n  address: 0xabc\n  function: joinDuel\n\nVersion: viem@2.47.1'
      ),
      {
        shortMessage: 'Execution reverted with reason: Duel not in Created state.',
        reason: 'Duel not in Created state',
      }
    );

    expect(bestErrorDetail(error)).toBe('duel not in created state');
  });

  it('skips the placeholder reason when a real one is present', () => {
    const error = {
      message: 'execution reverted for an unknown reason',
      cause: { reason: 'Nothing to claim' },
    };

    expect(bestErrorDetail(error)).toBe('nothing to claim');
  });

  it('returns nothing when the graph carries no usable text', () => {
    expect(bestErrorDetail({ message: 'execution reverted for an unknown reason' })).toBeUndefined();
    expect(bestErrorDetail(undefined)).toBeUndefined();
  });
});
