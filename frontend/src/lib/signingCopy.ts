import type { IconName } from '@/components/ui/iconPaths';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import type { ActionFlowConfig, ActionFlowSummaryContext } from '@/lib/actionFlow';
import type { FlowErrorKind } from '@/lib/flowError';

/** Every move the signing window words, by what it does for the player rather than by contract call. */
export type SignAction =
  | 'create'
  | 'join'
  | 'decline'
  | 'cancel'
  | 'won'
  | 'lost'
  | 'callOff'
  | 'withdraw'
  | 'agree'
  | 'keepPlaying'
  | 'confirm'
  | 'dispute'
  | 'takeBack'
  | 'claimWin'
  | 'collect';

/** What a move says in the window, each part a key of its own. */
export interface ActionCopy {
  icon: IconName;
  /** Winnings: the sun tile and the sun button, the trophy on Done. */
  sun: boolean;
  title: TranslationKey;
  caption: TranslationKey;
  move: TranslationKey;
  /** The move as it reads when it also closes a duel whose time ran out. */
  timeoutMove?: TranslationKey;
  button: TranslationKey;
  doneTitle: TranslationKey;
  doneText: TranslationKey;
  /** The way out, on an error and once it is done. */
  back: TranslationKey;
  /** The contract's refusal in this move's own words. */
  reverted?: TranslationKey;
}

function copy(
  icon: IconName,
  keys: Omit<ActionCopy, 'icon' | 'sun' | 'back'> & { sun?: boolean; back?: TranslationKey }
): ActionCopy {
  return { icon, sun: false, back: 'sign.back', ...keys };
}

export const ACTION_COPY: Record<SignAction, ActionCopy> = {
  create: copy('plus', {
    title: 'sign.create.title',
    caption: 'sign.create.caption',
    move: 'sign.create.move',
    button: 'sign.create.button',
    doneTitle: 'sign.create.done.title',
    doneText: 'sign.create.done.text',
    back: 'sign.create.back',
    reverted: 'sign.create.err.reverted.text',
  }),
  join: copy('lock', {
    title: 'sign.join.title',
    caption: 'sign.join.caption',
    move: 'sign.join.move',
    button: 'sign.join.button',
    doneTitle: 'sign.join.done.title',
    doneText: 'sign.join.done.text',
  }),
  decline: copy('x', {
    title: 'sign.decline.title',
    caption: 'sign.decline.caption',
    move: 'sign.decline.move',
    button: 'sign.decline.button',
    doneTitle: 'sign.decline.done.title',
    doneText: 'sign.decline.done.text',
  }),
  cancel: copy('x', {
    title: 'sign.cancel.title',
    caption: 'sign.cancel.caption',
    move: 'sign.cancel.move',
    button: 'sign.cancel.button',
    doneTitle: 'sign.cancel.done.title',
    doneText: 'sign.cancel.done.text',
  }),
  won: copy('trophy', {
    title: 'sign.won.title',
    caption: 'sign.won.caption',
    move: 'sign.won.move',
    button: 'sign.won.button',
    doneTitle: 'sign.won.done.title',
    doneText: 'sign.won.done.text',
  }),
  lost: copy('flag', {
    title: 'sign.lost.title',
    caption: 'sign.lost.caption',
    move: 'sign.lost.move',
    button: 'sign.lost.button',
    doneTitle: 'sign.lost.done.title',
    doneText: 'sign.lost.done.text',
  }),
  callOff: copy('pause', {
    title: 'sign.callOff.title',
    caption: 'sign.callOff.caption',
    move: 'sign.callOff.move',
    button: 'sign.callOff.button',
    doneTitle: 'sign.callOff.done.title',
    doneText: 'sign.callOff.done.text',
  }),
  withdraw: copy('undo', {
    title: 'sign.withdraw.title',
    caption: 'sign.withdraw.caption',
    move: 'sign.withdraw.move',
    button: 'sign.withdraw.button',
    doneTitle: 'sign.withdraw.done.title',
    doneText: 'sign.withdraw.done.text',
  }),
  agree: copy('check', {
    title: 'sign.agree.title',
    caption: 'sign.agree.caption',
    move: 'sign.agree.move',
    button: 'sign.agree.button',
    doneTitle: 'sign.agree.done.title',
    doneText: 'sign.agree.done.text',
  }),
  keepPlaying: copy('gamepad', {
    title: 'sign.keepPlaying.title',
    caption: 'sign.keepPlaying.caption',
    move: 'sign.keepPlaying.move',
    button: 'sign.keepPlaying.button',
    doneTitle: 'sign.keepPlaying.done.title',
    doneText: 'sign.keepPlaying.done.text',
  }),
  confirm: copy('check', {
    title: 'sign.confirm.title',
    caption: 'sign.confirm.caption',
    move: 'sign.confirm.move',
    button: 'sign.confirm.button',
    doneTitle: 'sign.confirm.done.title',
    doneText: 'sign.confirm.done.text',
  }),
  dispute: copy('x', {
    title: 'sign.dispute.title',
    caption: 'sign.dispute.caption',
    move: 'sign.dispute.move',
    button: 'sign.dispute.button',
    doneTitle: 'sign.dispute.done.title',
    doneText: 'sign.dispute.done.text',
  }),
  takeBack: copy('undo', {
    title: 'sign.takeBack.title',
    caption: 'sign.takeBack.caption',
    move: 'sign.takeBack.move',
    timeoutMove: 'sign.takeBack.timeout.move',
    button: 'sign.takeBack.button',
    doneTitle: 'sign.takeBack.done.title',
    doneText: 'sign.takeBack.done.text',
  }),
  claimWin: copy('wallet', {
    sun: true,
    title: 'sign.claimWin.title',
    caption: 'sign.claimWin.caption',
    move: 'sign.claimWin.move',
    button: 'sign.claimWin.button',
    doneTitle: 'sign.claimWin.done.title',
    doneText: 'sign.claimWin.done.text',
  }),
  collect: copy('wallet', {
    title: 'sign.collect.title',
    caption: 'sign.collect.caption',
    move: 'sign.collect.move',
    timeoutMove: 'sign.collect.timeout.move',
    button: 'sign.collect.button',
    doneTitle: 'sign.collect.done.title',
    doneText: 'sign.collect.done.text',
    back: 'sign.collect.back',
    reverted: 'sign.collect.err.reverted.text',
  }),
};

/** "12.5 USDT" → "12.5": the page hands amounts over with their unit, the copy puts its own. */
export function bareAmount(display: string): string {
  return display.replace(/\s*USDT$/u, '').trim();
}

/**
 * Which move a duel action is in the window's words. A payout is the winnings when it is the whole
 * pot, and a stake coming back otherwise; refunding and paying out at once closes a timed-out duel.
 */
export function signActionOf(config: ActionFlowConfig, context: ActionFlowSummaryContext): SignAction {
  switch (config.type) {
    case 'claimVictory':
      return 'won';
    case 'admitDefeat':
      return 'lost';
    case 'confirmResult':
      return 'confirm';
    case 'disputeResult':
      return 'dispute';
    case 'requestMutualCancellation':
      return 'callOff';
    case 'withdrawMutualCancellation':
      return 'withdraw';
    case 'acceptMutualCancellation':
      return 'agree';
    case 'declineMutualCancellation':
      return 'keepPlaying';
    case 'declineDuel':
      return 'decline';
    case 'cancelDuel':
      return 'cancel';
    case 'claimPayout':
      return context.claimableDisplay !== '' && context.claimableDisplay === context.formattedPot ? 'claimWin' : 'takeBack';
    case 'refundAndClaim':
      return 'takeBack';
    case 'refundAndClaimAll':
      return 'collect';
  }
}

/** Whether the action also closes a duel whose time to answer ran out, which its signature then says. */
export function closesTimedOutDuel(config: ActionFlowConfig): boolean {
  return config.type === 'refundAndClaim' || config.batch?.closesTimedOut === true;
}

/** The values a duel action's copy fills in, from what the page knows about the duel. */
export function actionCopyParams(context: ActionFlowSummaryContext, config: ActionFlowConfig): TranslationParams {
  const amount = bareAmount(config.batch?.totalDisplay || context.claimableDisplay || context.formattedWager);
  return {
    id: context.duelId,
    wager: bareAmount(context.formattedWager),
    pot: bareAmount(context.formattedPot),
    other: context.opponentDisplay,
    amount,
    network: context.chainName,
    count: config.batch?.count ?? 1,
  };
}

interface ErrorWords {
  title: TranslationKey;
  text: TranslationKey;
}

const ERROR_WORDS: Record<FlowErrorKind, ErrorWords> = {
  rejected: { title: 'sign.err.rejected.title', text: 'sign.err.rejected.text' },
  network: { title: 'sign.err.network.title', text: 'sign.err.network.text' },
  budget: { title: 'sign.err.budget.title', text: 'sign.err.budget.text' },
  unavailable: { title: 'sign.err.unavailable.title', text: 'sign.err.unavailable.text' },
  pending: { title: 'sign.err.pending.title', text: 'sign.err.pending.text' },
  limited: { title: 'sign.err.limited.title', text: 'sign.err.limited.text' },
  permit: { title: 'sign.err.permit.title', text: 'sign.err.permit.text' },
  gas: { title: 'sign.err.gas.title', text: 'sign.err.gas.text' },
  reverted: { title: 'sign.err.reverted.title', text: 'sign.err.reverted.text' },
  replaced: { title: 'sign.err.replaced.title', text: 'sign.err.replaced.text' },
  walletNotReady: { title: 'sign.err.walletNotReady.title', text: 'sign.err.walletNotReady.text' },
  ownDuel: { title: 'sign.err.ownDuel.title', text: 'sign.err.ownDuel.text' },
  error: { title: 'sign.err.error.title', text: 'sign.err.error.text' },
};

/**
 * How the window words a stopped step: a move may word the contract's refusal its own way, and a
 * transaction the wallet would have sent itself was not sent rather than not signed. Every stop
 * leaves the money where it was, except a replaced transaction: what replaced it is the wallet's.
 */
export function errorWords(kind: FlowErrorKind, action: ActionCopy, sentByWallet: boolean): ErrorWords & { isSafe: boolean } {
  const words = ERROR_WORDS[kind];
  return {
    title: kind === 'rejected' && sentByWallet ? 'sign.err.rejected.self.title' : words.title,
    text: kind === 'reverted' && action.reverted ? action.reverted : words.text,
    isSafe: kind !== 'replaced',
  };
}
