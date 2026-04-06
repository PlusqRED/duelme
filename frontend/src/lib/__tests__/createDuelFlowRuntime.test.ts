import { describe, expect, it } from 'vitest';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import { translations } from '@/i18n/translations';
import { getCreateDuelFlowErrorMessage } from '@/lib/createDuelFlowRuntime';

function t(key: TranslationKey, params?: TranslationParams) {
  let value = String(translations.en[key]);

  if (!params) {
    return value;
  }

  for (const [paramKey, paramValue] of Object.entries(params)) {
    value = value.replaceAll(`{${paramKey}}`, String(paramValue));
  }

  return value;
}

describe('getCreateDuelFlowErrorMessage', () => {
  it('surfaces the Arbitrum Sepolia gas-estimation error instead of the generic fallback', () => {
    expect(
      getCreateDuelFlowErrorMessage(
        new Error('Execution reverted for an unknown reason. intrinsic gas too low'),
        t,
        'Arbitrum Sepolia'
      )
    ).toBe(
      'Arbitrum Sepolia returned: intrinsic gas too low. This is a testnet gas issue. Please try again.'
    );
  });

  it('surfaces Arbitrum Sepolia fee-cap errors as testnet gas errors', () => {
    expect(
      getCreateDuelFlowErrorMessage(
        new Error(
          'the contract function "approve" reverted with the following reason: max fee per gas less than block base fee: maxfeepergas: 20002000 basefee: 20006000'
        ),
        t,
        'Arbitrum Sepolia'
      )
    ).toBe(
      'Arbitrum Sepolia returned: the contract function "approve" reverted with the following reason: max fee per gas less than block base fee: maxfeepergas: 20002000 basefee: 20006000. This is a testnet gas issue. Please try again.'
    );
  });

  it('surfaces specific non-generic error details when available', () => {
    expect(
      getCreateDuelFlowErrorMessage(
        new Error('Allowance refetch failed'),
        t,
        'Arbitrum Sepolia'
      )
    ).toBe('This step failed: allowance refetch failed.');
  });

  it('keeps the specific reason when a generic wrapper is followed by real details', () => {
    expect(
      getCreateDuelFlowErrorMessage(
        new Error('Execution reverted for an unknown reason. nonce too low'),
        t,
        'Arbitrum Sepolia'
      )
    ).toBe('This step failed: nonce too low.');
  });
});
