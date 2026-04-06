import { decodeEventLog, type TransactionReceipt } from 'viem';
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
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('reject') || message.includes('denied')) {
    return t('create.flow.error.rejected');
  }

  return t(fallbackKey, { chain: chainName });
}
