import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import { collectErrorDetails } from '@/lib/errorDetails';
import { RelayRequestError } from '@/lib/relayApi';
import { PermitDomainMismatchError } from '@/lib/permitSignature';

export function getGuidedFlowErrorMessage(
  error: unknown,
  t: (key: TranslationKey, params?: TranslationParams) => string,
  chainName: string,
  fallbackKey: TranslationKey = 'create.flow.error.generic'
): string {
  const relayMessage = getRelayErrorMessage(error, t);
  if (relayMessage) {
    return relayMessage;
  }

  const details = collectErrorDetails(error);

  const gasEstimateDetail = details.find((detail) =>
    [
      'intrinsic gas too low',
      'estimate gas too low',
      'gas too low',
      'max fee per gas less than block base fee',
    ].some((pattern) => detail.includes(pattern))
  );

  if (
    gasEstimateDetail &&
    chainName.toLowerCase().includes('arbitrum') &&
    chainName.toLowerCase().includes('sepolia')
  ) {
    return t('create.flow.error.testnetGas', {
      details: formatErrorDetail(gasEstimateDetail),
    });
  }

  if (
    details.some((detail) =>
      ['reject', 'denied', 'cancelled', 'canceled'].some((pattern) =>
        detail.includes(pattern)
      )
    )
  ) {
    return t('create.flow.error.rejected');
  }

  const specificDetail = details.find((detail) => !isGenericErrorDetail(detail));

  if (specificDetail) {
    return t('create.flow.error.detail', {
      details: formatErrorDetail(specificDetail),
    });
  }

  return t(fallbackKey, { chain: chainName });
}

/**
 * Relaying has its own failure vocabulary, and the raw text is not something to show a
 * player: "daily allowance spent" and "the relayer is out of budget" are different
 * situations that both read as an HTTP error otherwise.
 */
function getRelayErrorMessage(
  error: unknown,
  t: (key: TranslationKey, params?: TranslationParams) => string
): string | null {
  if (error instanceof PermitDomainMismatchError) {
    return t('create.flow.error.permitUnsupported');
  }

  if (!(error instanceof RelayRequestError)) {
    return null;
  }

  switch (error.code) {
    case 'BUDGET_EXCEEDED':
      return t('create.flow.error.relayBudget');
    case 'RELAYER_UNAVAILABLE':
    case 'INVALID_SIGNATURE':
    case 'NOT_RELAYABLE':
      return t('create.flow.error.relayUnavailable');
    case 'EXECUTION_REVERTED':
      // DuelMe's own "Permit failed" is the token refusing the EIP-2612 signature — USD₮0
      // routes permit through ERC-1271 whenever the owner address has code, which an
      // EIP-7702 delegation gives a plain EOA. Retrying never fixes it, so it gets the
      // dedicated message instead of the raw revert string.
      return /permit failed/i.test(error.message)
        ? t('create.flow.error.permitUnsupported')
        : null;
    default:
      // Everything else carries the contract's own reason — let the generic detail
      // formatter surface it rather than replacing it with a vaguer message.
      return null;
  }
}

function isGenericErrorDetail(detail: string) {
  const normalizedDetail = detail.replace(/\.$/, '');

  return [
    'execution reverted for an unknown reason',
    'missing or invalid parameters',
    'transaction execution failed',
    'an internal error was received',
    'unknown reason',
  ].some((fragment) => normalizedDetail === fragment);
}

function formatErrorDetail(detail: string) {
  return detail
    .replace(/^execution reverted for an unknown reason\.?\s*/i, '')
    .replace(/^execution reverted:?\s*/i, '')
    .replace(/\.$/, '');
}
