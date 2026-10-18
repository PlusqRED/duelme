import type { TransactionReceipt } from 'viem';

/**
 * A mined transaction that reverted: final, unlike a failure to read its receipt. `reason` is the
 * contract's, when a replay of the call recovered it.
 */
export class TransactionRevertedError extends Error {
  readonly receipt: TransactionReceipt;
  readonly reason: string | undefined;

  constructor(receipt: TransactionReceipt, reason: string | undefined) {
    super(reason ?? 'The transaction reverted.');
    this.name = 'TransactionRevertedError';
    this.receipt = receipt;
    this.reason = reason;
  }
}

/**
 * The write's transaction was dropped for another one with its nonce — cancelled or replaced in
 * the wallet — so the write itself never ran. Final as well: there is nothing left to wait for.
 */
export class TransactionReplacedError extends Error {
  readonly replacement: TransactionReceipt;

  constructor(replacement: TransactionReceipt, reason: 'cancelled' | 'replaced') {
    super(`The transaction was ${reason} in the wallet.`);
    this.name = 'TransactionReplacedError';
    this.replacement = replacement;
  }
}

/** A write that could not start because the wallet or its RPC client was not ready yet. */
export class WalletNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletNotReadyError';
  }
}

/** Whether a write's receipt read ended for good, rather than failed to answer. */
export function isFinalReceiptError(error: unknown): error is TransactionRevertedError | TransactionReplacedError {
  return error instanceof TransactionRevertedError || error instanceof TransactionReplacedError;
}
