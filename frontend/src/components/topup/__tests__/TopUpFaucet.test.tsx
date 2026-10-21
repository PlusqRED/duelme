// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FaucetOffer } from '@/lib/faucetApi';

const CHAIN = 421614;
const READY: FaucetOffer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1_000_000_000_000_000n };

const faucet = vi.hoisted(() => ({
  offer: { kind: 'none' } as FaucetOffer,
  isClaiming: false,
  claim: vi.fn<() => Promise<boolean>>(),
}));
vi.mock('@/hooks/useFaucetClaim', () => ({ useFaucetClaim: () => faucet }));

const { TopUpFaucet } = await import('@/components/topup/TopUpFaucet');

beforeEach(() => {
  faucet.offer = READY;
  faucet.isClaiming = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TopUpFaucet', () => {
  it('shows nothing where the faucet gives nothing', () => {
    faucet.offer = { kind: 'none' };
    const { container } = render(<TopUpFaucet chainId={CHAIN} />);

    expect(container.textContent).toBe('');
  });

  it('offers the claim with what it gives, once per wallet', () => {
    render(<TopUpFaucet chainId={CHAIN} />);

    expect(screen.getByRole('button', { name: 'Get test ETH and USDT' })).toBeTruthy();
    expect(screen.getByText('Once per wallet: 100 USDT and 0.001 ETH.')).toBeTruthy();
  });

  it('keeps its button, and the focus on it, while the faucet answers', () => {
    faucet.isClaiming = true;
    render(<TopUpFaucet chainId={CHAIN} />);

    const button = screen.getByRole('button', { name: 'Get test ETH and USDT' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('says what came once the faucet said yes, before its status catches up', async () => {
    faucet.claim.mockResolvedValue(true);
    render(<TopUpFaucet chainId={CHAIN} />);

    fireEvent.click(screen.getByRole('button', { name: 'Get test ETH and USDT' }));

    expect(await screen.findByText('Received: 100 USDT and 0.001 ETH')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers the claim again after the faucet said no', async () => {
    faucet.claim.mockResolvedValue(false);
    render(<TopUpFaucet chainId={CHAIN} />);

    fireEvent.click(screen.getByRole('button', { name: 'Get test ETH and USDT' }));

    await vi.waitFor(() => expect(faucet.claim).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Get test ETH and USDT' })).toBeTruthy();
  });

  it('says a claim made earlier was made', () => {
    faucet.offer = { ...READY, kind: 'claimed' };
    render(<TopUpFaucet chainId={CHAIN} />);

    expect(screen.getByText('Received: 100 USDT and 0.001 ETH')).toBeTruthy();
  });
});
