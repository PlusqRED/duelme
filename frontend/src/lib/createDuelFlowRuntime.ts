import { BaseError, decodeEventLog, type TransactionReceipt } from 'viem';
import { duelMeAbi } from '@/lib/contracts';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';

export function extractCreatedDuelId(receipt: TransactionReceipt): string | null {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: duelMeAbi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === 'DuelCreated') {
        return String((decoded.args as { duelId: bigint }).duelId);
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function buildDuelPath(
  duelId: string,
  inviteSecret: `0x${string}` | null
): string {
  return inviteSecret ? `/duel/${duelId}#${inviteSecret}` : `/duel/${duelId}`;
}

export function getCreateDuelFlowErrorMessage(
  error: unknown,
  t: (key: TranslationKey, params?: TranslationParams) => string,
  chainName: string,
  fallbackKey: TranslationKey = 'create.flow.error.generic'
): string {
  const details = collectErrorDetails(error);
  const gasEstimateDetail = details.find((detail) =>
    ['intrinsic gas too low', 'estimate gas too low', 'gas too low'].some((pattern) =>
      detail.includes(pattern)
    )
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

function collectErrorDetails(error: unknown): string[] {
  const details = new Set<string>();
  const stack: unknown[] = [error];
  const seenObjects = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      continue;
    }

    if (typeof current === 'string') {
      addErrorDetail(details, current);
      continue;
    }

    if (current instanceof BaseError) {
      addErrorDetail(details, current.shortMessage);
      addErrorDetail(details, current.details);
      stack.push(current.cause);
    }

    if (current instanceof Error) {
      addErrorDetail(details, current.message);
      stack.push(current.cause);
    }

    if (typeof current !== 'object') {
      continue;
    }

    if (seenObjects.has(current)) {
      continue;
    }

    seenObjects.add(current);

    if (!isRecord(current)) {
      continue;
    }

    addErrorDetail(details, getStringValue(current, 'shortMessage'));
    addErrorDetail(details, getStringValue(current, 'details'));
    addErrorDetail(details, getStringValue(current, 'message'));
    addErrorDetail(details, getStringValue(current, 'reason'));
    stack.push(current.cause, current.error, current.data);
  }

  return Array.from(details);
}

function addErrorDetail(details: Set<string>, message?: string) {
  if (!message) {
    return;
  }

  const normalized = message.trim().replace(/\s+/g, ' ').toLowerCase();

  if (!normalized) {
    return;
  }

  details.add(normalized);
}

function getStringValue(value: Record<string, unknown>, key: string): string | undefined {
  const candidate = value[key];
  return typeof candidate === 'string' ? candidate : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
