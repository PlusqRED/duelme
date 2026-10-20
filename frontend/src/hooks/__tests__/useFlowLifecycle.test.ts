// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { UserRejectedRequestError, type TransactionReceipt } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFlowLifecycle, type FlowWrite } from '@/hooks/useFlowLifecycle';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { startFlow, type FlowCore } from '@/lib/flowSession';

type Stage = 'review' | 'approve' | 'write' | 'success';
type Flow = FlowCore<Stage>;

const RECEIPT = { gasUsed: 100_000n, effectiveGasPrice: 20_000_000n } as unknown as TransactionReceipt;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function writing(step: Stage): Flow {
  return { ...startFlow<Stage>('review'), stage: step, actionState: 'awaiting-wallet', pendingTransaction: step };
}

function idleWrite(overrides: Partial<FlowWrite> = {}): FlowWrite {
  return { error: null, isPending: false, isConfirming: false, isSuccess: false, receipt: undefined, reset: vi.fn(), ...overrides };
}

interface Setup {
  initial: Flow | null;
  write: FlowWrite;
  paysOwnFees?: boolean;
  onWritten?: (step: Stage, receipt: TransactionReceipt | undefined) => Stage | null;
}

function renderLifecycle({ initial, write, paysOwnFees = false, onWritten = () => 'success' }: Setup) {
  return renderHook(
    ({ write: current }: { write: FlowWrite }) => {
      const [flow, setFlow] = useState<Flow | null>(initial);
      useFlowLifecycle<Stage, Flow>({ flow, setFlow, write: current, chainId: DEFAULT_CHAIN_ID, paysOwnFees, onWritten });
      return flow;
    },
    { initialProps: { write } }
  );
}

describe('useFlowLifecycle', () => {
  it('testUseFlowLifecycleFollowsTheWriteOntoTheNetwork', () => {
    const { result } = renderLifecycle({ initial: writing('write'), write: idleWrite({ isConfirming: true }) });

    expect(result.current?.actionState).toBe('confirming');
  });

  it('testUseFlowLifecycleWordsAFailureAndClearsTheWrite', () => {
    const write = idleWrite({ error: new UserRejectedRequestError(new Error('User rejected the request.')) });

    const { result } = renderLifecycle({ initial: writing('write'), write });

    expect(result.current?.actionState).toBe('error');
    expect(result.current?.errorMessage?.kind).toBe('rejected');
    expect(write.reset).toHaveBeenCalled();
  });

  it('testUseFlowLifecycleGoesOnToTheStageTheFlowNames', () => {
    const onWritten = vi.fn((): Stage => 'write');

    const { result } = renderLifecycle({ initial: writing('approve'), write: idleWrite({ isSuccess: true, receipt: RECEIPT }), onWritten });

    expect(onWritten).toHaveBeenCalledWith('approve', RECEIPT);
    expect(result.current?.stage).toBe('write');
    expect(result.current?.completedSteps.approve).toBe(true);
  });

  it('testUseFlowLifecycleCountsTheFeeAWalletPaysItself', () => {
    const { result } = renderLifecycle({ initial: writing('write'), write: idleWrite({ isSuccess: true, receipt: RECEIPT }), paysOwnFees: true });

    expect(result.current?.feePaidWei).toBe(2_000_000_000_000n);
  });

  it('testUseFlowLifecycleCountsNoFeeOnTheRelayedPath', () => {
    const { result } = renderLifecycle({ initial: writing('write'), write: idleWrite({ isSuccess: true, receipt: RECEIPT }) });

    expect(result.current?.feePaidWei).toBe(0n);
  });

  it('testUseFlowLifecycleWaitsWhileTheFlowStillNeedsSomething', () => {
    const write = idleWrite({ isSuccess: true });

    const { result } = renderLifecycle({ initial: writing('write'), write, onWritten: () => null });

    expect(result.current?.stage).toBe('write');
    expect(write.reset).not.toHaveBeenCalled();
  });

  it('testUseFlowLifecycleIgnoresAWriteNoStepSent', () => {
    const write = idleWrite({ error: new Error('stale') });
    const initial = startFlow<Stage>('review');

    const { result } = renderLifecycle({ initial, write });

    expect(result.current).toBe(initial);
    expect(write.reset).not.toHaveBeenCalled();
  });
});
