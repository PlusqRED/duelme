import { decodeEventLog, type TransactionReceipt } from 'viem';
import { duelMeAbi } from '@/lib/contracts';
import type { CreateDuelFlowDraft } from '@/lib/createDuelFlow';
import { attachGameToDuel } from '@/lib/gameApi';
import { storeInviteSecret } from '@/lib/invite';

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

interface RecordCreatedDuelOptions {
  receipt: TransactionReceipt;
  draft: CreateDuelFlowDraft;
  identityToken: string | null | undefined;
  /** The game tag did not reach the backend; the duel itself is made either way. */
  onGameAttachFailed: () => void;
}

/**
 * What the app keeps of a duel once its create is confirmed: the invite secret, so this browser
 * can show the private link again, and the game it is played in. Returns the duel's id, or null
 * when the receipt names none.
 */
export function recordCreatedDuel({ receipt, draft, identityToken, onGameAttachFailed }: RecordCreatedDuelOptions): number | null {
  const createdId = extractCreatedDuelId(receipt);
  if (createdId === null) {
    return null;
  }

  const duelId = Number(createdId);
  if (draft.inviteSecret) {
    storeInviteSecret(draft.chainId, draft.contractAddress, duelId, draft.inviteSecret);
  }
  if (draft.gameName && identityToken) {
    attachGameToDuel(identityToken, duelId, draft.chainId, draft.contractAddress, draft.gameName, draft.gameCategory ?? undefined).catch(
      onGameAttachFailed
    );
  }
  return duelId;
}
