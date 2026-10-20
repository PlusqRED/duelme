// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translator } from '@/i18n/translate';
import type { ActionFlowConfig, ActionFlowSession, ActionFlowSummaryContext } from '@/lib/actionFlow';
import { cancelDuelConfig, refundAndClaimAllConfig, claimPayoutConfig } from '@/lib/actionFlowConfigs';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { flowError } from '@/lib/flowError';
import { startFlow } from '@/lib/flowSession';

const relayer = vi.hoisted(() => ({ isRelayEnabled: true }));

vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ activeWallet: null, walletAddress: undefined }) }));
vi.mock('@/hooks/useSignGas', () => ({
  useSignGas: () => ({ eth: undefined, fix: null, isFaucetBusy: false, feeOf: () => null, isTopUpOpen: false }),
}));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: relayer.isRelayEnabled }) }));
vi.mock('@/hooks/useContractConfig', () => ({ useContractConfig: () => ({ claimTimeout: 3600 }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

const { ActionSigningWindow } = await import('@/components/sign/ActionSigningWindow');

/** Matches copy only with its non-breaking spaces where they belong. */
const exactly = { normalizer: (text: string) => text };

const CONTEXT: ActionFlowSummaryContext = {
  duelId: 6,
  formattedWager: '99',
  formattedPot: '198',
  chainName: DEFAULT_CHAIN.name,
  opponentDisplay: '0x4BFa...76a5',
  claimedWinnerDisplay: '',
  claimableDisplay: '198',
  t: translator('en').t,
};

beforeEach(() => {
  relayer.isRelayEnabled = true;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function session(config: ActionFlowConfig, overrides: Partial<ActionFlowSession> = {}): ActionFlowSession {
  return {
    ...startFlow('review'),
    actionType: config.type,
    duelId: 6n,
    chainId: DEFAULT_CHAIN.id,
    chainName: DEFAULT_CHAIN.name,
    signing: { phase: null, hash: undefined, failedWhile: null, feePaidWei: 0n, createdDuelId: null },
    ...overrides,
  };
}

function renderAction(config: ActionFlowConfig, overrides: Partial<ActionFlowSession> = {}) {
  const handlers = { onOpenChange: vi.fn(), onContinue: vi.fn(), onSwitchNetwork: vi.fn(), onExecute: vi.fn(), onDone: vi.fn() };
  render(
    <ActionSigningWindow
      open
      canClose
      flow={session(config, overrides)}
      config={config}
      needsNetworkSwitch={false}
      summaryContext={CONTEXT}
      {...handlers}
    />
  );
  return handlers;
}

describe('ActionSigningWindow', () => {
  it('testActionSigningWindowWordsTakingTheWinnings', () => {
    renderAction(claimPayoutConfig(vi.fn()));

    expect(screen.getByRole('dialog', { name: 'Take your winnings' })).toBeTruthy();
    expect(screen.getByText('Send the 198 USDT you won in duel #6 to your wallet', exactly)).toBeTruthy();
  });

  it('testActionSigningWindowStartsTheFlow', () => {
    const handlers = renderAction(claimPayoutConfig(vi.fn()));

    fireEvent.click(screen.getByRole('button', { name: 'Sign and take 198 USDT' }));

    expect(handlers.onContinue).toHaveBeenCalledOnce();
  });

  it('testActionSigningWindowCountsTheDuelsABatchTakesFrom', () => {
    renderAction(refundAndClaimAllConfig(vi.fn(), '42', 3, false));

    expect(screen.getByText('3 duels')).toBeTruthy();
    expect(screen.getByText('Send your payouts from 3 duels to your wallet')).toBeTruthy();
  });

  it('testActionSigningWindowSaysABatchClosesTheTimedOutDuels', () => {
    renderAction(refundAndClaimAllConfig(vi.fn(), '42', 3, true));

    expect(screen.getByText('Close the timed-out duels and send your payouts to your wallet')).toBeTruthy();
  });

  it('testActionSigningWindowSignsADirectWriteToo', () => {
    renderAction(cancelDuelConfig(vi.fn()));

    expect(screen.getByRole('dialog', { name: 'Cancel duel #6' })).toBeTruthy();
    expect(screen.getByText('Close duel #6 before anyone joins')).toBeTruthy();
  });

  it('testActionSigningWindowCallsTheContractDirectlyWhenTheWalletPays', () => {
    relayer.isRelayEnabled = false;

    renderAction(cancelDuelConfig(vi.fn()));

    expect(screen.getByText('What your wallet sends')).toBeTruthy();
    expect(screen.getByText('1 transaction')).toBeTruthy();
  });

  it('testActionSigningWindowRetriesTheWriteItself', () => {
    const handlers = renderAction(cancelDuelConfig(vi.fn()), { stage: 'execute', actionState: 'error', errorMessage: flowError('rejected') });

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(handlers.onExecute).toHaveBeenCalledOnce();
  });

  it('testActionSigningWindowClosesThroughOnOpenChange', () => {
    const handlers = renderAction(cancelDuelConfig(vi.fn()));

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(handlers.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('testActionSigningWindowShowsNothingWithoutAnAction', () => {
    const { container } = render(
      <ActionSigningWindow
        open={false}
        canClose
        flow={null}
        config={null}
        needsNetworkSwitch={false}
        summaryContext={CONTEXT}
        onOpenChange={vi.fn()}
        onContinue={vi.fn()}
        onSwitchNetwork={vi.fn()}
        onExecute={vi.fn()}
        onDone={vi.fn()}
      />
    );

    expect(container.childElementCount).toBe(0);
  });
});
