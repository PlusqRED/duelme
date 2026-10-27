import { isAddress, parseUnits } from 'viem';
import { USDT_DECIMALS } from '@/lib/constants';
import type { WriteRoute } from '@/lib/writeRoute';

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
  /** Who would pay the transfer's fee now: DuelMe's relayer, or the wallet in ETH. */
  route: WriteRoute;
}

export interface Transfer {
  to: `0x${string}`;
  /** In USDT's smallest unit. */
  raw: bigint;
  /** Who pays its fee, fixed when the form was sent, so the transfer goes the way the form said. */
  route: WriteRoute;
}

/**
 * Whether the wallet's relayed transfer for today is still there: `off` on a network DuelMe does
 * not relay on, `unknown` while it is being read.
 */
export type FreeTransferStatus = 'off' | 'unknown' | 'available' | 'used';

/**
 * Who sends a transfer. DuelMe's relayer pays the fee of one a day per wallet, the first of the
 * day, and the wallet pays every other in ETH, as before. The wallet also takes over once the
 * relayed way has failed for it with nothing sent (its daily gas budget, the relayer down, a
 * signature USDT will not take), so the form asks for the ETH that fee needs rather than promise
 * one the relayer will not pay. A status still being read goes to the relayer, which answers for
 * itself.
 */
export function resolveSendRoute(free: FreeTransferStatus, isRelayDeclined: boolean): WriteRoute {
  return free === 'off' || free === 'used' || isRelayDeclined ? 'self' : 'relay';
}

/** What stops a transfer, by field. Nothing in it means it may go to the wallet. */
export interface SendProblems {
  to?: 'address' | 'self';
  amount?: 'empty' | 'tooMuch';
  eth?: 'none';
}

export interface TransferCheck {
  problems: SendProblems;
  /** The transfer the draft asks for, or null while something stops it. */
  transfer: Transfer | null;
}

/**
 * Checks a transfer before the wallet sees it. A balance that is not known yet stops nothing: the
 * wallet's own estimate catches what this cannot.
 */
export function checkTransfer(draft: SendDraft, wallet: SendWallet): TransferCheck {
  const problems: SendProblems = {};
  const typedTo = draft.to.trim();
  const to = isAddress(typedTo, { strict: false }) ? typedTo : null;
  if (to === null) {
    problems.to = 'address';
  } else if (to.toLowerCase() === wallet.address.toLowerCase()) {
    problems.to = 'self';
  }

  const raw = parseUsdtAmount(draft.amount);
  if (raw === null || raw === 0n) {
    problems.amount = 'empty';
  } else if (wallet.usdtRaw !== null && raw > wallet.usdtRaw) {
    problems.amount = 'tooMuch';
  }

  if (wallet.route === 'self' && wallet.ethWei === 0n) {
    problems.eth = 'none';
  }
  const isClear = Object.keys(problems).length === 0;
  return { problems, transfer: isClear && to !== null && raw !== null ? { to, raw, route: wallet.route } : null };
}

/**
 * Where a sent transfer is: waiting for the wallet to confirm it; on the network; through; or
 * stopped, for whatever reason its failure gives.
 */
export type SendStage = 'confirm' | 'sending' | 'done' | 'failed';

interface TransferState {
  hash?: string;
  isConfirming: boolean;
  isSuccess: boolean;
  failure: unknown;
}

export function sendStage(transfer: TransferState): SendStage {
  if (transfer.failure) {
    return 'failed';
  }
  if (transfer.isSuccess) {
    return 'done';
  }
  return transfer.hash || transfer.isConfirming ? 'sending' : 'confirm';
}
