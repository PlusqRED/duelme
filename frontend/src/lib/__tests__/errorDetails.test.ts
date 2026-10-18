import { BaseError, ExecutionRevertedError, HttpRequestError } from 'viem';
import { describe, expect, it } from 'vitest';
import { bestErrorDetail, collectErrorDetails, isRevertError } from '@/lib/errorDetails';

describe('collectErrorDetails', () => {
  it('normalizes whitespace and case', () => {
    expect(collectErrorDetails(new Error('  Execution   Reverted \n'))).toEqual([
      'execution reverted',
    ]);
  });

  it('drops the zero padding a revert reason keeps when decoded as raw text', () => {
    expect(collectErrorDetails(new Error('Nothing to claim\u0000\u0000\u0000\u0000'))).toEqual(['nothing to claim']);
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

describe('isRevertError', () => {
  it('takes wagmi\'s plain error for a reverted receipt as a revert', () => {
    expect(isRevertError(new Error('Duel not in Created state'))).toBe(true);
  });

  it('takes viem\'s error around an execution revert as a revert', () => {
    const revert = new ExecutionRevertedError({ message: 'execution reverted: Nothing to claim' });

    expect(isRevertError(new BaseError('The call failed.', { cause: revert }))).toBe(true);
  });

  it('takes a failed RPC request as worth another try', () => {
    expect(isRevertError(new HttpRequestError({ url: 'https://rpc.example' }))).toBe(false);
  });
});
