import { MIN_WAGER } from '@/lib/constants';
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

export function isWagerStepValid(state: Pick<WizardState, 'amount'>): boolean {
  const numeric = parseFloat(state.amount);
  return Number.isFinite(numeric) && numeric >= MIN_WAGER;
}

export function isTypeMessageStepValid(state: Pick<WizardState, 'message'>): boolean {
  return isDuelMessageValid(state.message);
}

export function isReviewStepValid(state: WizardState): boolean {
  return (
    isGameStepValid(state) && isWagerStepValid(state) && isTypeMessageStepValid(state)
  );
}
