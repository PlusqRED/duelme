import type { TranslationKey } from '@/i18n/translations';
import { DuelState, type Duel } from '@/lib/contracts';
import { isDuelFullySettled } from '@/lib/duel';

/**
 * Where a duel is, as its page tells it: the contract's state, except that a reported win whose
 * time to answer has run out is `timeout`. The contract still says WinnerClaimed then, and only the
 * clock tells the two apart.
 */
export type DuelPhase =
  | 'created'
  | 'funded'
  | 'cancelReq'
  | 'claimed'
  | 'timeout'
  | 'resolved'
  | 'refunded'
  | 'disputed'
  | 'mutual'
  | 'cancelled'
  | 'declined';

/** The phases that end with no winner: each player's own stake goes back to them. */
export const RETURNING_PHASES: ReadonlySet<DuelPhase> = new Set(['refunded', 'disputed', 'mutual', 'cancelled', 'declined']);

const phases: Record<Exclude<DuelState, DuelState.Nonexistent>, DuelPhase> = {
  [DuelState.Created]: 'created',
  [DuelState.Funded]: 'funded',
  [DuelState.WinnerClaimed]: 'claimed',
  [DuelState.Resolved]: 'resolved',
  [DuelState.Refunded]: 'refunded',
  [DuelState.Cancelled]: 'cancelled',
  [DuelState.Declined]: 'declined',
  [DuelState.Disputed]: 'disputed',
  [DuelState.MutualCancelRequested]: 'cancelReq',
  [DuelState.MutuallyCancelled]: 'mutual',
};

/** The seconds left at `now` to answer a reported win, never below zero; zero when nobody reported one. */
export function secondsToAnswer(duel: Pick<Duel, 'claimTimestamp'>, now: number, claimTimeout: number): number {
  if (duel.claimTimestamp === 0n) return 0;
  return Math.max(0, Number(duel.claimTimestamp) + claimTimeout - now);
}

/** The duel's phase at `now`, in seconds. A duel nobody created has none: its page says it was not found. */
export function duelPhase(duel: Pick<Duel, 'state' | 'claimTimestamp'>, now: number, claimTimeout: number): DuelPhase {
  if (duel.state === DuelState.Nonexistent) {
    throw new Error('A duel nobody created has no phase');
  }
  if (duel.state === DuelState.WinnerClaimed && secondsToAnswer(duel, now, claimTimeout) === 0) {
    return 'timeout';
  }
  return phases[duel.state];
}

type PayoutFields = Pick<Duel, 'creatorPayout' | 'opponentPayout' | 'creatorClaimed' | 'opponentClaimed'>;

export interface PhaseLabel {
  key: TranslationKey;
  /** The colour of what the duel is waiting on. */
  tone: 'waiting' | 'live' | 'paused' | 'confirm' | 'late' | 'paid' | 'back';
  /** A player has to act now, so the label pulses. */
  isLive: boolean;
}

const labels: Record<DuelPhase, PhaseLabel> = {
  created: { key: 'duel.waiting', tone: 'waiting', isLive: false },
  funded: { key: 'duel.inProgress', tone: 'live', isLive: true },
  cancelReq: { key: 'duel.cancellationPending', tone: 'paused', isLive: false },
  claimed: { key: 'duel.waitingConfirm', tone: 'confirm', isLive: true },
  timeout: { key: 'duel.responseTimedOut', tone: 'late', isLive: false },
  resolved: { key: 'duel.resolved', tone: 'paid', isLive: false },
  refunded: { key: 'room.state.refunded', tone: 'back', isLive: false },
  disputed: { key: 'duel.disputed', tone: 'back', isLive: false },
  mutual: { key: 'duel.mutuallyCancelled', tone: 'back', isLive: false },
  cancelled: { key: 'duel.cancelled', tone: 'back', isLive: false },
  declined: { key: 'duel.declined', tone: 'back', isLive: false },
};

/**
 * The duel's state as its page heads it. A refunded duel says its refunds are open while a stake
 * still waits in the contract, and that it was refunded once both are taken.
 */
export function phaseLabel(duel: PayoutFields, phase: DuelPhase): PhaseLabel {
  if (phase === 'refunded' && isDuelFullySettled(duel)) {
    return { ...labels.refunded, key: 'duel.refunded' };
  }
  return labels[phase];
}

export interface DuelStep {
  kind: 'done' | 'current' | 'todo' | 'skipped' | 'end';
  label: TranslationKey;
  /** The current step: waiting on someone, against the clock, or paused by the players. */
  mode?: 'waiting' | 'timed' | 'paused';
  /** A step that ended the duel: paid to the winner, stakes going back, or time run out. */
  tone?: 'paid' | 'back' | 'late';
}

const STEP_LABELS: readonly TranslationKey[] = ['sim.step.1', 'sim.step.2', 'sim.step.3', 'sim.step.4', 'sim.step.5'];

/** The five steps of a duel not created yet: the create page is the first of them. */
export function draftSteps(): DuelStep[] {
  return STEP_LABELS.map((label, index) => ({ kind: index === 0 ? 'current' : 'todo', label }));
}

/**
 * The landing demo's five steps, Create to Outcome, for this duel: those done, the one it is on,
 * those it skipped, and the last one named after how it ended. A win says Paid out only once the
 * winner has taken the pot.
 */
export function duelSteps(duel: PayoutFields, phase: DuelPhase): DuelStep[] {
  const steps: DuelStep[] = STEP_LABELS.map((label) => ({ kind: 'todo', label }));
  const markDone = (count: number) => steps.slice(0, count).forEach((step) => (step.kind = 'done'));
  const markSkipped = (from: number) => steps.slice(from, 4).forEach((step) => (step.kind = 'skipped'));
  const current = (index: number, mode: DuelStep['mode']) => (steps[index] = { ...steps[index], kind: 'current', mode });
  const end = (index: number, label: TranslationKey, tone: DuelStep['tone']) => (steps[index] = { kind: 'end', label, tone });

  switch (phase) {
    case 'created':
      markDone(1);
      current(1, 'waiting');
      break;
    case 'funded':
    case 'cancelReq':
      markDone(2);
      current(2, phase === 'cancelReq' ? 'paused' : 'waiting');
      break;
    case 'claimed':
      markDone(3);
      current(3, 'timed');
      break;
    case 'timeout':
      markDone(3);
      end(3, 'room.step.timeUp', 'late');
      steps[4] = { kind: 'current', mode: 'waiting', label: 'room.step.refunded' };
      break;
    case 'refunded':
      markDone(3);
      end(3, 'room.step.timeUp', 'late');
      end(4, 'room.step.refunded', 'back');
      break;
    case 'resolved':
      markDone(4);
      end(4, isDuelFullySettled(duel) ? 'room.step.paid' : 'room.step.won', 'paid');
      break;
    case 'disputed':
      markDone(4);
      end(4, 'room.step.disputed', 'back');
      break;
    case 'mutual':
      markDone(3);
      markSkipped(3);
      end(4, 'room.step.calledOff', 'back');
      break;
    case 'cancelled':
    case 'declined':
      markDone(1);
      markSkipped(1);
      end(4, phase === 'cancelled' ? 'room.step.cancelled' : 'room.step.declined', 'back');
      break;
  }
  return steps;
}
