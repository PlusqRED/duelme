// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DepositDialog } from '@/components/wallet/DepositDialog';

vi.mock('@/components/wallet/DepositPanel', () => ({
  DepositPanel: ({ chainId }: { chainId: number }) => <p>Deposit on {chainId}</p>,
}));

afterEach(cleanup);

describe('DepositDialog', () => {
  it('shows the deposit panel for the network picked', () => {
    render(<DepositDialog chainId={421614} onClose={() => {}} />);

    expect(screen.getByText('Deposit on 421614')).toBeTruthy();
  });

  it('keeps the panel in the window while the window closes', () => {
    const { rerender } = render(<DepositDialog chainId={421614} onClose={() => {}} />);

    rerender(<DepositDialog chainId={null} onClose={() => {}} />);

    expect(screen.getByText('Deposit on 421614')).toBeTruthy();
  });
});
