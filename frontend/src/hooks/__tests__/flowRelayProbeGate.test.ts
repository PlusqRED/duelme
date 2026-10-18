// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DuelState, type Duel } from '@/lib/contracts';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_KEY, ZERO_ADDRESS } from '@/lib/constants';
import { OPEN_DUEL_INVITE_HASH } from '@/lib/invite';

const VIEWER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;

const relay = vi.hoisted(() => ({ isRelayResolved: false }));

vi.mock('wagmi', () => ({
  useAccount: () => ({ chainId: DEFAULT_CHAIN.id }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
  useReadContract: () => ({ data: undefined, refetch: vi.fn() }),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ ready: true, authenticated: true, login: vi.fn() }),
  useIdentityToken: () => ({ identityToken: null }),
}));

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { address: VIEWER }, walletAddress: VIEWER }),
}));

vi.mock('@/hooks/useFlowFunding', () => ({
  useFlowFunding: () => ({
    funding: {
      balance: { kind: 'ready' },
      status: { kind: 'enough' },
      view: 'review',
      retry: vi.fn(),
      showDeposit: vi.fn(),
      showReview: vi.fn(),
    },
    markOpened: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDuelActions', () => ({
  useDuelActions: () => ({
    isRelayEnabled: false,
    isRelayResolved: relay.isRelayResolved,
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    receipt: undefined,
    hash: undefined,
    reset: vi.fn(),
  }),
}));

const { useActionFlow } = await import('@/hooks/useActionFlow');
const { useCreateDuelFlow } = await import('@/hooks/useCreateDuelFlow');
const { useJoinDuelFlow } = await import('@/hooks/useJoinDuelFlow');

const WAITING_DUEL: Duel = {
  creator: CREATOR,
  opponent: ZERO_ADDRESS,
  invitedOpponent: ZERO_ADDRESS,
  wagerAmount: 5_000_000n,
  inviteHash: OPEN_DUEL_INVITE_HASH,
  message: '',
  claimedWinner: ZERO_ADDRESS,
  claimedBy: ZERO_ADDRESS,
  cancelRequestedBy: ZERO_ADDRESS,
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
};

function renderFlows() {
  const action = renderHook(() => useActionFlow({ duelId: 7, refetchDuel: vi.fn() }));
  const create = renderHook(() =>
    useCreateDuelFlow({
      amount: '5',
      message: '',
      gameName: 'Chess',
      isPublic: true,
      selectedChain: DEFAULT_CHAIN_KEY,
      isValidAmount: true,
      isValidMessage: true,
    })
  );
  const join = renderHook(() =>
    useJoinDuelFlow({ duelId: 7, duel: WAITING_DUEL, inviteSecret: null, refetchDuel: vi.fn(async () => {}) })
  );

  return { action, create, join };
}

beforeEach(() => {
  relay.isRelayResolved = false;
});

describe('guided flows while the relay probe has not answered', () => {
  it('keeps Continue closed in every flow, since the route is not known yet', () => {
    const { action, create, join } = renderFlows();

    expect(action.result.current.canContinue).toBe(false);
    expect(create.result.current.review.canContinue).toBe(false);
    expect(join.result.current.review.canContinue).toBe(false);
  });

  it('opens Continue in every flow once the probe has answered', () => {
    relay.isRelayResolved = true;

    const { action, create, join } = renderFlows();

    expect(action.result.current.canContinue).toBe(true);
    expect(create.result.current.review.canContinue).toBe(true);
    expect(join.result.current.review.canContinue).toBe(true);
  });
});
