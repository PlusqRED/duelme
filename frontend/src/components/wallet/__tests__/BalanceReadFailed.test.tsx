// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BalanceReadFailed } from '@/components/wallet/BalanceReadFailed';

afterEach(cleanup);

describe('BalanceReadFailed', () => {
  it('says the balance could not be read and reads it again on request', () => {
    const onRetry = vi.fn();
    render(<BalanceReadFailed onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Couldn’t read the balance.')).toBeTruthy();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
