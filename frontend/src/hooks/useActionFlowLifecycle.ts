'use client';

import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { useTranslation } from '@/i18n/useTranslation';
import { getGuidedFlowErrorMessage } from '@/lib/guidedFlowRuntime';
import type { ActionFlowConfig, ActionFlowSession } from '@/lib/actionFlow';

interface UseActionFlowLifecycleOptions {
  error: unknown;
  flow: ActionFlowSession | null;
  activeConfig: ActionFlowConfig | null;
  isConfirming: boolean;
  isPending: boolean;
  isSuccess: boolean;
  refetchDuel: () => void;
  reset: () => void;
  setFlow: Dispatch<SetStateAction<ActionFlowSession | null>>;
  t: ReturnType<typeof useTranslation>['t'];
}

export function useActionFlowLifecycle({
  error,
  flow,
  activeConfig,
  isConfirming,
  isPending,
  isSuccess,
  refetchDuel,
  reset,
  setFlow,
  t,
}: UseActionFlowLifecycleOptions) {
  useEffect(() => {
    if (!flow?.pendingTransaction) {
      return;
    }

    if (error) {
      reset();
      setFlow((current) =>
        !current || !current.pendingTransaction
          ? current
          : {
              ...current,
              actionState: 'error',
              errorMessage: getGuidedFlowErrorMessage(error, t, current.chainName),
              pendingTransaction: false,
            }
      );
      return;
    }

    if (isPending || isConfirming) {
      setFlow((current) => {
        if (!current) return current;
        const next = isPending ? 'awaiting-wallet' : 'confirming';
        return current.actionState === next ? current : { ...current, actionState: next };
      });
      return;
    }

    if (!isSuccess) {
      return;
    }

    reset();
    refetchDuel();
    activeConfig?.onSuccess?.();

    setFlow((current) =>
      !current || !current.pendingTransaction
        ? current
        : {
            ...current,
            stage: 'success',
            actionState: 'idle',
            errorMessage: null,
            pendingTransaction: false,
          }
    );
  }, [error, flow, activeConfig, isConfirming, isPending, isSuccess, refetchDuel, reset, setFlow, t]);
}
