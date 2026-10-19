// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WalletButton } from '@/components/header/WalletButton';
import { Popover } from '@/components/ui/popover';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import type { Owed } from '@/lib/owed';

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));

const ADDRESS = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';

afterEach(cleanup);

function renderButton(usdt: NetworkBalances['usdt'], owed: Owed | null = null) {
  const network: NetworkBalances = { chain: SUPPORTED_CHAINS.arbitrumSepolia, usdt, eth: { kind: 'checking' } };
  render(
    <Popover>
      <WalletButton address={ADDRESS} network={network} owed={owed} />
    </Popover>
  );
  return screen.getByRole('button');
}

function owedOf(kind: 'win' | 'back'): Owed {
  return { items: [{ duelId: 3, seat: 'creator', kind, raw: 15_000_000n }], totalRaw: 15_000_000n, hasWin: kind === 'win' };
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

  it('puts no pip on the face while the contract keeps nothing for the player', () => {
    const button = renderButton({ kind: 'ready', raw: 46_700_000n });

    expect(button.querySelector('[data-tone]')).toBeNull();
  });

  it('puts the payout\'s sun on the face for a win waiting in the contract, and says how much waits', () => {
    const button = renderButton({ kind: 'ready', raw: 46_700_000n }, owedOf('win'));

    expect(button.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('win');
    expect(button.getAttribute('aria-label')).toBe('Wallet: 46.7\u00a0USDT on Arbitrum Sepolia. 15\u00a0USDT waiting in the contract');
  });

  it('marks stakes coming back apart from a win', () => {
    const button = renderButton({ kind: 'checking' }, owedOf('back'));

    expect(button.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('back');
    expect(button.getAttribute('aria-label')).toBe('Your wallet. 15\u00a0USDT waiting in the contract');
  });

  it('shows that the balance is still being read', () => {
    const button = renderButton({ kind: 'checking' });

    expect(button.textContent).toContain('…');
  });
});
