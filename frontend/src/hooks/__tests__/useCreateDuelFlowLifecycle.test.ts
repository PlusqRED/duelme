// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { TransactionReceipt } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, DUELME_ADDRESSES, USDT_ADDRESSES } from '@/lib/constants';
import type { CreateDuelFlowSession } from '@/lib/createDuelFlow';

vi.mock('@/lib/gameApi', () => ({
  attachGameToDuel: vi.fn(async () => {
    throw new Error('backend down');
  }),
}));

vi.mock('@/lib/createDuelFlowRuntime', () => ({
  extractCreatedDuelId: () => '7',
  buildDuelPath: (duelId: string) => `/duel/${duelId}`,
}));

const { useCreateDuelFlowLifecycle } = await import('@/hooks/useCreateDuelFlowLifecycle');
const { attachGameToDuel } = await import('@/lib/gameApi');

afterEach(cleanup);

const flow: CreateDuelFlowSession = {
  draft: {
    rawAmount: 5_000_000n,
    chainId: DEFAULT_CHAIN.id,
    chainName: DEFAULT_CHAIN.name,
    usdtAddress: USDT_ADDRESSES[DEFAULT_CHAIN.id],
    contractAddress: DUELME_ADDRESSES[DEFAULT_CHAIN.id],
    inviteHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    inviteSecret: null,
    isPublic: true,
    gameName: 'CS2',
    gameCategory: 'FPS',
    message: '',
  },
  completedSteps: { switchNetwork: false, approve: true },
  stage: 'create-duel',
  actionState: 'confirming',
  errorMessage: null,
  pendingTransaction: 'create-duel',
};

function renderCreatedDuel() {
  const appToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), transactionError: vi.fn() };
  renderHook(() =>
    useCreateDuelFlowLifecycle({
      appToast,
      error: null,
      flow,
      identityToken: 'token',
      isConfirming: false,
      isPending: false,
      isSuccess: true,
      receipt: { logs: [] } as unknown as TransactionReceipt,
      refetchAllowance: async () => undefined,
      reset: () => {},
      setFlow: () => {},
      setRedirectTarget: () => {},
      t: (key) => key,
    })
  );
  return appToast;
}

describe('useCreateDuelFlowLifecycle', () => {
  it('reports a game tag that could not be saved as an error', async () => {
    const appToast = renderCreatedDuel();

    await waitFor(() => expect(appToast.error).toHaveBeenCalledWith('toast.gameAttachFailed'));
    expect(appToast.info).not.toHaveBeenCalled();
  });

  it('saves the game with its category, so a game added on the create page joins the catalog', async () => {
    renderCreatedDuel();

    await waitFor(() =>
      expect(attachGameToDuel).toHaveBeenCalledWith('token', 7, DEFAULT_CHAIN.id, DUELME_ADDRESSES[DEFAULT_CHAIN.id], 'CS2', 'FPS')
    );
  });
});
