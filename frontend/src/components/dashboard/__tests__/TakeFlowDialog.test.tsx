// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TakeFlowDialog } from '@/components/dashboard/TakeFlowDialog';
import type { useActionFlow } from '@/hooks/useActionFlow';
import { claimAllConfig } from '@/lib/actionFlowConfigs';
import { DEFAULT_CHAIN } from '@/lib/constants';

type ActionFlow = ReturnType<typeof useActionFlow>;

function actionFlow(isOpen: boolean): ActionFlow {
  const config = claimAllConfig(vi.fn(), '17.5 USDT', 3);
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
          actionType: 'claimAll',
          duelId: 0n,
          chainId: DEFAULT_CHAIN.id,
          chainName: DEFAULT_CHAIN.name,
          stage: 'review',
          actionState: 'idle',
          errorMessage: null,
          pendingTransaction: false,
          completedSwitchNetwork: false,
        }
      : null,
    activeConfig: isOpen ? config : null,
    canClose: true,
    needsNetworkSwitch: false,
    duelActions: {} as ActionFlow['duelActions'],
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
