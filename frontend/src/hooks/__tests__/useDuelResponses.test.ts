// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { duelView } from '@/lib/__tests__/helpers/duelView';
import { OPEN_DUEL_INVITE_SECRET } from '@/lib/invite';

const toast = vi.hoisted(() => ({ info: vi.fn(), success: vi.fn(), error: vi.fn(), transactionError: vi.fn() }));
const wallet = vi.hoisted(() => ({ chainId: 0, switchChainAsync: vi.fn() }));
const tx = vi.hoisted(() => ({
  isPending: false,
  isConfirming: false,
  isSuccess: false,
  error: null as Error | null,
  declineDuel: vi.fn(),
  cancelDuel: vi.fn(),
  acceptMutualCancellation: vi.fn(),
  declineMutualCancellation: vi.fn(),
  withdrawMutualCancellationRequest: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toast }));
vi.mock('wagmi', () => ({
  useAccount: () => ({ chainId: wallet.chainId }),
  useSwitchChain: () => ({ switchChainAsync: wallet.switchChainAsync }),
}));
vi.mock('@/hooks/useDuelActions', () => ({ useDuelActions: () => tx }));

const { useDuelResponses } = await import('@/hooks/useDuelResponses');

const ADDRESSED = duelView({ invitedOpponent: '0x111111111111111111111111111111111111abcd' });
const PRIVATE = duelView({ inviteHash: `0x${'12'.repeat(32)}` });
const refetch = vi.fn(async () => undefined);

function respond(duel = ADDRESSED) {
  return renderHook(() => useDuelResponses(7, duel, null, refetch));
}

beforeEach(() => {
  wallet.chainId = DEFAULT_CHAIN_ID;
  Object.assign(tx, { isPending: false, isConfirming: false, isSuccess: false, error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useDuelResponses', () => {
  it('cancels the duel by its id', async () => {
    const { result } = respond();

    await act(() => result.current.cancel());

    expect(tx.cancelDuel).toHaveBeenCalledWith(7n);
    expect(toast.info).toHaveBeenCalledWith('toast.cancellingDuel');
  });

  it('says which answer is pending only while its transaction is', async () => {
    const { result, rerender } = respond();
    await act(() => result.current.cancel());
    expect(result.current.pending).toBe('idle');

    tx.isPending = true;
    rerender();

    expect(result.current.pending).toBe('canceling');
    expect(result.current.isBusy).toBe(true);
  });

  it('declines an open duel addressed to the reader without a secret', async () => {
    const { result } = respond();

    await act(() => result.current.decline());

    expect(tx.declineDuel).toHaveBeenCalledWith(7n, OPEN_DUEL_INVITE_SECRET);
  });

  it('refuses to decline a private duel without its invite', async () => {
    const { result } = respond(PRIVATE);

    await act(() => result.current.decline());

    expect(toast.error).toHaveBeenCalledWith('duel.privateInviteMissing');
    expect(tx.declineDuel).not.toHaveBeenCalled();
  });

  it('switches the wallet to the duel’s network first', async () => {
    wallet.chainId = 1;
    wallet.switchChainAsync.mockResolvedValue(undefined);
    const { result } = respond();

    await act(() => result.current.acceptCancellation());

    expect(wallet.switchChainAsync).toHaveBeenCalledWith({ chainId: DEFAULT_CHAIN_ID });
    expect(tx.acceptMutualCancellation).toHaveBeenCalledWith(7n);
  });

  it('sends nothing when the wallet would not switch', async () => {
    wallet.chainId = 1;
    wallet.switchChainAsync.mockRejectedValue(new Error('rejected'));
    const { result } = respond();

    await act(() => result.current.withdrawCancellation());

    expect(toast.error).toHaveBeenCalledWith('toast.switchNetworkFailed', expect.anything());
    expect(tx.withdrawMutualCancellationRequest).not.toHaveBeenCalled();
  });

  it.each([
    ['acceptCancellation', 'toast.cancellationAccepted'],
    ['declineCancellation', 'toast.cancellationDeclined'],
    ['withdrawCancellation', 'toast.cancellationWithdrawn'],
    ['cancel', 'toast.transactionConfirmed'],
  ] as const)('says %s went through, reads the duel again and clears the transaction', async (answer, key) => {
    const { result, rerender } = respond();
    await act(() => result.current[answer]());

    tx.isSuccess = true;
    rerender();

    expect(toast.success).toHaveBeenCalledWith(key);
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(tx.reset).toHaveBeenCalledTimes(1);
  });

  it('says nothing of a success it did not send', () => {
    const { rerender } = respond();

    tx.isSuccess = true;
    rerender();

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('says why a transaction failed', () => {
    const { rerender } = respond();
    const failure = new Error('reverted');

    tx.error = failure;
    rerender();

    expect(toast.transactionError).toHaveBeenCalledWith(failure);
  });
});
