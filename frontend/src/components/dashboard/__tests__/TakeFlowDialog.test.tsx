// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TakeFlowDialog } from '@/components/dashboard/TakeFlowDialog';
import type { useActionFlow } from '@/hooks/useActionFlow';
import { refundAndClaimAllConfig } from '@/lib/actionFlowConfigs';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { startFlow } from '@/lib/flowSession';

vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ activeWallet: null, walletAddress: undefined }) }));
vi.mock('@/hooks/useSignGas', () => ({
  useSignGas: () => ({ eth: undefined, fix: null, isFaucetBusy: false, feeOf: () => null, isTopUpOpen: false }),
}));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: true }) }));
vi.mock('@/hooks/useContractConfig', () => ({ useContractConfig: () => ({ claimTimeout: 3600 }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

type ActionFlow = ReturnType<typeof useActionFlow>;

function actionFlow(isOpen: boolean): ActionFlow {
  const config = refundAndClaimAllConfig(vi.fn(), '17.5 USDT', 3, false);
  const handlers = {
    openFlow: vi.fn(),
    closeFlow: vi.fn(),
    handleContinue: vi.fn(),
    handleSwitchNetwork: vi.fn(),
    handleExecute: vi.fn(),
    handleFlowOpenChange: vi.fn(),
  };
  return {
    ...handlers,
    flow: isOpen
      ? {
          ...startFlow('review'),
          actionType: config.type,
          duelId: 0n,
          chainId: DEFAULT_CHAIN.id,
          chainName: DEFAULT_CHAIN.name,
          signing: { phase: null, hash: undefined, failedWhile: null, feePaidWei: 0n, createdDuelId: null },
        }
      : null,
    activeConfig: isOpen ? config : null,
    canClose: true,
    needsNetworkSwitch: false,
  };
}

afterEach(cleanup);

describe('TakeFlowDialog', () => {
  it('shows nothing while no Take is under way', () => {
    render(<TakeFlowDialog actionFlow={actionFlow(false)} />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the Take\'s sum and how many duels it empties', () => {
    render(<TakeFlowDialog actionFlow={actionFlow(true)} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('17.5 USDT');
    expect(dialog.textContent).toContain('3');
  });
});
