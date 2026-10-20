// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionFlowConfig } from '@/lib/actionFlow';
import { DuelState } from '@/lib/contracts';
import type { DuelPhase } from '@/lib/duelPhase';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const hooks = vi.hoisted(() => ({
  login: vi.fn(),
  openFlow: vi.fn(),
  actionFlow: null as unknown,
  joinFlow: null as unknown,
  duelActions: {
    claimPayout: vi.fn(),
    refundAndClaimPayouts: vi.fn(),
    claimVictory: vi.fn(),
    admitDefeat: vi.fn(),
    confirmResult: vi.fn(),
    disputeResult: vi.fn(),
    requestMutualCancellation: vi.fn(),
  },
  responses: {
    pending: 'idle' as string,
    isBusy: false,
    decline: vi.fn(),
    cancel: vi.fn(),
    acceptCancellation: vi.fn(),
    declineCancellation: vi.fn(),
    withdrawCancellation: vi.fn(),
  },
  handleOpenJoinFlow: vi.fn(),
}));

vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ login: hooks.login }) }));
vi.mock('@/hooks/useActionFlow', () => ({
  useActionFlow: () => hooks.actionFlow ?? { flow: null, openFlow: hooks.openFlow, duelActions: hooks.duelActions },
}));
vi.mock('@/hooks/useJoinDuelFlow', () => ({
  useJoinDuelFlow: () => hooks.joinFlow ?? { flow: null, handleOpenJoinFlow: hooks.handleOpenJoinFlow },
}));
vi.mock('@/hooks/useDuelResponses', () => ({ useDuelResponses: () => hooks.responses }));
vi.mock('@/hooks/useNicknames', () => ({ useNicknames: () => ({ resolveDisplay: () => 'Bo' }) }));

const { useDuelTurnActions } = await import('@/hooks/useDuelTurnActions');

const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const OPPONENT = '0x111111111111111111111111111111111111abcd' as const;
const openTopUp = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  hooks.responses.pending = 'idle';
  hooks.responses.isBusy = false;
  hooks.actionFlow = null;
  hooks.joinFlow = null;
});

function actions(phase: DuelPhase = 'funded') {
  const duel = duelView({ creator: CREATOR, opponent: OPPONENT, state: DuelState.WinnerClaimed });
  return renderHook(() =>
    useDuelTurnActions({ duelId: 7, duel, phase, inviteSecret: null, walletAddress: OPPONENT, refetch: vi.fn(async () => undefined), openTopUp })
  ).result.current;
}

/** The guided window `openFlow` was last asked for, and what it does when signed. */
function openedFlow() {
  const config = hooks.openFlow.mock.lastCall?.[0] as ActionFlowConfig;
  config.execute();
  return config.type;
}

describe('useDuelTurnActions', () => {
  it('joins through the join flow', () => {
    actions('created').run('join');

    expect(hooks.handleOpenJoinFlow).toHaveBeenCalledOnce();
  });

  it('opens the top-up window for a stake the wallet can’t cover', () => {
    actions('created').run('topUp');

    expect(openTopUp).toHaveBeenCalledOnce();
  });

  it('signs in through Privy', () => {
    actions('created').run('signIn');

    expect(hooks.login).toHaveBeenCalledOnce();
  });

  it('sends a one-transaction answer straight from the page', () => {
    actions('cancelReq').run('agree');

    expect(hooks.responses.acceptCancellation).toHaveBeenCalledOnce();
  });

  it('reports a win through the guided window', () => {
    actions().run('won');

    expect(openedFlow()).toBe('claimVictory');
    expect(hooks.duelActions.claimVictory).toHaveBeenCalledWith(7n);
  });

  it('takes a stake back after the time ran out in one call that closes the duel and pays out', () => {
    actions('timeout').run('takeBack');

    expect(openedFlow()).toBe('refundAndClaim');
    expect(hooks.duelActions.refundAndClaimPayouts).toHaveBeenCalledWith([7n]);
  });

  it('takes a finished duel’s own stake back with claimPayout', () => {
    actions('refunded').run('takeBack');

    expect(openedFlow()).toBe('claimPayout');
    expect(hooks.duelActions.claimPayout).toHaveBeenCalledWith(7n);
  });

  it('takes the winnings with claimPayout', () => {
    actions('resolved').run('claimWin');

    expect(openedFlow()).toBe('claimPayout');
  });

  it('names the answer on its way by its move', () => {
    hooks.responses.pending = 'decliningMutualCancelRequest';
    hooks.responses.isBusy = true;

    const { pending, isBusy } = actions('cancelReq');

    expect(pending).toBe('keepPlaying');
    expect(isBusy).toBe(true);
  });

  it('is busy while a guided window is open', () => {
    hooks.actionFlow = { flow: {}, openFlow: hooks.openFlow, duelActions: hooks.duelActions };

    expect(actions().isBusy).toBe(true);
  });

  it('gives the guided window the duel’s amounts and the other player', () => {
    const { summaryContext } = actions();

    expect(summaryContext).toMatchObject({ duelId: 7, formattedPot: '10 USDT', opponentDisplay: 'Bo' });
  });
});
