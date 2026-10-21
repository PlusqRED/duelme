// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import type { TransactionReceipt } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN, DEFAULT_CHAIN_KEY } from '@/lib/constants';

const RECEIPT = { logs: [], gasUsed: 0n, effectiveGasPrice: 0n } as unknown as TransactionReceipt;

const env = vi.hoisted(() => ({
  createdDuelId: 12 as number | null,
  recordCreatedDuel: vi.fn(),
  emitBalanceRefresh: vi.fn(),
  write: {
    error: null as unknown,
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    receipt: undefined as unknown,
    hash: undefined,
    isRelayEnabled: true,
    signingPhase: null,
    reset: vi.fn(),
    createDuel: vi.fn(async () => undefined),
    approveToken: vi.fn(async () => undefined),
  },
}));

vi.mock('wagmi', () => ({
  useAccount: () => ({ chainId: DEFAULT_CHAIN.id }),
  useReadContract: () => ({ data: undefined, refetch: vi.fn(async () => ({ data: undefined })) }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}));
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ ready: true, authenticated: true, login: vi.fn() }),
  useIdentityToken: () => ({ identityToken: 'token' }),
}));
vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () => ({ activeWallet: { address: '0x4BFa1486661d6FAa5300923bd684F261AE4776a5' }, walletAddress: '0x4bfa1486661d6faa5300923bd684f261ae4776a5' }),
}));
vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), transactionError: vi.fn() }) }));
vi.mock('@/hooks/useDuelActions', () => ({ useDuelActions: () => env.write }));
vi.mock('@/hooks/useFlowFunding', () => ({
  useFlowFunding: () => ({
    funding: { balance: { kind: 'ready', raw: 50_000_000n }, status: { kind: 'enough' }, isTopUpOpen: false, retry: vi.fn(), openTopUp: vi.fn(), closeTopUp: vi.fn() },
    markOpened: vi.fn(),
  }),
}));
vi.mock('@/lib/balanceRefresh', () => ({ emitBalanceRefresh: env.emitBalanceRefresh }));
vi.mock('@/lib/createDuelFlowRuntime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/createDuelFlowRuntime')>()),
  recordCreatedDuel: (options: unknown) => {
    env.recordCreatedDuel(options);
    return env.createdDuelId;
  },
}));

const { useCreateDuelFlow } = await import('@/hooks/useCreateDuelFlow');

beforeEach(() => {
  env.createdDuelId = 12;
  env.write = { ...env.write, error: null, isPending: false, isConfirming: false, isSuccess: false, receipt: undefined };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCreate(isPublic = false) {
  return renderHook(() =>
    useCreateDuelFlow({
      amount: '5',
      message: '',
      gameName: 'CS2',
      isPublic,
      selectedChain: DEFAULT_CHAIN_KEY,
      isValidAmount: true,
      isValidMessage: true,
    })
  );
}

/** Opens the flow, goes past review and sends the create, as the window's one press does. */
async function sendCreate(result: ReturnType<typeof renderCreate>['result']) {
  await act(async () => result.current.handleCreateDuelClick());
  await act(async () => result.current.handleContinueFlow());
  await act(async () => result.current.handleCreateTransaction());
}

describe('useCreateDuelFlow', () => {
  it('testUseCreateDuelFlowSendsTheCreateWithTheDraftsStake', async () => {
    const { result } = renderCreate();

    await sendCreate(result);

    expect(env.write.createDuel).toHaveBeenCalledWith(5_000_000n, result.current.flow?.draft.inviteHash, '');
    expect(result.current.canCloseFlow).toBe(false);
  });

  it('testUseCreateDuelFlowRecordsTheNewDuelOnceConfirmed', async () => {
    const { result, rerender } = renderCreate();
    await sendCreate(result);

    env.write = { ...env.write, isSuccess: true, receipt: RECEIPT };
    rerender();

    expect(env.recordCreatedDuel).toHaveBeenCalledOnce();
    expect(env.emitBalanceRefresh).toHaveBeenCalled();
    expect(result.current.flow?.stage).toBe('success');
    expect(result.current.review.signing.createdDuelId).toBe(12);
  });

  it('testUseCreateDuelFlowGivesThePrivateDuelsPathWithItsSecret', async () => {
    const { result, rerender } = renderCreate();
    await sendCreate(result);

    env.write = { ...env.write, isSuccess: true, receipt: RECEIPT };
    rerender();

    expect(result.current.createdDuelPath).toBe(`/duel/12#${result.current.flow?.draft.inviteSecret}`);
  });

  it('testUseCreateDuelFlowLetsTheWindowCloseWhenDone', async () => {
    const { result, rerender } = renderCreate(true);
    await sendCreate(result);

    env.write = { ...env.write, isSuccess: true, receipt: RECEIPT };
    rerender();

    expect(result.current.canCloseFlow).toBe(true);
    expect(result.current.createdDuelPath).toBe('/duel/12');
  });

  it('testUseCreateDuelFlowKeepsTheNewDuelsPathOnceTheWindowCloses', async () => {
    const { result, rerender } = renderCreate(true);
    await sendCreate(result);
    env.write = { ...env.write, isSuccess: true, receipt: RECEIPT };
    rerender();

    act(() => result.current.closeFlow());

    expect(result.current.flow).toBeNull();
    expect(result.current.createdDuelPath).toBe('/duel/12');
  });

  it('testUseCreateDuelFlowRunsOnOutOfSightWhenLeftWhileConfirming', async () => {
    const { result, rerender } = renderCreate();
    await sendCreate(result);
    env.write = { ...env.write, isConfirming: true };
    rerender();

    act(() => result.current.handleFlowOpenChange(false));

    expect(result.current.isFlowOpen).toBe(false);
    expect(result.current.flow?.actionState).toBe('confirming');
    expect(env.write.reset).not.toHaveBeenCalledAfter(env.write.createDuel);
  });

  it('testUseCreateDuelFlowRecordsADuelLeftWhileConfirming', async () => {
    const { result, rerender } = renderCreate();
    await sendCreate(result);
    env.write = { ...env.write, isConfirming: true };
    rerender();
    act(() => result.current.handleFlowOpenChange(false));
    const secret = result.current.flow?.draft.inviteSecret;

    env.write = { ...env.write, isConfirming: false, isSuccess: true, receipt: RECEIPT };
    rerender();

    expect(env.recordCreatedDuel).toHaveBeenCalledOnce();
    expect(result.current.flow).toBeNull();
    expect(result.current.createdDuelPath).toBe(`/duel/12#${secret}`);
  });

  it('testUseCreateDuelFlowBringsALeftWindowBackOnFailure', async () => {
    const { result, rerender } = renderCreate();
    await sendCreate(result);
    env.write = { ...env.write, isConfirming: true };
    rerender();
    act(() => result.current.handleFlowOpenChange(false));

    env.write = { ...env.write, isConfirming: false, error: new Error('execution reverted') };
    rerender();

    expect(result.current.isFlowOpen).toBe(true);
    expect(result.current.flow?.actionState).toBe('error');
  });

  it('testUseCreateDuelFlowWaitsForTheReceiptThatNamesTheDuel', async () => {
    const { result, rerender } = renderCreate();
    await sendCreate(result);

    env.write = { ...env.write, isSuccess: true, receipt: undefined };
    rerender();

    expect(result.current.flow?.stage).toBe('create-duel');
    expect(result.current.createdDuelPath).toBeNull();
  });
});
