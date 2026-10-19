import { isAddress, parseUnits } from 'viem';
import { USDT_DECIMALS } from '@/lib/constants';
import { isWalletRefusal } from '@/lib/errorDetails';

/** A positive or zero decimal as a person types it: a comma or a point, at most USDT's six decimals. */
const TYPED_AMOUNT = /^(?:\d+(?:[.,]\d{1,6})?|[.,]\d{1,6})$/;

/** The amount typed, in USDT's smallest unit, or null when it is not a number USDT can hold. */
export function parseUsdtAmount(text: string): bigint | null {
  const typed = text.trim();
  if (!TYPED_AMOUNT.test(typed)) {
    return null;
  }
  return parseUnits(`0${typed.replace(',', '.')}`, USDT_DECIMALS);
}

export interface SendDraft {
  to: string;
  amount: string;
}

export interface SendWallet {
  address: string;
  /** The balances on the network the transfer goes out on; null while they are not known. */
  usdtRaw: bigint | null;
  ethWei: bigint | null;
}

export interface Transfer {
  to: `0x${string}`;
  /** In USDT's smallest unit. */
  raw: bigint;
}

/** The transfer a draft asks for, or null while it names no address or no amount above zero. */
export function parseTransfer(draft: SendDraft): Transfer | null {
  const to = draft.to.trim();
  const raw = parseUsdtAmount(draft.amount);
  return isAddress(to, { strict: false }) && raw !== null && raw > 0n ? { to, raw } : null;
}

/** What stops a transfer, by field. Nothing in it means it may go to the wallet. */
export interface SendProblems {
  to?: 'address' | 'self';
  amount?: 'empty' | 'tooMuch';
  eth?: 'none';
}

/**
 * Checks a transfer before the wallet sees it. A balance that is not known yet stops nothing: the
 * wallet's own estimate catches what this cannot.
 */
export function sendProblems(draft: SendDraft, wallet: SendWallet): SendProblems {
  const problems: SendProblems = {};
  const to = draft.to.trim();
  if (!isAddress(to, { strict: false })) {
    problems.to = 'address';
  } else if (to.toLowerCase() === wallet.address.toLowerCase()) {
    problems.to = 'self';
  }

  const amount = parseUsdtAmount(draft.amount);
  if (amount === null || amount === 0n) {
    problems.amount = 'empty';
  } else if (wallet.usdtRaw !== null && amount > wallet.usdtRaw) {
    problems.amount = 'tooMuch';
  }

  if (wallet.ethWei === 0n) {
    problems.eth = 'none';
  }
  return problems;
}

/**
 * Where a transfer is: the form; waiting for the wallet to confirm it; on the network; through;
 * turned down in the wallet; or failed some other way.
 */
export type SendStage = 'form' | 'confirm' | 'sending' | 'done' | 'rejected' | 'failed';

interface TransferState {
  hash?: string;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}

export function sendStage(isSubmitted: boolean, transfer: TransferState): SendStage {
  if (!isSubmitted) {
    return 'form';
  }
  if (transfer.error) {
    return isWalletRefusal(transfer.error) ? 'rejected' : 'failed';
  }
  if (transfer.isSuccess) {
    return 'done';
  }
  return transfer.hash || transfer.isConfirming ? 'sending' : 'confirm';
}
