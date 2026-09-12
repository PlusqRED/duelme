import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import { SPONSORSHIP_UNAVAILABLE_CODE } from '@/lib/sponsoredTransactionConfig';
import { collectErrorDetails } from '@/lib/sponsoredTransactionErrors';

export function getGuidedFlowErrorMessage(
  error: unknown,
  t: (key: TranslationKey, params?: TranslationParams) => string,
  chainName: string,
  fallbackKey: TranslationKey = 'create.flow.error.generic'
): string {
  const details = collectErrorDetails(error);

  if (hasErrorCode(error, SPONSORSHIP_UNAVAILABLE_CODE)) {
    return t('create.flow.error.sponsorshipUnavailable');
  }

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasErrorCode(error: unknown, code: string): boolean {
  const stack: unknown[] = [error];
  const seenObjects = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();

    if (!isRecord(current) || seenObjects.has(current)) {
      continue;
    }

    seenObjects.add(current);

    if (current.code === code) {
      return true;
    }

    stack.push(current.cause, current.error, current.data);
  }

  return false;
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
