// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WalletButton } from '@/components/header/WalletButton';
import { Popover } from '@/components/ui/popover';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { SUPPORTED_CHAINS } from '@/lib/constants';

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';

afterEach(cleanup);

function renderButton(usdt: NetworkBalances['usdt']) {
  const network: NetworkBalances = { chain: SUPPORTED_CHAINS.arbitrumSepolia, usdt, eth: { kind: 'checking' } };
  render(
    <Popover>
      <WalletButton address={ADDRESS} network={network} />
    </Popover>
  );
  return screen.getByRole('button');
}

describe('WalletButton', () => {
  it('shows the balance on the network duels run on, and names it in full', () => {
    const button = renderButton({ kind: 'ready', raw: 46_700_000n });

    expect(button.textContent).toContain('46.7');
    expect(button.getAttribute('aria-label')).toBe('Wallet: 46.7 USDT on Arbitrum Sepolia');
  });

  it('shows a dash for a balance that failed to read, never a zero', () => {
    const button = renderButton({ kind: 'error' });

    expect(button.textContent).toContain('—');
    expect(button.getAttribute('aria-label')).toBe('Your wallet');
  });

  it('shows that the balance is still being read', () => {
    const button = renderButton({ kind: 'checking' });

    expect(button.textContent).toContain('…');
  });
});
