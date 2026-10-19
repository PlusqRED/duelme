// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sonner = vi.hoisted(() => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));
vi.mock('sonner', () => sonner);

const { useAppToast } = await import('@/hooks/useAppToast');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useAppToast', () => {
  it('shows a message in the reader\'s language', () => {
    const { result } = renderHook(() => useAppToast());

    result.current.error('toast.transactionFailed');

    expect(sonner.toast.error).toHaveBeenCalledWith('Transaction failed');
  });

  it('says a transaction was turned down in the wallet, however the wallet words it', () => {
    const { result } = renderHook(() => useAppToast());

    result.current.transactionError(new Error('Request failed', { cause: { shortMessage: 'User Rejected the request.' } }));

    expect(sonner.toast.error).toHaveBeenCalledWith('Transaction rejected');
  });

  it('falls back to the message the caller names for any other failure', () => {
    const { result } = renderHook(() => useAppToast());

    result.current.transactionError(new Error('execution reverted'), 'toast.walletNotReady');

    expect(sonner.toast.error).toHaveBeenCalledWith('Wallet not ready. Please try again.');
  });
});
