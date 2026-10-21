import { BaseError, ExecutionRevertedError, type Hex, type ReplacementReason, type TransactionReceipt } from 'viem';
import type { DuelPublicClient } from '@/lib/buildTransactionParams';
import { bestErrorDetail } from '@/lib/errorDetails';
import { TransactionReplacedError, TransactionRevertedError } from '@/lib/writeErrors';

/**
 * Waits for a write's receipt on the chain the write went to and decides by the receipt's status,
 * never by how anything around it failed. A failure to read the receipt is thrown as it is: it says
 * nothing about the transaction, so the caller reads again rather than call the write failed.
 */
export async function waitForWriteReceipt(client: DuelPublicClient, hash: Hex): Promise<TransactionReceipt> {
  let replacedBecause: ReplacementReason | undefined;
  const receipt = await client.waitForTransactionReceipt({
    hash,
    onReplaced: ({ reason }) => {
      replacedBecause = reason;
    },
  });

  // A sped-up copy of the same call ("repriced") is still this write; a cancel or another call
  // with its nonce is not, whatever its own receipt says.
  if (replacedBecause && replacedBecause !== 'repriced') {
    throw new TransactionReplacedError();
  }

  if (receipt.status === 'success') {
    return receipt;
  }

  throw new TransactionRevertedError(await readRevertReason(client, receipt));
}

/**
 * Replays the reverted call on the state before its block, only to tell the player why it failed.
 * How the replay ends does not change the verdict: a replay that fails for another reason (no
 * historical state, out of gas, an RPC error) or that passes now just leaves the reason unknown.
 */
async function readRevertReason(client: DuelPublicClient, receipt: TransactionReceipt): Promise<string | undefined> {
  try {
    const transaction = await client.getTransaction({ hash: receipt.transactionHash });
    await client.call({
      account: transaction.from,
      to: transaction.to,
      data: transaction.input,
      value: transaction.value,
      gas: transaction.gas,
      blockNumber: receipt.blockNumber - 1n,
    });
    return undefined;
  } catch (replayError) {
    const revert =
      replayError instanceof BaseError ? replayError.walk((cause) => cause instanceof ExecutionRevertedError) : null;

    return revert ? bestErrorDetail(revert) : undefined;
  }
}
