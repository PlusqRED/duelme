import type { TranslationKey } from '@/i18n/translations';
import { collectErrorDetails } from '@/lib/errorDetails';
import { classifyFlowError, rawErrorText, type FlowErrorKind } from '@/lib/flowError';
import { RelayRequestError } from '@/lib/relayApi';
import type { RelayErrorCode } from '@/lib/relayRequest';

/**
 * Why a transfer from the wallet menu stopped, as the menu words it. The signing window's kinds
 * (`flowError.ts`) where a transfer can meet them, and the transfer's own:
 * - `used`: today's relayed transfer has already gone out;
 * - `day`: the authorization was signed for another UTC day than the relayer's;
 * - `balance`: the wallet holds less USDT than it sends;
 * - `eth`: the wallet, paying the fee itself, holds too little ETH for it;
 * - `signature`: USDT would not take the wallet's signature (an EIP-7702 wallet, through ERC-1271).
 */
export type SendErrorKind =
  | 'rejected'
  | 'network'
  | 'used'
  | 'day'
  | 'balance'
  | 'eth'
  | 'budget'
  | 'unavailable'
  | 'pending'
  | 'limited'
  | 'lost'
  | 'signature'
  | 'gas'
  | 'reverted'
  | 'replaced'
  | 'walletNotReady'
  | 'error';

export interface SendError {
  kind: SendErrorKind;
  /** The error as the wallet, the relayer or the chain put it, for the details under the message. */
  detail: string | null;
  /**
   * Whether trying again can help. An answer that never came back may stand for a transfer that
   * went through, so the way on is to look at the balance, not to send again.
   */
  canRetry: boolean;
}

const RELAY_KINDS: Record<RelayErrorCode, SendErrorKind> = {
  TRANSFER_USED: 'used',
  TRANSFER_WRONG_DAY: 'day',
  INSUFFICIENT_BALANCE: 'balance',
  INVALID_SIGNATURE: 'signature',
  BUDGET_EXCEEDED: 'budget',
  RATE_LIMITED: 'limited',
  RELAY_PENDING: 'pending',
  RELAYER_UNAVAILABLE: 'unavailable',
  NOT_RELAYABLE: 'unavailable',
  EXECUTION_REVERTED: 'reverted',
  INVALID_REQUEST: 'error',
};

const FLOW_KINDS: Record<FlowErrorKind, SendErrorKind> = {
  rejected: 'rejected',
  network: 'network',
  budget: 'budget',
  unavailable: 'unavailable',
  pending: 'pending',
  limited: 'limited',
  lost: 'lost',
  // A token domain the app cannot rebuild: nothing about it is the player's to fix.
  permit: 'error',
  gas: 'gas',
  reverted: 'reverted',
  replaced: 'replaced',
  walletNotReady: 'walletNotReady',
  ownDuel: 'error',
  error: 'error',
};

/** How a node refuses a transaction whose sender cannot pay its gas. */
const NO_ETH_WORDS = ['insufficient funds'];

/** How USD₮0 (a string) and MockUSDT (OpenZeppelin's custom error) refuse more than the balance. */
const NO_USDT_WORDS = ['exceeds balance', 'erc20insufficientbalance'];

/**
 * The relayer's refusals after which the wallet pays itself, if it can: the relayer will not carry
 * this wallet's transfer now. A refusal the player can fix, and an answer lost, keep it relayed —
 * a lost one may have gone through, and the token refuses the day's second relayed transfer.
 */
const RELAY_DECLINES: ReadonlySet<SendErrorKind> = new Set(['budget', 'unavailable', 'signature', 'used']);

/** The kinds whose way on is ETH in the wallet, so it pays the fee itself. */
const ETH_FIXES: ReadonlySet<SendErrorKind> = new Set(['eth', 'used', 'budget', 'unavailable', 'signature']);

/** Whether the answer to this kind is ETH in the wallet: on the test network the faucet gives some. */
export function suggestsEth(kind: SendErrorKind): boolean {
  return ETH_FIXES.has(kind);
}

export interface ClassifySendContext {
  /** The network the transfer goes out on. */
  chainId: number;
  /** The wallet would not move to that network, so nothing was asked of it. */
  isNetworkSwitch?: boolean;
}

/** What went wrong with a transfer, from whatever the wallet, the relayer or the chain threw. */
export function classifySendError(error: unknown, { chainId, isNetworkSwitch = false }: ClassifySendContext): SendError {
  const detail = rawErrorText(error);
  const kind = sendErrorKind(error, chainId, isNetworkSwitch);
  return { kind, detail, canRetry: kind !== 'lost' };
}

/** Whether the relayer has said no to this wallet's transfer for now, so its own ETH should pay. */
export function isRelayDecline(error: unknown): boolean {
  return error instanceof RelayRequestError && RELAY_DECLINES.has(RELAY_KINDS[error.code]);
}

function sendErrorKind(error: unknown, chainId: number, isNetworkSwitch: boolean): SendErrorKind {
  if (error instanceof RelayRequestError) {
    return RELAY_KINDS[error.code];
  }
  const flowKind = classifyFlowError(error, { chainId, isNetworkSwitch }).kind;
  if (flowKind !== 'error' && flowKind !== 'reverted') {
    return FLOW_KINDS[flowKind];
  }
  const details = collectErrorDetails(error);
  if (details.some((line) => NO_ETH_WORDS.some((words) => line.includes(words)))) {
    return 'eth';
  }
  if (details.some((line) => NO_USDT_WORDS.some((words) => line.includes(words)))) {
    return 'balance';
  }
  return FLOW_KINDS[flowKind];
}

interface SendErrorWords {
  title: TranslationKey;
  text: TranslationKey;
}

/** Each kind's title and the text that says what to do about it. */
export const SEND_ERROR_WORDS: Record<SendErrorKind, SendErrorWords> = {
  rejected: { title: 'send.err.rejected.title', text: 'send.err.rejected.text' },
  network: { title: 'send.err.network.title', text: 'send.err.network.text' },
  used: { title: 'send.err.used.title', text: 'send.err.used.text' },
  day: { title: 'send.err.day.title', text: 'send.err.day.text' },
  balance: { title: 'send.err.balance.title', text: 'send.err.balance.text' },
  eth: { title: 'send.err.eth.title', text: 'send.err.eth.text' },
  budget: { title: 'send.err.budget.title', text: 'send.err.budget.text' },
  unavailable: { title: 'send.err.unavailable.title', text: 'send.err.unavailable.text' },
  pending: { title: 'send.err.pending.title', text: 'send.err.pending.text' },
  limited: { title: 'send.err.limited.title', text: 'send.err.limited.text' },
  lost: { title: 'send.err.lost.title', text: 'send.err.lost.text' },
  signature: { title: 'send.err.signature.title', text: 'send.err.signature.text' },
  gas: { title: 'send.err.gas.title', text: 'send.err.gas.text' },
  reverted: { title: 'send.err.reverted.title', text: 'send.err.reverted.text' },
  replaced: { title: 'send.err.replaced.title', text: 'send.err.replaced.text' },
  walletNotReady: { title: 'send.err.walletNotReady.title', text: 'send.err.walletNotReady.text' },
  error: { title: 'send.err.error.title', text: 'send.err.error.text' },
};
