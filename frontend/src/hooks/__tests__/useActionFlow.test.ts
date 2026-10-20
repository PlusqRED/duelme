// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { UserRejectedRequestError } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionFlowConfig } from '@/lib/actionFlow';
import { DEFAULT_CHAIN } from '@/lib/constants';

const OTHER_CHAIN = 1;

const wallet = vi.hoisted(() => ({
  chainId: 0,
  switchChainAsync: vi.fn(async () => undefined),
  write: {
    error: null as unknown,
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    receipt: undefined,
    hash: undefined,
    isRelayEnabled: true,
    signingPhase: null as 'permit' | 'request' | null,
    reset: vi.fn(),
  },
}));

vi.mock('wagmi', () => ({
  useAccount: () => ({ chainId: wallet.chainId }),
  useSwitchChain: () => ({ switchChainAsync: wallet.switchChainAsync }),
}));
vi.mock('@/hooks/useDuelActions', () => ({ useDuelActions: () => wallet.write }));

const { useActionFlow } = await import('@/hooks/useActionFlow');

const rejected = () => new UserRejectedRequestError(new Error('User rejected the request.'));

beforeEach(() => {
  wallet.chainId = DEFAULT_CHAIN.id;
  wallet.write = { ...wallet.write, error: null, isPending: false, isConfirming: false, isSuccess: false, signingPhase: null };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function config(execute: ActionFlowConfig['execute'] = vi.fn(), onSuccess = vi.fn()): ActionFlowConfig {
  return { type: 'cancelDuel', execute, onSuccess };
}

function renderFlow() {
  const refetchDuel = vi.fn();
  const hook = renderHook(() => useActionFlow({ duelId: 6, refetchDuel }));
  return { ...hook, refetchDuel };
}

describe('useActionFlow', () => {
  it('testUseActionFlowOpensOnReview', () => {
    const { result } = renderFlow();

    act(() => result.current.openFlow(config()));

    expect(result.current.flow?.stage).toBe('review');
    expect(result.current.flow?.actionType).toBe('cancelDuel');
    expect(result.current.flow?.duelId).toBe(6n);
  });

  it('testUseActionFlowGoesStraightToTheWriteOnTheRightNetwork', () => {
    const { result } = renderFlow();
    act(() => result.current.openFlow(config()));

    act(() => result.current.handleContinue());

    expect(result.current.flow?.stage).toBe('execute');
  });

  it('testUseActionFlowSwitchesNetworksFirstOnAnotherOne', () => {
    wallet.chainId = OTHER_CHAIN;
    const { result } = renderFlow();
    act(() => result.current.openFlow(config()));

    act(() => result.current.handleContinue());

    expect(result.current.flow?.stage).toBe('switch-network');
    expect(result.current.needsNetworkSwitch).toBe(true);
  });

  it('testUseActionFlowSendsTheActionAndHoldsTheWindowOpen', () => {
    const execute = vi.fn();
    const { result } = renderFlow();
    act(() => result.current.openFlow(config(execute)));

    act(() => result.current.handleExecute());

    expect(execute).toHaveBeenCalledOnce();
    expect(result.current.flow?.actionState).toBe('awaiting-wallet');
    expect(result.current.canClose).toBe(false);
  });

  it('testUseActionFlowWordsAnActionTheWalletTurnedDown', async () => {
    const { result } = renderFlow();
    act(() => result.current.openFlow(config(vi.fn(async () => Promise.reject(rejected())))));

    await act(async () => result.current.handleExecute());

    expect(result.current.flow?.actionState).toBe('error');
    expect(result.current.flow?.errorMessage?.kind).toBe('rejected');
    expect(result.current.canClose).toBe(true);
  });

  it('testUseActionFlowFinishesOnceTheWriteIsConfirmed', () => {
    const onSuccess = vi.fn();
    const { result, rerender, refetchDuel } = renderFlow();
    act(() => result.current.openFlow(config(vi.fn(), onSuccess)));
    act(() => result.current.handleExecute());

    wallet.write = { ...wallet.write, isSuccess: true };
    rerender();

    expect(result.current.flow?.stage).toBe('success');
    expect(refetchDuel).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('testUseActionFlowSaysTheWalletStayedOnAnotherNetwork', async () => {
    wallet.chainId = OTHER_CHAIN;
    wallet.switchChainAsync.mockRejectedValueOnce(rejected());
    const { result } = renderFlow();
    act(() => result.current.openFlow(config()));

    await act(async () => result.current.handleSwitchNetwork());

    expect(result.current.flow?.actionState).toBe('error');
    expect(result.current.flow?.errorMessage?.kind).toBe('network');
  });

  it('testUseActionFlowPassesOnWhichSignatureTheWalletIsAskedFor', () => {
    wallet.write = { ...wallet.write, signingPhase: 'request' };
    const { result } = renderFlow();

    act(() => result.current.openFlow(config()));

    expect(result.current.flow?.signing.phase).toBe('request');
  });

  it('testUseActionFlowClosesToNothing', () => {
    const { result } = renderFlow();
    act(() => result.current.openFlow(config()));

    act(() => result.current.handleFlowOpenChange(false));

    expect(result.current.flow).toBeNull();
    expect(result.current.activeConfig).toBeNull();
  });
});
