'use client';

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { TransactionReceipt } from 'viem';
import { classifyFlowError } from '@/lib/flowError';
import { reduceFlow, type FlowCore } from '@/lib/flowSession';

/** The parts of `useDuelActions` that tell how the write a flow sent is going. */
export interface FlowWrite {
  error: unknown;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  receipt: TransactionReceipt | undefined;
  reset: () => void;
}

interface UseFlowLifecycleOptions<TStage extends string, TFlow extends FlowCore<TStage>> {
  flow: TFlow | null;
  setFlow: Dispatch<SetStateAction<TFlow | null>>;
  write: FlowWrite;
  /** The network the flow writes to, for wording what goes wrong there. */
  chainId: number;
  /** The wallet pays its own network fees, so its receipts count towards what the flow cost it. */
  paysOwnFees: boolean;
  /**
   * A write went through: whatever the flow does about it, and the stage it goes on to — or null
   * while it still waits for something, such as the receipt that names a new duel.
   */
  onWritten: (step: TStage, receipt: TransactionReceipt | undefined) => TStage | null;
}

/**
 * Follows the write a signing flow sent until it ends: in the wallet, then on the network, then
 * confirmed or failed. The one lifecycle the action, join and create flows share, each saying in
 * `onWritten` what a confirmed write means to it.
 */
export function useFlowLifecycle<TStage extends string, TFlow extends FlowCore<TStage>>({
  flow,
  setFlow,
  write,
  chainId,
  paysOwnFees,
  onWritten,
}: UseFlowLifecycleOptions<TStage, TFlow>) {
  const { error, isPending, isConfirming, isSuccess, receipt, reset } = write;
  const step = flow?.pendingTransaction ?? null;

  useEffect(() => {
    if (step === null) {
      return;
    }

    if (error) {
      reset();
      const failure = classifyFlowError(error, { chainId });
      setFlow((current) => current && reduceFlow<TFlow>(current, { type: 'failed', step, error: failure }));
      return;
    }

    if (isPending || isConfirming) {
      const actionState = isPending ? 'awaiting-wallet' : 'confirming';
      setFlow((current) => current && reduceFlow<TFlow>(current, { type: 'progressed', actionState }));
      return;
    }

    if (!isSuccess) {
      return;
    }

    const next = onWritten(step, receipt);
    if (next === null) {
      return;
    }

    reset();
    const feeWei = paysOwnFees && receipt ? receipt.gasUsed * receipt.effectiveGasPrice : 0n;
    setFlow((current) => current && reduceFlow<TFlow>(current, { type: 'wrote', step, next, feeWei }));
  }, [step, error, isPending, isConfirming, isSuccess, receipt, reset, chainId, paysOwnFees, onWritten, setFlow]);
}
