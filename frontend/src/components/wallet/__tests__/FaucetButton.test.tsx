// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CHAINS } from '@/lib/constants';

const faucet = vi.hoisted(() => ({ claim: vi.fn<() => Promise<boolean>>(), success: vi.fn() }));
vi.mock('@/hooks/useFaucetClaim', () => ({
  useFaucetClaim: () => ({ offer: { kind: 'ready', usdtAmountRaw: 1n, ethAmountWei: 1n }, isClaiming: false, claim: faucet.claim }),
}));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => ({ success: faucet.success }) }));

const { FaucetButton } = await import('@/components/wallet/FaucetButton');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FaucetButton', () => {
  it('says the test money is on its way once the faucet sent it', async () => {
    faucet.claim.mockResolvedValue(true);
    render(<FaucetButton chainId={SUPPORTED_CHAINS.arbitrumSepolia.id} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(faucet.success).toHaveBeenCalledWith('toast.faucetClaimed'));
  });

  it('says nothing of the kind when the claim failed, which has a toast of its own', async () => {
    faucet.claim.mockResolvedValue(false);
    render(<FaucetButton chainId={SUPPORTED_CHAINS.arbitrumSepolia.id} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(faucet.claim).toHaveBeenCalled());
    expect(faucet.success).not.toHaveBeenCalled();
  });
});
