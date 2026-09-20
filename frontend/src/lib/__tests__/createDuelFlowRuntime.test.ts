import { describe, expect, it } from 'vitest';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import { translations } from '@/i18n/translations';
import { getCreateDuelFlowErrorMessage } from '@/lib/createDuelFlowRuntime';
import { RelayRequestError } from '@/lib/relayApi';
import { PermitDomainMismatchError } from '@/lib/permitSignature';

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

describe('getCreateDuelFlowErrorMessage — relay failures', () => {
  it('explains a spent daily allowance instead of showing an HTTP error', () => {
    const error = new RelayRequestError('BUDGET_EXCEEDED', 'Daily gas allowance is used up.');

    expect(getCreateDuelFlowErrorMessage(error, t, 'Arbitrum One')).toBe(
      translations.en['create.flow.error.relayBudget']
    );
  });

  it('collapses every "relaying is off" code into one message', () => {
    for (const code of ['RELAYER_UNAVAILABLE', 'INVALID_SIGNATURE', 'NOT_RELAYABLE'] as const) {
      expect(getCreateDuelFlowErrorMessage(new RelayRequestError(code, 'x'), t, 'Arbitrum One')).toBe(
        translations.en['create.flow.error.relayUnavailable']
      );
    }
  });

  it('keeps the contract reason for a reverted action rather than hiding it', () => {
    const error = new RelayRequestError(
      'EXECUTION_REVERTED',
      'The duel action would revert: Wager below minimum'
    );

    expect(getCreateDuelFlowErrorMessage(error, t, 'Arbitrum One')).toContain(
      'wager below minimum'
    );
  });

  it('recognises the token refusing the permit rather than dumping the revert string', () => {
    const error = new RelayRequestError(
      'EXECUTION_REVERTED',
      'The duel action would revert: permit failed'
    );

    expect(getCreateDuelFlowErrorMessage(error, t, 'Arbitrum One')).toBe(
      translations.en['create.flow.error.permitUnsupported']
    );
  });

  it('tells a wallet that cannot sign a permit what to do instead', () => {
    const error = new PermitDomainMismatchError('0xtoken');

    expect(getCreateDuelFlowErrorMessage(error, t, 'Arbitrum One')).toBe(
      translations.en['create.flow.error.permitUnsupported']
    );
  });
});
