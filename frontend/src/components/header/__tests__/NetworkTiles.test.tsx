// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkTiles } from '@/components/header/NetworkTiles';
import type { NetworkBalances } from '@/hooks/useWalletBalances';
import { SUPPORTED_CHAINS } from '@/lib/constants';

const SEPOLIA = SUPPORTED_CHAINS.arbitrumSepolia;
const ONE = SUPPORTED_CHAINS.arbitrum;

const NETWORKS: NetworkBalances[] = [
  { chain: SEPOLIA, usdt: { kind: 'ready', raw: 46_700_000n }, eth: { kind: 'ready', raw: 7_736_000_000_000_000n } },
  { chain: ONE, usdt: { kind: 'error' }, eth: { kind: 'checking' } },
];

afterEach(cleanup);

describe('NetworkTiles', () => {
  it('is a radio group with the picked network checked and the only one in the tab order', () => {
    render(<NetworkTiles networks={NETWORKS} pickedId={SEPOLIA.id} onPick={() => {}} />);

    const [sepolia, one] = screen.getAllByRole('radio');
    expect(screen.getByRole('radiogroup', { name: 'Network for top-up and sending' })).toBeTruthy();
    expect(sepolia.getAttribute('aria-checked')).toBe('true');
    expect(sepolia.tabIndex).toBe(0);
    expect(one.tabIndex).toBe(-1);
  });

  it('shows each network\'s own balance, a dash for one that failed to read', () => {
    render(<NetworkTiles networks={NETWORKS} pickedId={SEPOLIA.id} onPick={() => {}} />);

    const [sepolia, one] = screen.getAllByRole('radio');
    expect(sepolia.textContent).toContain('46.7');
    expect(sepolia.textContent).toContain('0.0077 ETH');
    expect(one.textContent).toContain('—');
    expect(one.textContent).toContain('… ETH');
  });

  it('marks the test network and the network duels run on', () => {
    render(<NetworkTiles networks={NETWORKS} pickedId={SEPOLIA.id} onPick={() => {}} />);

    const [sepolia, one] = screen.getAllByRole('radio');
    expect(sepolia.textContent).toContain('Test network');
    expect(sepolia.textContent).toContain('Duels run here');
    expect(one.textContent).not.toContain('Test network');
  });

  it('picks a network by click', () => {
    const onPick = vi.fn();
    render(<NetworkTiles networks={NETWORKS} pickedId={SEPOLIA.id} onPick={onPick} />);

    fireEvent.click(screen.getAllByRole('radio')[1]);

    expect(onPick).toHaveBeenCalledWith(ONE.id);
  });

  it('moves the pick with the arrow keys, round from the last network to the first', () => {
    const onPick = vi.fn();
    render(<NetworkTiles networks={NETWORKS} pickedId={ONE.id} onPick={onPick} />);

    fireEvent.keyDown(screen.getAllByRole('radio')[1], { key: 'ArrowRight' });

    expect(onPick).toHaveBeenCalledWith(SEPOLIA.id);
    expect(document.activeElement).toBe(screen.getAllByRole('radio')[0]);
  });
});
