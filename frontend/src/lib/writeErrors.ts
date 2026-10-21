/**
 * A mined transaction that reverted: final, unlike a failure to read its receipt. `reason` is the
 * contract's, when a replay of the call recovered it.
 */
export class TransactionRevertedError extends Error {
  readonly reason: string | undefined;

  constructor(reason: string | undefined) {
    super(reason ?? 'The transaction reverted.');
    this.name = 'TransactionRevertedError';
    this.reason = reason;
  }
}

/**
 * The write's transaction was dropped for another one with its nonce — cancelled or replaced in
 * the wallet — so the write itself never ran. Final as well: there is nothing left to wait for.
 */
export class TransactionReplacedError extends Error {
  constructor() {
    super('The transaction was cancelled or replaced in the wallet.');
    this.name = 'TransactionReplacedError';
  }
}

/** A write that could not start because the wallet or its RPC client was not ready yet. */
export class WalletNotReadyError extends Error {
  constructor(message = 'Wallet or RPC client not ready') {
    super(message);
    this.name = 'WalletNotReadyError';
  }
}

/** The token's EIP-712 domain is not the EIP-2612 one the permit is built for, so no permit is signed. */
export class PermitDomainMismatchError extends Error {
  constructor(token: string) {
    super(`Token ${token} does not use the expected EIP-2612 domain.`);
    this.name = 'PermitDomainMismatchError';
  }
}

/** Whether a write's receipt read ended for good, rather than failed to answer. */
export function isFinalReceiptError(error: unknown): error is TransactionRevertedError | TransactionReplacedError {
  return error instanceof TransactionRevertedError || error instanceof TransactionReplacedError;
}
