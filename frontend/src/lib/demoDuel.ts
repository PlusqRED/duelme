import type { TranslationKey } from '@/i18n/translations';
import type { SafeTone, SeatSide } from '@/lib/duel';
import type { ReputationMark } from '@/lib/reputation';

/**
 * The landing's demo duel: a 10 USDT duel between two seats and the contract's safe, told in five
 * steps and three endings. Each step is a still of the whole stage; moving between two of them is
 * the hook's job (`useDemoDuel`).
 */

export type DemoOutcome = 'confirm' | 'dispute' | 'timeout';
export type DemoSay = 'won' | 'confirm' | 'dispute';

/** In USDT's smallest unit, like every amount in the app. */
export const DEMO_STAKE_RAW = 10_000_000n;
const START_RAW = 50_000_000n;
export const DEMO_LAST_STEP = 5;
export const DEMO_STEPS = [1, 2, 3, 4, 5] as const;
export const DEMO_OUTCOMES: readonly DemoOutcome[] = ['confirm', 'dispute', 'timeout'];

export interface DemoStage {
  wallets: Record<SeatSide, bigint>;
  /** That side's stake sits in the safe. */
  staked: Record<SeatSide, boolean>;
  /** The second seat is taken. */
  isJoined: boolean;
  /** The safe's lock is shut: from the second stake until the contract pays out. */
  isLocked: boolean;
  vault: SafeTone;
  isPlaying: boolean;
  says: Record<SeatSide, DemoSay | null>;
  /** The opponent's time to answer a reported win: running, or run out. */
  timer: 'running' | 'up' | null;
  marks: Record<SeatSide, ReputationMark[]>;
  /** The creator, the visitor's seat, won the pot. */
  hasWinner: boolean;
}

export interface DemoStatus {
  state: TranslationKey;
  tone: 'idle' | 'waiting' | 'locked' | 'confirm' | 'paid';
  desc: TranslationKey;
}

/** The stage at `step` (0 is before anything happens), ending as `outcome` at the last step. */
export function demoStage(step: number, outcome: DemoOutcome | null): DemoStage {
  const stage: DemoStage = {
    wallets: { creator: START_RAW, opponent: START_RAW },
    staked: { creator: false, opponent: false },
    isJoined: false,
    isLocked: false,
    vault: 'open',
    isPlaying: false,
    says: { creator: null, opponent: null },
    timer: null,
    marks: { creator: [], opponent: [] },
    hasWinner: false,
  };
  if (step >= 1) {
    stage.wallets.creator -= DEMO_STAKE_RAW;
    stage.staked.creator = true;
  }
  if (step >= 2) {
    stage.wallets.opponent -= DEMO_STAKE_RAW;
    stage.staked.opponent = true;
    stage.isJoined = true;
    stage.isLocked = true;
    stage.vault = 'locked';
  }
  stage.isPlaying = step === 3;
  if (step >= 4) {
    stage.says.creator = 'won';
    stage.timer = 'running';
  }
  return step === DEMO_LAST_STEP ? settle(stage, outcome ?? 'confirm') : stage;
}

/** The contract settles: the money leaves the safe, to the winner or back to each side. */
function settle(stage: DemoStage, outcome: DemoOutcome): DemoStage {
  const settled: DemoStage = {
    ...stage,
    wallets: { creator: START_RAW, opponent: START_RAW },
    staked: { creator: false, opponent: false },
    isLocked: false,
    vault: 'refunded',
    timer: null,
  };
  switch (outcome) {
    case 'confirm':
      return {
        ...settled,
        wallets: { creator: START_RAW + DEMO_STAKE_RAW, opponent: START_RAW - DEMO_STAKE_RAW },
        vault: 'paid',
        says: { ...stage.says, opponent: 'confirm' },
        marks: { creator: ['honored'], opponent: ['honored'] },
        hasWinner: true,
      };
    case 'dispute':
      return { ...settled, says: { ...stage.says, opponent: 'dispute' } };
    case 'timeout':
      return { ...settled, timer: 'up', marks: { creator: ['honored'], opponent: ['abandoned'] } };
  }
}

/**
 * The first beat of a move: the players act — someone joins, speaks or plays, or the time runs out —
 * while the money, the lock and the marks stay where they were until the contract moves them.
 */
export function actorsFirst(from: DemoStage, to: DemoStage): DemoStage {
  return {
    ...to,
    wallets: from.wallets,
    staked: from.staked,
    isLocked: from.isLocked,
    vault: from.vault,
    marks: from.marks,
    hasWinner: from.hasWinner,
  };
}

/** Whether a player does something visible in this move, which the money then waits for. */
export function hasActed(from: DemoStage, to: DemoStage): boolean {
  return (
    from.isJoined !== to.isJoined ||
    from.says.creator !== to.says.creator ||
    from.says.opponent !== to.says.opponent ||
    from.isPlaying !== to.isPlaying ||
    from.timer !== to.timer
  );
}

/** The USDT in the safe. */
export function vaultTotal(stage: DemoStage): bigint {
  return (stage.staked.creator ? DEMO_STAKE_RAW : 0n) + (stage.staked.opponent ? DEMO_STAKE_RAW : 0n);
}

const STEP_STATUS: Record<number, DemoStatus> = {
  0: { state: 'sim.state.0', tone: 'idle', desc: 'sim.desc.0' },
  1: { state: 'duel.waiting', tone: 'waiting', desc: 'sim.desc.1' },
  2: { state: 'duel.inProgress', tone: 'locked', desc: 'sim.desc.2' },
  3: { state: 'duel.inProgress', tone: 'locked', desc: 'sim.desc.3' },
  4: { state: 'duel.waitingConfirm', tone: 'confirm', desc: 'sim.desc.4' },
};

const OUTCOME_STATUS: Record<DemoOutcome, DemoStatus> = {
  confirm: { state: 'duel.resolved', tone: 'paid', desc: 'sim.desc.confirm' },
  dispute: { state: 'duel.disputed', tone: 'idle', desc: 'sim.desc.dispute' },
  timeout: { state: 'duel.responseTimedOut', tone: 'idle', desc: 'sim.desc.timeout' },
};

/** What the status line says about the stage: the duel's state, the same words the app uses for it. */
export function demoStatus(step: number, outcome: DemoOutcome | null): DemoStatus {
  return step === DEMO_LAST_STEP ? OUTCOME_STATUS[outcome ?? 'confirm'] : STEP_STATUS[step];
}
