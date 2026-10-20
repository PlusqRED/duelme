import type { SignItem } from '@/components/sign/signingModel';
import type { Translator } from '@/i18n/translate';
import type { GasKind } from '@/lib/gasNeeds';
import type { SignStep } from '@/lib/signPlan';
import type { WriteRoute } from '@/lib/writeRoute';

interface SignItemsOptions {
  plan: SignStep[];
  route: WriteRoute;
  /** The move in this action's words. */
  move: string;
  /** Which row of the gas table the move is. */
  moveGas: GasKind;
  /** The stake a permit or an approve allows, bare. */
  wager?: string;
  t: Translator['t'];
}

/** The plan in the window's words: the permit or approve for the stake, then the move, each saying what the wallet will call it. */
export function signItems({ plan, route, move, moveGas, wager = '', t }: SignItemsOptions): SignItem[] {
  return plan.map((step): SignItem => {
    if (step.part === 'permit') {
      return { ...step, text: t('sign.permit', { wager }), sub: t('sign.permit.sub', { wager }), gas: moveGas };
    }
    if (step.part === 'approve') {
      return { ...step, text: t('sign.approve', { wager }), sub: t('sign.approve.sub', { wager }), gas: 'approve' };
    }
    return { ...step, text: move, sub: t(route === 'relay' ? 'sign.move.sub' : 'sign.move.sub.self'), gas: moveGas };
  });
}
