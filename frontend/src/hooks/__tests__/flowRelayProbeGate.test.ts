// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useDuelActions } from '@/hooks/useDuelActions';
import type { useFlowFunding } from '@/hooks/useFlowFunding';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_KEY } from '@/lib/constants';
import { OPEN_DUEL_INVITE_HASH } from '@/lib/invite';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const VIEWER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;

const relay = vi.hoisted(() => ({ isRelayResolved: false }));
const useReadContract = vi.hoisted(() =>
  vi.fn<(config: { query?: { enabled?: boolean } }) => object>(() => ({ data: undefined, refetch: vi.fn() }))
);

vi.mock('wagmi', () => ({
  useAccount: () => ({ chainId: DEFAULT_CHAIN.id }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
  useReadContract,
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
  useFlowFunding: () =>
    ({
      funding: {
        balance: { kind: 'ready', raw: 10_000_000n },
        status: { kind: 'enough' },
        view: 'review',
        retry: vi.fn(),
        showDeposit: vi.fn(),
        showReview: vi.fn(),
      },
      markOpened: vi.fn(),
    }) satisfies ReturnType<typeof useFlowFunding>,
}));

vi.mock('@/hooks/useDuelActions', () => ({
  useDuelActions: () =>
    ({
      isRelayEnabled: false,
      isRelayResolved: relay.isRelayResolved,
      isPending: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
      receipt: undefined,
      hash: undefined,
      reset: vi.fn(),
    }) satisfies Partial<ReturnType<typeof useDuelActions>>,
}));

const { useCreateDuelFlow } = await import('@/hooks/useCreateDuelFlow');
const { useJoinDuelFlow } = await import('@/hooks/useJoinDuelFlow');

const WAITING_DUEL = duelView({ inviteHash: OPEN_DUEL_INVITE_HASH });

function renderCreateFlow() {
  return renderHook(() =>
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
}

function renderJoinFlow() {
  return renderHook(() =>
    useJoinDuelFlow({ duelId: 7, duel: WAITING_DUEL, inviteSecret: null, refetchDuel: vi.fn(async () => {}) })
  );
}

function allowanceReadEnabled() {
  return useReadContract.mock.lastCall?.[0].query?.enabled;
}

beforeEach(() => {
  relay.isRelayResolved = false;
  useReadContract.mockClear();
});

afterEach(cleanup);

describe('the create flow while the relay probe has not answered', () => {
  it('keeps Continue closed, since a permit and an approve step are not told apart yet', () => {
    expect(renderCreateFlow().result.current.review.canContinue).toBe(false);
  });

  it('reads no allowance, which only the self-paid path would need', () => {
    renderCreateFlow();

    expect(allowanceReadEnabled()).toBe(false);
  });

  it('opens Continue once the probe has answered', () => {
    relay.isRelayResolved = true;

    expect(renderCreateFlow().result.current.review.canContinue).toBe(true);
  });
});

describe('the join flow while the relay probe has not answered', () => {
  it('keeps Continue closed, since a permit and an approve step are not told apart yet', () => {
    expect(renderJoinFlow().result.current.review.canContinue).toBe(false);
  });

  it('reads no allowance, which only the self-paid path would need', () => {
    renderJoinFlow();

    expect(allowanceReadEnabled()).toBe(false);
  });

  it('opens Continue once the probe has answered', () => {
    relay.isRelayResolved = true;

    expect(renderJoinFlow().result.current.review.canContinue).toBe(true);
  });
});
