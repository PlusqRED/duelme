import { BaseError, ExecutionRevertedError, HttpRequestError, type TransactionReceipt } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import type { DuelPublicClient } from '@/lib/buildTransactionParams';
import { TransactionReplacedError, TransactionRevertedError } from '@/lib/writeErrors';
import { waitForWriteReceipt } from '@/lib/writeReceipt';

const HASH = `0x${'a'.repeat(64)}` as const;
const FROM = '0x1111111111111111111111111111111111111111' as const;
const TO = '0x3333333333333333333333333333333333333333' as const;

function receipt(status: TransactionReceipt['status']) {
  return { status, transactionHash: HASH, blockNumber: 100n } as TransactionReceipt;
}

type ReceiptReadArgs = { onReplaced?: (replacement: { reason: string }) => void };

function client({
  receiptRead = async () => receipt('success'),
  replay = async () => ({ data: undefined }),
}: {
  receiptRead?: (args: ReceiptReadArgs) => Promise<TransactionReceipt>;
  replay?: (args: { blockNumber?: bigint }) => Promise<unknown>;
} = {}) {
  const fake = {
    waitForTransactionReceipt: vi.fn(receiptRead),
    getTransaction: vi.fn(async () => ({ from: FROM, to: TO, input: '0xdeadbeef', value: 0n, gas: 100_000n })),
    call: vi.fn(replay),
  };

  return { fake, client: fake as unknown as DuelPublicClient };
}

function revertedReplay(reason: string) {
  return async () => {
    throw new BaseError('The call failed.', {
      cause: new ExecutionRevertedError({ message: `execution reverted: ${reason}` }),
    });
  };
}

describe('waitForWriteReceipt', () => {
  it('returns the receipt of a transaction that went through', async () => {
    const { client: success } = client();

    await expect(waitForWriteReceipt(success, HASH)).resolves.toMatchObject({ status: 'success' });
  });

  it('ends a reverted transaction in a revert carrying the contract\'s reason', async () => {
    const { client: reverted } = client({
      receiptRead: async () => receipt('reverted'),
      replay: revertedReplay('Duel not in Created state'),
    });

    const failure = waitForWriteReceipt(reverted, HASH);

    await expect(failure).rejects.toBeInstanceOf(TransactionRevertedError);
    await expect(failure).rejects.toThrow('duel not in created state');
  });

  it('still ends a reverted transaction in a revert when its replay fails for another reason', async () => {
    const { client: reverted } = client({
      receiptRead: async () => receipt('reverted'),
      replay: async () => {
        throw new BaseError('out of gas');
      },
    });

    const failure = waitForWriteReceipt(reverted, HASH);

    await expect(failure).rejects.toBeInstanceOf(TransactionRevertedError);
    await expect(failure).rejects.toThrow('The transaction reverted.');
  });

  it('still ends a reverted transaction in a revert when its replay passes now', async () => {
    const { client: reverted } = client({ receiptRead: async () => receipt('reverted') });

    await expect(waitForWriteReceipt(reverted, HASH)).rejects.toBeInstanceOf(TransactionRevertedError);
  });

  it('watches the receipt for as long as it takes, so a later replacement is still seen', async () => {
    const { fake, client: success } = client();

    await waitForWriteReceipt(success, HASH);

    expect(fake.waitForTransactionReceipt).toHaveBeenCalledWith(expect.objectContaining({ timeout: 0 }));
  });

  it('replays the reverted call on the state before its block', async () => {
    const { fake, client: reverted } = client({ receiptRead: async () => receipt('reverted') });

    await waitForWriteReceipt(reverted, HASH).catch(() => undefined);

    expect(fake.call).toHaveBeenCalledWith(expect.objectContaining({ blockNumber: 99n, account: FROM, to: TO }));
  });

  it('passes a failure to read the receipt on as it is, not as a revert', async () => {
    const outage = new HttpRequestError({ url: 'https://rpc.example' });
    const { client: offline } = client({
      receiptRead: async () => {
        throw outage;
      },
    });

    await expect(waitForWriteReceipt(offline, HASH)).rejects.toBe(outage);
  });

  it('ends a transaction cancelled in the wallet in a replacement, though the cancel itself succeeded', async () => {
    const { client: cancelled } = client({
      receiptRead: async ({ onReplaced }) => {
        onReplaced?.({ reason: 'cancelled' });
        return receipt('success');
      },
    });

    await expect(waitForWriteReceipt(cancelled, HASH)).rejects.toBeInstanceOf(TransactionReplacedError);
  });

  it('takes a sped-up copy of the same call as the write itself', async () => {
    const { client: repriced } = client({
      receiptRead: async ({ onReplaced }) => {
        onReplaced?.({ reason: 'repriced' });
        return receipt('success');
      },
    });

    await expect(waitForWriteReceipt(repriced, HASH)).resolves.toMatchObject({ status: 'success' });
  });
});
