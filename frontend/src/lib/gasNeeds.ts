import { formatUnits } from 'viem';
import type { Language } from '@/i18n/translations';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import {
  ARBITRUM_SEPOLIA_APPROVE_MIN_GAS,
  ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS,
  ARBITRUM_SEPOLIA_DEFAULT_MIN_GAS,
  getBufferedMainnetGasLimit,
  getBufferedTestnetFeeParams,
  getBufferedTestnetGasLimit,
  getMainnetFeeParams,
} from '@/lib/testnetGas';
import { isDecimal, perLanguage } from '@/lib/utils';

/**
 * The gas each kind of duel transaction took on dev (the latest create, join and claimVictory, and
 * MockUSDT's approve, read 2026-10-17). A table rather than an estimate, because a create cannot be
 * estimated before its approve: the call would revert on the missing allowance.
 */
const TYPICAL_GAS = { approve: 46_724n, create: 172_195n, join: 93_702n, move: 96_407n } as const;

export type GasKind = keyof typeof TYPICAL_GAS;

/** The most the app offers per gas, as it will set it on the transaction, and what the network charges now. */
export interface FeeQuote {
  maxFeePerGas: bigint;
  gasPrice: bigint;
}

interface FeeEstimate {
  gasPrice?: bigint | null;
  maxFeePerGas?: bigint | null;
  maxPriorityFeePerGas?: bigint | null;
}

const isSepolia = (chainId: number) => chainId === SUPPORTED_CHAINS.arbitrumSepolia.id;

/** The fees the app's writes will carry on `chainId`, by the same rules as `buildTransactionParams`. */
export function quoteFees(chainId: number, estimate: FeeEstimate, baseFeePerGas: bigint | null | undefined): FeeQuote {
  const offered = isSepolia(chainId)
    ? getBufferedTestnetFeeParams(estimate, baseFeePerGas)
    : getMainnetFeeParams(estimate, baseFeePerGas);
  const charged = baseFeePerGas === null || baseFeePerGas === undefined ? offered.maxFeePerGas : baseFeePerGas + offered.maxPriorityFeePerGas;
  return { maxFeePerGas: offered.maxFeePerGas, gasPrice: charged < offered.maxFeePerGas ? charged : offered.maxFeePerGas };
}

/** The gas limit the app sets for it: the same buffers, and on the test network the same floors, as its writes. */
export function gasLimitFor(kind: GasKind, chainId: number): bigint {
  if (!isSepolia(chainId)) {
    return getBufferedMainnetGasLimit(TYPICAL_GAS[kind]);
  }
  const floor =
    kind === 'approve' ? ARBITRUM_SEPOLIA_APPROVE_MIN_GAS : kind === 'create' ? ARBITRUM_SEPOLIA_CREATE_DUEL_MIN_GAS : ARBITRUM_SEPOLIA_DEFAULT_MIN_GAS;
  return getBufferedTestnetGasLimit(TYPICAL_GAS[kind], floor);
}

/** What a transaction of this kind costs at the network's price now: the fee a player should expect. */
export function expectedFee(kind: GasKind, quote: FeeQuote): bigint {
  return TYPICAL_GAS[kind] * quote.gasPrice;
}

/**
 * The ETH the wallet must hold before the node takes these transactions: each one's gas limit at the
 * most the app offers per gas. Far above what they end up costing, but a wallet with less is refused
 * at sending, after the player has already confirmed.
 */
export function ethNeeded(kinds: readonly GasKind[], chainId: number, quote: FeeQuote): bigint {
  return kinds.reduce((sum, kind) => sum + gasLimitFor(kind, chainId) * quote.maxFeePerGas, 0n);
}

const feeFormats = perLanguage((locale) => new Intl.NumberFormat(locale, { maximumSignificantDigits: 1 }));
const needFormats = perLanguage((locale) => new Intl.NumberFormat(locale, { maximumSignificantDigits: 1, roundingMode: 'ceil' }));
const balanceFormats = perLanguage((locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 6, roundingMode: 'floor' }));

/** A network fee to one significant figure, which is all a fee of 0.0000009 ETH needs: `0.0000009`. */
export function formatEthFee(wei: bigint, language: Language): string {
  return feeFormats[language].format(ethDecimal(wei));
}

/** The ETH a wallet must hold, rounded up so that holding the amount shown is enough: `0.00002`. */
export function formatEthNeed(wei: bigint, language: Language): string {
  return needFormats[language].format(ethDecimal(wei));
}

/** An ETH balance beside a fee, to six decimals rounded down, so it never reads as more than the wallet holds. */
export function formatEthBalance(wei: bigint, language: Language): string {
  return balanceFormats[language].format(ethDecimal(wei));
}

// A decimal string, not a float, so Intl formats the exact amount.
function ethDecimal(wei: bigint): `${number}` {
  const decimal = formatUnits(wei, 18);
  if (!isDecimal(decimal)) {
    throw new Error(`Not a decimal amount: ${decimal}`);
  }
  return decimal;
}
