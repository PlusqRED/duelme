// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionFlowConfig, DuelActions } from '@/lib/actionFlow';
import { DuelState } from '@/lib/contracts';
import type { DuelPhase } from '@/lib/duelPhase';
import { duelView } from '@/lib/__tests__/helpers/duelView';
import { OPEN_DUEL_INVITE_SECRET } from '@/lib/invite';

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
    acceptMutualCancellation: vi.fn(),
    declineMutualCancellation: vi.fn(),
    withdrawMutualCancellationRequest: vi.fn(),
    declineDuel: vi.fn(),
    cancelDuel: vi.fn(),
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
vi.mock('@/hooks/useNicknames', () => ({ useNicknames: () => ({ resolveDisplay: () => 'Bo' }) }));

const { useDuelTurnActions } = await import('@/hooks/useDuelTurnActions');

const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const OPPONENT = '0x111111111111111111111111111111111111abcd' as const;
const openTopUp = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  hooks.actionFlow = null;
  hooks.joinFlow = null;
});

function actions(phase: DuelPhase = 'funded') {
  const duel = duelView({ creator: CREATOR, opponent: OPPONENT, state: DuelState.WinnerClaimed });
  return renderHook(() =>
    useDuelTurnActions({ duelId: 7, duel, phase, inviteSecret: null, walletAddress: OPPONENT, refetch: vi.fn(async () => undefined), openTopUp })
  ).result.current;
}

/** The signing window `openFlow` was last asked for, and what it does when signed. */
function openedFlow() {
  const config = hooks.openFlow.mock.lastCall?.[0] as ActionFlowConfig;
  config.execute(hooks.duelActions as unknown as DuelActions);
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

  it('agrees to call a duel off through the signing window', () => {
    actions('cancelReq').run('agree');

    expect(openedFlow()).toBe('acceptMutualCancellation');
    expect(hooks.duelActions.acceptMutualCancellation).toHaveBeenCalledWith(7n);
  });

  it('declines an open duel with the open secret', () => {
    actions('created').run('decline');

    expect(openedFlow()).toBe('declineDuel');
    expect(hooks.duelActions.declineDuel).toHaveBeenCalledWith(7n, OPEN_DUEL_INVITE_SECRET);
  });

  it('reports a win through the signing window', () => {
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

  it('is busy while a signing window is open', () => {
    hooks.actionFlow = { flow: {}, openFlow: hooks.openFlow, duelActions: hooks.duelActions };

    expect(actions().isBusy).toBe(true);
  });

  it('gives the signing window the duel’s amounts and the other player', () => {
    const { summaryContext } = actions();

    expect(summaryContext).toMatchObject({ duelId: 7, formattedPot: '10 USDT', opponentDisplay: 'Bo' });
  });

  it('keeps the duel as it stood when the window opened, so Done still names what was taken', () => {
    const won = duelView({ creator: CREATOR, opponent: OPPONENT, state: DuelState.Resolved, claimedWinner: OPPONENT, opponentPayout: 10_000_000n });
    const { result, rerender } = renderHook(
      ({ duel }) =>
        useDuelTurnActions({ duelId: 7, duel, phase: 'funded', inviteSecret: null, walletAddress: OPPONENT, refetch: vi.fn(async () => undefined), openTopUp }),
      { initialProps: { duel: won } }
    );
    act(() => result.current.run('claimWin'));

    rerender({ duel: { ...won, opponentClaimed: true } });

    expect(result.current.summaryContext.claimableDisplay).toBe('10 USDT');
  });
});
