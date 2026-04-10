import { decodeEventLog, type TransactionReceipt } from 'viem';
import { duelMeAbi } from '@/lib/contracts';

export { getGuidedFlowErrorMessage as getCreateDuelFlowErrorMessage } from '@/lib/guidedFlowRuntime';

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
