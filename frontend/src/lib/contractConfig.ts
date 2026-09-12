import {
  CLAIM_TIMEOUT,
  MAX_DUEL_MESSAGE_BYTES,
  MAX_DUEL_MESSAGE_CHARACTERS,
  MIN_WAGER,
} from '@/lib/constants';

export interface ContractConfig {
  /** Minimum duel wager in display units (USDT) */
  minWager: number;
  /** Confirm/dispute window after a victory claim, in seconds */
  claimTimeout: number;
  /** Maximum duel message length in Unicode code points */
  maxMessageCharacters: number;
  /** Maximum duel message length in UTF-8 bytes */
  maxMessageBytes: number;
}

const DEFAULT_CONFIG: ContractConfig = {
  minWager: MIN_WAGER,
  claimTimeout: CLAIM_TIMEOUT,
  maxMessageCharacters: MAX_DUEL_MESSAGE_CHARACTERS,
  maxMessageBytes: MAX_DUEL_MESSAGE_BYTES,
};

// Module-level cache of the owner-adjustable on-chain parameters, so pure
// helpers (isWagerStepValid, isDuelClaimTimedOut, ...) can read the live
// values without threading them through every call site. Synced from the
// chain by useContractConfig (mounted app-wide in Providers); until the
// first read resolves the constants above serve as fallbacks.
let currentConfig: ContractConfig = DEFAULT_CONFIG;

export function getContractConfig(): ContractConfig {
  return currentConfig;
}

export function setContractConfig(next: Partial<ContractConfig>): void {
  currentConfig = { ...currentConfig, ...next };
}

export function resetContractConfig(): void {
  currentConfig = DEFAULT_CONFIG;
}
