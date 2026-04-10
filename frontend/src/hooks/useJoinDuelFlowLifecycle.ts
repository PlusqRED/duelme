'use client';

import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { useTranslation } from '@/i18n/useTranslation';
import { emitBalanceRefresh } from '@/lib/balanceRefresh';
import { getGuidedFlowErrorMessage } from '@/lib/guidedFlowRuntime';
import type { JoinDuelFlowSession } from '@/lib/joinDuelFlow';

interface UseJoinDuelFlowLifecycleOptions {
  error: unknown;
  flow: JoinDuelFlowSession | null;
  isConfirming: boolean;
  isPending: boolean;
  isSuccess: boolean;
  refetchAllowance: () => Promise<unknown>;
  refetchDuel: () => void;
  reset: () => void;
  setFlow: Dispatch<SetStateAction<JoinDuelFlowSession | null>>;
  t: ReturnType<typeof useTranslation>['t'];
}

export function useJoinDuelFlowLifecycle({
  error,
  flow,
  isConfirming,
  isPending,
  isSuccess,
  refetchAllowance,
  refetchDuel,
  reset,
  setFlow,
  t,
}: UseJoinDuelFlowLifecycleOptions) {
  useEffect(() => {
    if (!flow?.pendingTransaction) {
      return;
    }

    if (error) {
      reset();
      setFlow((current) =>
        !current || current.pendingTransaction !== flow.pendingTransaction
          ? current
          : {
              ...current,
              actionState: 'error',
              errorMessage: getGuidedFlowErrorMessage(
                error,
                t,
                current.draft.chainName
              ),
              pendingTransaction: null,
            }
      );
      return;
    }

    if (isPending || isConfirming) {
      setFlow((current) => {
        if (!current) {
          return current;
        }

        const nextActionState = isPending ? 'awaiting-wallet' : 'confirming';
        return current.actionState === nextActionState
          ? current
          : { ...current, actionState: nextActionState };
      });
      return;
    }

    if (!isSuccess) {
      return;
    }

    if (flow.pendingTransaction === 'approve') {
      reset();
      void refetchAllowance();
      setFlow((current) =>
        !current || current.pendingTransaction !== 'approve'
          ? current
          : {
              ...current,
              completedSteps: {
                ...current.completedSteps,
                approve: true,
              },
              stage: 'join-duel',
              actionState: 'idle',
              errorMessage: null,
              pendingTransaction: null,
            }
      );
      return;
    }

    if (flow.pendingTransaction !== 'join-duel') {
      return;
    }

    reset();
    emitBalanceRefresh();
    void refetchAllowance();
    refetchDuel();

    setFlow((current) =>
      !current || current.pendingTransaction !== 'join-duel'
        ? current
        : {
            ...current,
            stage: 'success',
            actionState: 'idle',
            errorMessage: null,
            pendingTransaction: null,
          }
    );
  }, [
    error,
    flow,
    isConfirming,
    isPending,
    isSuccess,
    refetchAllowance,
    refetchDuel,
    reset,
    setFlow,
    t,
  ]);
}
