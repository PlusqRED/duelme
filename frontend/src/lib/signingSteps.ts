import type { FailedWhile, FlowActionState } from '@/lib/flowSession';
import type { WriteRoute } from '@/lib/writeRoute';

/**
 * Where a signing flow stands, whatever its own stages are called: the check, the network switch,
 * the approve, the write itself (the move, the join, the create), or done.
 */
export type FlowPlace = 'review' | 'switch-network' | 'approve' | 'write' | 'success';

/** A step on the window's rail. Relayed, the write is signed and then sent; self-paid, it is sent. */
export type RailStep = 'check' | 'network' | 'approve' | 'sign' | 'confirm' | 'send' | 'done';

export type RailStatus = 'done' | 'current' | 'error' | 'next';

/** On a step that needs the wallet: not asked yet, asked in the wallet, or on its way through the network. */
export type StepPhase = 'idle' | 'wallet' | 'chain';

/** The step the window shows and how far along it is; `failed` when it stopped there. */
export interface SigningSpot {
  step: RailStep;
  phase: StepPhase;
  failed: boolean;
}

interface SpotInput {
  place: FlowPlace;
  actionState: FlowActionState;
  failedWhile: FailedWhile | null;
  route: WriteRoute;
}

const PHASES: Record<FlowActionState, StepPhase> = {
  idle: 'idle',
  'awaiting-wallet': 'wallet',
  confirming: 'chain',
  error: 'idle',
};

/**
 * The rail step a flow is on. A relayed write is two steps to the player — signing it, then DuelMe
 * sending it — so the network's part of it is a step of its own, and a failure lands on whichever of
 * the two it happened in. A self-paid transaction is one step, in the wallet and then on the chain.
 */
export function signingSpot({ place, actionState, failedWhile, route }: SpotInput): SigningSpot {
  const failed = actionState === 'error';
  const phase = failed ? (failedWhile === 'confirming' ? 'chain' : 'wallet') : PHASES[actionState];

  switch (place) {
    case 'review':
      return { step: 'check', phase: 'idle', failed };
    case 'switch-network':
      return { step: 'network', phase, failed };
    case 'approve':
      return { step: 'approve', phase, failed };
    case 'success':
      return { step: 'done', phase: 'idle', failed: false };
    case 'write':
      if (route === 'self') {
        return { step: 'send', phase, failed };
      }
      return { step: phase === 'chain' ? 'confirm' : 'sign', phase, failed };
  }
}

/**
 * The rail: Check, the network only when the wallet was elsewhere, the approve only for a stake the
 * wallet funds itself while its allowance is short, then the write's own steps and Done.
 */
export function railSteps(options: { route: WriteRoute; showNetwork: boolean; showApprove: boolean }): RailStep[] {
  const steps: RailStep[] = ['check'];
  if (options.showNetwork) {
    steps.push('network');
  }
  if (options.route === 'self') {
    if (options.showApprove) {
      steps.push('approve');
    }
    steps.push('send');
  } else {
    steps.push('sign', 'confirm');
  }
  steps.push('done');
  return steps;
}

/** Each rail step's status: the ones behind the spot done, the spot current or failed, the rest next. */
export function railStatuses(steps: readonly RailStep[], spot: SigningSpot): RailStatus[] {
  const at = steps.indexOf(spot.step);
  return steps.map((step, index) => {
    if (index < at) {
      return 'done';
    }
    if (index > at) {
      return 'next';
    }
    if (spot.failed) {
      return 'error';
    }
    return step === 'done' ? 'done' : 'current';
  });
}

/** Whether the window may close: not while the wallet or the network still works on the step. */
export function isBusy(spot: SigningSpot): boolean {
  return !spot.failed && spot.phase !== 'idle';
}
