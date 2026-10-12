import { type ContractConfig, getContractConfig } from '@/lib/contractConfig';
import { isDuelMessageValid } from '@/lib/duelMessage';

export interface WizardState {
  gameSlug: string;
  gameName: string;
  amount: string;
  message: string;
  isPublic: boolean;
}

export function isGameStepValid(state: Pick<WizardState, 'gameSlug'>): boolean {
  return state.gameSlug.length > 0;
}

// `config` defaults to the shared store. A component holding the live limits from
// useContractConfig passes them in: the store is only synced in an effect after that render.

export function isWagerStepValid(
  state: Pick<WizardState, 'amount'>,
  config: ContractConfig = getContractConfig()
): boolean {
  const numeric = parseFloat(state.amount);
  return Number.isFinite(numeric) && numeric >= config.minWager;
}

export function isTypeMessageStepValid(
  state: Pick<WizardState, 'message'>,
  config: ContractConfig = getContractConfig()
): boolean {
  return isDuelMessageValid(state.message, config);
}

export function isReviewStepValid(
  state: WizardState,
  config: ContractConfig = getContractConfig()
): boolean {
  return (
    isGameStepValid(state) &&
    isWagerStepValid(state, config) &&
    isTypeMessageStepValid(state, config)
  );
}
