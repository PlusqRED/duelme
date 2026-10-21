// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowReviewGate } from '@/hooks/useFlowFunding';
import { DEFAULT_CHAIN, DUELME_ADDRESSES, USDT_ADDRESSES } from '@/lib/constants';
import type { CreateDuelFlowDraft } from '@/lib/createDuelFlow';
import { flowError } from '@/lib/flowError';
import type { JoinDuelFlowDraft } from '@/lib/joinDuelFlow';

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const CREATOR = '0x32a3fe56f4fee248e4f19ca3d4374a018ac9aa23';

const relayer = vi.hoisted(() => ({ isRelayEnabled: true }));

vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { address: ADDRESS }, walletAddress: ADDRESS.toLowerCase() }),
}));
vi.mock('@/hooks/useSignGas', () => ({
  useSignGas: () => ({ eth: undefined, fix: null, isFaucetBusy: false, feeOf: () => null, isTopUpOpen: false }),
}));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: relayer.isRelayEnabled }) }));
vi.mock('@/hooks/useUsdtBalance', () => ({ useUsdtBalance: () => ({ read: null, refetch: vi.fn() }) }));
vi.mock('@/hooks/useFaucetClaim', () => ({ useFaucetClaim: () => ({ offer: { kind: 'none' }, isClaiming: false, claim: vi.fn() }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { JoinSigningWindow } = await import('@/components/sign/JoinSigningWindow');
const { CreateSigningWindow } = await import('@/components/sign/CreateSigningWindow');

/** Matches copy only with its non-breaking spaces where they belong. */
const exactly = { normalizer: (text: string) => text };

beforeEach(() => {
  relayer.isRelayEnabled = true;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function review(createdDuelId: number | null = null): FlowReviewGate {
  return {
    funding: {
      balance: { kind: 'ready', raw: 46_700_000n },
      status: { kind: 'enough' },
      isTopUpOpen: false,
      retry: vi.fn(),
      openTopUp: vi.fn(),
      closeTopUp: vi.fn(),
    },
    canContinue: true,
    blockedReason: null,
    signing: { phase: null, hash: undefined, failedWhile: null, feePaidWei: 0n, createdDuelId },
  };
}

const flowProps = {
  open: true,
  canClose: true,
  actionState: 'idle' as const,
  needsNetworkSwitch: false,
  needsApproval: false,
  completedSwitchNetwork: false,
  completedApproval: false,
  errorMessage: null,
};

const JOIN_DRAFT: JoinDuelFlowDraft = {
  duelId: 7n,
  rawAmount: 14_000_000n,
  chainId: DEFAULT_CHAIN.id,
  chainName: DEFAULT_CHAIN.name,
  usdtAddress: USDT_ADDRESSES[DEFAULT_CHAIN.id],
  contractAddress: DUELME_ADDRESSES[DEFAULT_CHAIN.id],
  inviteSecret: `0x${'00'.repeat(32)}`,
  creatorAddress: CREATOR,
};

function renderJoin(overrides: Partial<Parameters<typeof JoinSigningWindow>[0]> = {}) {
  const handlers = {
    onOpenChange: vi.fn(),
    onContinue: vi.fn(),
    onSwitchNetwork: vi.fn(),
    onApprove: vi.fn(),
    onJoinDuel: vi.fn(),
    onDone: vi.fn(),
  };
  render(<JoinSigningWindow {...flowProps} draft={JOIN_DRAFT} stage="review" review={review()} {...handlers} {...overrides} />);
  return handlers;
}

describe('JoinSigningWindow', () => {
  it('testJoinSigningWindowPutsThePermitBeforeTheJoinWhenRelayed', () => {
    renderJoin();

    expect(screen.getByRole('dialog', { name: 'Join duel #7' })).toBeTruthy();
    expect(screen.getByText('Allow 14 USDT for this duel', exactly)).toBeTruthy();
    expect(screen.getByText('Join duel #7 against 0x32a3...aa23')).toBeTruthy();
  });

  it('testJoinSigningWindowApprovesFirstWhenTheWalletPays', () => {
    relayer.isRelayEnabled = false;

    renderJoin({ needsApproval: true });

    expect(screen.getByText('What your wallet sends')).toBeTruthy();
    expect(screen.getByText('Allow 14 USDT for DuelMe', exactly)).toBeTruthy();
  });

  it('testJoinSigningWindowStartsTheFlow', () => {
    const handlers = renderJoin();

    fireEvent.click(screen.getByRole('button', { name: 'Sign and join' }));

    expect(handlers.onContinue).toHaveBeenCalledOnce();
  });

  it('testJoinSigningWindowClosesThroughOnOpenChange', () => {
    const handlers = renderJoin({ stage: 'join-duel', actionState: 'error', errorMessage: flowError('rejected') });

    fireEvent.click(screen.getByRole('button', { name: 'Back to the duel' }));

    expect(handlers.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('testJoinSigningWindowGoesBackToTheDuelWhenDone', () => {
    const handlers = renderJoin({ stage: 'success' });

    fireEvent.click(screen.getByRole('button', { name: 'Back to the duel' }));

    expect(handlers.onDone).toHaveBeenCalledOnce();
  });

  it('testJoinSigningWindowShowsNothingBeforeAJoinOpens', () => {
    const { container } = render(
      <JoinSigningWindow
        {...flowProps}
        open={false}
        draft={null}
        stage="review"
        review={review()}
        onOpenChange={vi.fn()}
        onContinue={vi.fn()}
        onSwitchNetwork={vi.fn()}
        onApprove={vi.fn()}
        onJoinDuel={vi.fn()}
        onDone={vi.fn()}
      />
    );

    expect(container.childElementCount).toBe(0);
  });
});

const CREATE_DRAFT: CreateDuelFlowDraft = {
  rawAmount: 5_000_000n,
  chainId: DEFAULT_CHAIN.id,
  chainName: DEFAULT_CHAIN.name,
  usdtAddress: USDT_ADDRESSES[DEFAULT_CHAIN.id],
  contractAddress: DUELME_ADDRESSES[DEFAULT_CHAIN.id],
  inviteHash: `0x${'11'.repeat(32)}`,
  inviteSecret: `0x${'22'.repeat(32)}`,
  isPublic: false,
  gameName: 'CS2',
  gameCategory: null,
  message: '',
};

function renderCreate(overrides: Partial<Parameters<typeof CreateSigningWindow>[0]> = {}) {
  const handlers = {
    onOpenChange: vi.fn(),
    onContinue: vi.fn(),
    onSwitchNetwork: vi.fn(),
    onApprove: vi.fn(),
    onCreateDuel: vi.fn(),
    onBackToForm: vi.fn(),
  };
  render(<CreateSigningWindow {...flowProps} wasLeft={false} draft={CREATE_DRAFT} stage="review" review={review()} {...handlers} {...overrides} />);
  return handlers;
}

describe('CreateSigningWindow', () => {
  it('testCreateSigningWindowNamesTheGameAndTheStake', () => {
    renderCreate();

    expect(screen.getByRole('dialog', { name: 'Create the duel' })).toBeTruthy();
    expect(screen.getByText('CS2 · new duel')).toBeTruthy();
    expect(screen.getByText('Create a CS2 duel for 5 USDT', exactly)).toBeTruthy();
  });

  it('testCreateSigningWindowWordsADuelWithoutAGame', () => {
    renderCreate({ draft: { ...CREATE_DRAFT, gameName: '' } });

    expect(screen.getByText('New duel')).toBeTruthy();
    expect(screen.getByText('Create a duel for 5 USDT', exactly)).toBeTruthy();
  });

  it('testCreateSigningWindowNamesTheNewDuelWhenDone', () => {
    renderCreate({ stage: 'success', review: review(12) });

    expect(screen.getByText('Duel #12 is open')).toBeTruthy();
  });

  it('testCreateSigningWindowSaysTheDuelIsOpenBeforeItsIdIsKnown', () => {
    renderCreate({ stage: 'success' });

    expect(screen.getByText('Your duel is open')).toBeTruthy();
  });

  it('testCreateSigningWindowSendsThePlayerBackToTheLinkWithoutLeaving', () => {
    const handlers = renderCreate({ stage: 'success', review: review(12) });

    fireEvent.click(screen.getByRole('button', { name: 'Send the link' }));

    expect(handlers.onBackToForm).toHaveBeenCalledOnce();
    expect(handlers.onOpenChange).not.toHaveBeenCalled();
  });

  it('testCreateSigningWindowSaysTheNewDuelStillComesWhenLeftWhileTheCreateConfirms', () => {
    renderCreate({ stage: 'create-duel', actionState: 'confirming', wasLeft: true });

    expect(screen.getByText(/this page shows the new duel and its link once it does/)).toBeTruthy();
  });

  it('testCreateSigningWindowSaysLeavingASlowApproveCreatesNoDuel', () => {
    relayer.isRelayEnabled = false;

    renderCreate({ stage: 'approve', actionState: 'confirming', needsApproval: true, wasLeft: true });

    expect(screen.getByText(/If you close this window, the duel isn’t created/)).toBeTruthy();
  });

  it('testCreateSigningWindowOffersThePublicDuelOnDone', () => {
    renderCreate({ stage: 'success', review: review(12), draft: { ...CREATE_DRAFT, isPublic: true, inviteSecret: null } });

    expect(screen.getByRole('button', { name: 'See your duel' })).toBeTruthy();
  });
});
