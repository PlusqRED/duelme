// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TakenLine } from '@/components/dashboard/TakenLine';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TakenLine', () => {
  it('says what was taken is in the wallet now', () => {
    render(<TakenLine raw={17_500_000n} isSettled={false} />);

    expect(screen.getByText('17.5 USDT taken: it’s in your wallet now.')).toBeTruthy();
  });

  it('takes the focus once the signing window has closed', () => {
    const { rerender } = render(<TakenLine raw={17_500_000n} isSettled={false} />);
    const line = screen.getByText(/taken/).closest('p');

    rerender(<TakenLine raw={17_500_000n} isSettled />);
    act(() => vi.runAllTimers());

    expect(document.activeElement).toBe(line);
  });

  it('leaves the focus alone while the window is open', () => {
    render(<TakenLine raw={17_500_000n} isSettled={false} />);

    act(() => vi.runAllTimers());

    expect(document.activeElement).toBe(document.body);
  });
});
