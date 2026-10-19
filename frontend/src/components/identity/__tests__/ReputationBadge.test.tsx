// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';

const PLAYER = '0x1111111111111111111111111111111111111111';

const read = vi.hoisted(() => ({ result: {} as object }));
vi.mock('wagmi', () => ({ useReadContract: () => read.result }));

const { ReputationBadge } = await import('@/components/identity/ReputationBadge');

function renderBadge(result: object) {
  read.result = { data: undefined, isLoading: false, isError: false, ...result };
  return render(<ReputationBadge address={PLAYER} chainId={DEFAULT_CHAIN_ID} showStats />);
}

afterEach(cleanup);

describe('ReputationBadge', () => {
  it('shows the level the contract reads, with the record beside it', () => {
    renderBadge({ data: { duelsHonored: 6n, duelsAbandoned: 0n } });

    expect(screen.getByText('Reliable')).toBeTruthy();
    expect(screen.getByText(/^6\/6/)).toBeTruthy();
  });

  it('calls a player with no duels New', () => {
    renderBadge({ data: { duelsHonored: 0n, duelsAbandoned: 0n } });

    expect(screen.getByText('New')).toBeTruthy();
  });

  it('shows no level when the read failed, rather than New', () => {
    const { container } = renderBadge({ isError: true });

    expect(container.textContent).toBe('');
  });

  it('keeps the level read before a later read failed', () => {
    renderBadge({ data: { duelsHonored: 6n, duelsAbandoned: 0n }, isError: true });

    expect(screen.getByText('Reliable')).toBeTruthy();
  });
});
