// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { DuelState, type Duel } from '@/lib/contracts';
import { OPEN_DUEL_INVITE_HASH } from '@/lib/invite';

const CREATOR = '0x32a3fe56f4fee248e4f19ca3d4374a018ac9aa23';
const VIEWER = '0x4bfa1486661d6faa5300923bd684f261ae4776a5';
const ZERO = '0x0000000000000000000000000000000000000000';

const env = vi.hoisted(() => ({
  emitBalanceRefresh: vi.fn(),
  write: {
    error: null as unknown,
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    receipt: undefined,
    hash: undefined,
    isRelayEnabled: true,
    signingPhase: null,
    reset: vi.fn(),
    joinDuel: vi.fn(async () => undefined),
    approveToken: vi.fn(async () => undefined),
  },
}));

vi.mock('wagmi', () => ({
  useAccount: () => ({ chainId: DEFAULT_CHAIN.id }),
  useReadContract: () => ({ data: undefined, refetch: vi.fn(async () => ({ data: undefined })) }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}));
vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ authenticated: true }) }));
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ walletAddress: VIEWER }) }));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), transactionError: vi.fn() }) }));
vi.mock('@/hooks/useDuelActions', () => ({ useDuelActions: () => env.write }));
vi.mock('@/hooks/useFlowFunding', () => ({
  useFlowFunding: () => ({
    funding: { balance: { kind: 'ready', raw: 50_000_000n }, status: { kind: 'enough' }, isTopUpOpen: false, retry: vi.fn(), openTopUp: vi.fn(), closeTopUp: vi.fn() },
    markOpened: vi.fn(),
  }),
}));
vi.mock('@/lib/balanceRefresh', () => ({ emitBalanceRefresh: env.emitBalanceRefresh }));

const { useJoinDuelFlow } = await import('@/hooks/useJoinDuelFlow');

function waitingDuel(overrides: Partial<Duel> = {}): Duel {
  return {
    creator: CREATOR,
    opponent: ZERO,
    invitedOpponent: ZERO,
    wagerAmount: 14_000_000n,
    inviteHash: OPEN_DUEL_INVITE_HASH,
    message: '',
    claimedWinner: ZERO,
    claimedBy: ZERO,
    cancelRequestedBy: ZERO,
    createdAt: 1n,
    fundedAt: 0n,
    cancelRequestedAt: 0n,
    claimTimestamp: 0n,
    finalizedAt: 0n,
    creatorPayout: 0n,
    opponentPayout: 0n,
    creatorClaimed: false,
    opponentClaimed: false,
    state: DuelState.Created,
    ...overrides,
  };
}

beforeEach(() => {
  env.write = { ...env.write, error: null, isPending: false, isConfirming: false, isSuccess: false, isRelayEnabled: true };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderJoin(duel: Duel = waitingDuel()) {
  const refetchDuel = vi.fn(async () => undefined);
  const hook = renderHook(() => useJoinDuelFlow({ duelId: 7, duel, inviteSecret: null, refetchDuel }));
  return { ...hook, refetchDuel };
}

describe('useJoinDuelFlow', () => {
  it('testUseJoinDuelFlowSaysADuelThatTakesNobodyCannotBeJoined', () => {
    const { result } = renderJoin(waitingDuel({ state: DuelState.Cancelled }));

    expect(result.current.review.blockedReason).toBe('sign.join.unavailable');
    expect(result.current.review.canContinue).toBe(false);
  });

  it('testUseJoinDuelFlowSendsTheJoinWithTheDuelsStake', async () => {
    const { result } = renderJoin();
    await act(async () => result.current.handleOpenJoinFlow());

    await act(async () => result.current.handleContinueFlow());
    await act(async () => result.current.handleJoinTransaction());

    expect(env.write.joinDuel).toHaveBeenCalledWith(7n, OPEN_DUEL_INVITE_HASH, 14_000_000n);
    expect(result.current.canCloseFlow).toBe(false);
  });

  it('testUseJoinDuelFlowFinishesAndRereadsTheDuelOnceJoined', async () => {
    const { result, rerender, refetchDuel } = renderJoin();
    await act(async () => result.current.handleOpenJoinFlow());
    await act(async () => result.current.handleContinueFlow());
    await act(async () => result.current.handleJoinTransaction());
    refetchDuel.mockClear();

    env.write = { ...env.write, isSuccess: true };
    rerender();

    expect(result.current.flow?.stage).toBe('success');
    expect(result.current.canCloseFlow).toBe(true);
    expect(env.emitBalanceRefresh).toHaveBeenCalled();
    expect(refetchDuel).toHaveBeenCalled();
  });
});
