// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FaucetFlask } from '@/components/header/FaucetFlask';
import type { FaucetOffer } from '@/lib/faucetApi';
import type { FlaskPhase } from '@/lib/faucetFlask';

const OFFER: FaucetOffer = { kind: 'ready', usdtAmountRaw: 100_000_000n, ethAmountWei: 1_000_000_000_000_000n };

afterEach(cleanup);

function renderFlask(phase: FlaskPhase, onClaim = vi.fn()) {
  const view = render(<FaucetFlask phase={phase} offer={OFFER} onClaim={onClaim} onPoured={() => {}} />);
  return { ...view, onClaim };
}

describe('FaucetFlask', () => {
  it('shows nothing where the faucet gives nothing', () => {
    const { container } = renderFlask('hidden');

    expect(container.childElementCount).toBe(0);
  });

  it('offers the claim with what it gives', () => {
    const { onClaim } = renderFlask('ready');

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Once per wallet: 100 USDT and 0.001 ETH.');
    fireEvent.click(button);
    expect(onClaim).toHaveBeenCalled();
  });

  it.each([
    ['asking', 'Asking the faucet…'],
    ['sent', 'On the way: 100 USDT and 0.001 ETH'],
  ] as const)('keeps the button while %s, but it no longer claims', (phase, text) => {
    const { onClaim } = renderFlask(phase);

    const button = screen.getByRole('button');
    expect(button.textContent).toContain(text);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(onClaim).not.toHaveBeenCalled();
  });

  it.each(['landed', 'claimed'] as const)('says what arrived once %s', (phase) => {
    renderFlask(phase);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Received: 100 USDT and 0.001 ETH')).toBeTruthy();
  });
});
