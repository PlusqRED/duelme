import { BaseError, ContractFunctionRevertedError, ExecutionRevertedError } from 'viem';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import { nameCustomErrors, quotesCustomError } from '@/lib/customErrors';
import { collectErrorDetails, isWalletRefusal } from '@/lib/errorDetails';
import { PermitDomainMismatchError } from '@/lib/permitSignature';
import { RelayAnswerLostError, RelayRequestError } from '@/lib/relayApi';
import type { RelayErrorCode } from '@/lib/relayRequest';
import { TransactionReplacedError, TransactionRevertedError, WalletNotReadyError } from '@/lib/writeErrors';

/**
 * Why a step of a signing window stopped, as the window words it:
 * - `rejected`: turned down in the wallet;
 * - `network`: the wallet stayed on another network;
 * - `budget`, `unavailable`, `pending`, `limited`: the relay's refusals, by the code it answers with;
 * - `lost`: the relay's answer never came back, so the write may have gone through;
 * - `permit`: the token refused the wallet's permit (an EIP-7702 wallet, checked through ERC-1271);
 * - `gas`: the test network turned the fee down between the estimate and the send;
 * - `reverted`: the contract refused the call;
 * - `replaced`: the wallet cancelled the transaction or sent another with its nonce;
 * - `walletNotReady`: the wallet or its connection was not there yet;
 * - `ownDuel`: the wallet now signed in created the duel it is joining;
 * - `error`: anything nobody explains yet.
 */
export type FlowErrorKind =
  | 'rejected'
  | 'network'
  | 'budget'
  | 'unavailable'
  | 'pending'
  | 'limited'
  | 'lost'
  | 'permit'
  | 'gas'
  | 'reverted'
  | 'replaced'
  | 'walletNotReady'
  | 'ownDuel'
  | 'error';

export interface FlowError {
  kind: FlowErrorKind;
  /** The error as the wallet, the relay or the chain put it, for the details under the message. */
  detail: string | null;
  /**
   * Whether another go can help: the day's limit, the contract's no and a wallet without permits
   * give the same answer again, and a write that may have gone through must not be signed again.
   */
  canRetry: boolean;
}

const FINAL_KINDS: ReadonlySet<FlowErrorKind> = new Set(['budget', 'reverted', 'permit', 'ownDuel', 'lost']);

const RELAY_KINDS: Record<Exclude<RelayErrorCode, 'EXECUTION_REVERTED'>, FlowErrorKind> = {
  BUDGET_EXCEEDED: 'budget',
  RATE_LIMITED: 'limited',
  RELAY_PENDING: 'pending',
  // A signature the forwarder will not take and a call it will not relay both mean DuelMe
  // cannot send this one for the player, which is all the player needs to hear.
  RELAYER_UNAVAILABLE: 'unavailable',
  INVALID_SIGNATURE: 'unavailable',
  NOT_RELAYABLE: 'unavailable',
  INVALID_REQUEST: 'error',
};

/** How a node words a fee or a gas limit it would not take. */
const GAS_REFUSALS = [
  'intrinsic gas too low',
  'estimate gas too low',
  'gas too low',
  'max fee per gas less than block base fee',
];

// viem's "Execution reverted for an unknown reason." wraps what a node said about the send, such as
// a nonce it would not take, which is no word from the contract.
const REVERT_WORDS = /execution reverted(?! for an unknown reason)|reverted with the following (?:reason|signature)/;

/** viem's lines that repeat the call: its arguments, its calldata, and the RPC request that carried them. */
const CALL_LINES = ['args:', 'data:', 'Request body:'];

/** The longest raw message the details show; a viem dump can run to pages. */
const MAX_DETAIL_LENGTH = 1500;

export function flowError(kind: FlowErrorKind, detail: string | null = null): FlowError {
  return { kind, detail, canRetry: !FINAL_KINDS.has(kind) };
}

interface ClassifyContext {
  /** The network the step writes to: a fee refused on the test network is the test network's doing. */
  chainId: number;
  /** The step was the network switch, so whatever went wrong left the wallet where it was. */
  isNetworkSwitch?: boolean;
}

/** What went wrong with a step of a signing window, from whatever the wallet, the relay or the chain threw. */
export function classifyFlowError(error: unknown, { chainId, isNetworkSwitch = false }: ClassifyContext): FlowError {
  const detail = rawErrorText(error);
  if (isNetworkSwitch) {
    return flowError('network', detail);
  }
  if (error instanceof PermitDomainMismatchError) {
    return flowError('permit', detail);
  }
  if (error instanceof RelayAnswerLostError) {
    return flowError('lost', detail);
  }
  if (error instanceof RelayRequestError) {
    if (error.code !== 'EXECUTION_REVERTED') {
      return flowError(RELAY_KINDS[error.code], detail);
    }
    // DuelMe's own "Permit failed": the token refused the EIP-2612 signature. USD₮0 checks a
    // permit through ERC-1271 whenever the owner address has code, which an EIP-7702
    // delegation gives a plain EOA, so trying again never helps.
    return flowError(/permit failed/i.test(error.message) ? 'permit' : 'reverted', detail);
  }
  if (error instanceof TransactionRevertedError) {
    return flowError('reverted', detail);
  }
  if (error instanceof TransactionReplacedError) {
    return flowError('replaced', detail);
  }
  if (error instanceof WalletNotReadyError) {
    return flowError('walletNotReady', detail);
  }

  const details = collectErrorDetails(error);
  const isGasRefusal = details.some((line) => GAS_REFUSALS.some((pattern) => line.includes(pattern)));
  if (isGasRefusal) {
    // On a real network a refused fee is no quirk of the network: it stays unexplained.
    return flowError(isTestnet(chainId) ? 'gas' : 'error', detail);
  }
  if (isWalletRefusal(error)) {
    return flowError('rejected', detail);
  }
  if (details.some((line) => line.includes('permit failed'))) {
    return flowError('permit', detail);
  }
  if (isContractRevert(error, details)) {
    return flowError('reverted', detail);
  }
  return flowError('error', detail);
}

function isTestnet(chainId: number): boolean {
  return Object.values(SUPPORTED_CHAINS).some((chain) => chain.id === chainId && chain.testnet);
}

function isContractRevert(error: unknown, details: readonly string[]): boolean {
  const revert =
    error instanceof BaseError &&
    error.walk((cause) => cause instanceof ContractFunctionRevertedError || cause instanceof ExecutionRevertedError);
  return !!revert || details.some((line) => REVERT_WORDS.test(line) || quotesCustomError(line));
}

/**
 * The error in the words it came with, for a player to copy and send on: the contract's reason,
 * the node's or the relay's message, an HTTP failure with its status. viem's own summary and its
 * lines of context, without the call itself (its arguments, its calldata, the request that carried
 * it): a join's or a decline's hold the private duel's invite secret, and the player is asked to send
 * these details on. Custom errors by name.
 */
export function rawErrorText(error: unknown): string | null {
  const text = describe(error)?.trim();
  if (!text) {
    return null;
  }
  const named = nameCustomErrors(text);
  return named.length > MAX_DETAIL_LENGTH ? `${named.slice(0, MAX_DETAIL_LENGTH)}…` : named;
}

function describe(error: unknown): string | undefined {
  if (error instanceof TransactionRevertedError) {
    return error.reason ? `execution reverted: ${error.reason}` : error.message;
  }
  if (error instanceof BaseError) {
    // Once a custom error is named, viem's advice on decoding its selector is beside the point.
    const lines = quotesCustomError(error.shortMessage) ? [error.shortMessage] : [error.shortMessage, ...(error.metaMessages ?? [])];
    if (error.details && !lines.some((line) => line.includes(error.details))) {
      lines.push(error.details);
    }
    return lines
      .flatMap((line) => line.split('\n'))
      .map((line) => line.trim())
      .filter((line) => line && !CALL_LINES.some((start) => line.startsWith(start)))
      .join('\n');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : undefined;
}
