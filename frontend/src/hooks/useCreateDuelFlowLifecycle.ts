'use client';

import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { TransactionReceipt } from 'viem';
import type { useAppToast } from '@/hooks/useAppToast';
import { attachGameToDuel } from '@/lib/gameApi';
import { emitBalanceRefresh } from '@/lib/balanceRefresh';
import { buildDuelPath, extractCreatedDuelId } from '@/lib/createDuelFlowRuntime';
import { getGuidedFlowErrorMessage } from '@/lib/guidedFlowRuntime';
import type { CreateDuelFlowSession } from '@/lib/createDuelFlow';
import { storeInviteSecret } from '@/lib/invite';
import type { useTranslation } from '@/i18n/useTranslation';

interface UseCreateDuelFlowLifecycleOptions {
  appToast: ReturnType<typeof useAppToast>;
  error: unknown;
  flow: CreateDuelFlowSession | null;
  identityToken: string | null | undefined;
  isConfirming: boolean;
  isPending: boolean;
  isSuccess: boolean;
  receipt: TransactionReceipt | null | undefined;
  refetchAllowance: () => Promise<unknown>;
  reset: () => void;
  setFlow: Dispatch<SetStateAction<CreateDuelFlowSession | null>>;
  setRedirectTarget: Dispatch<SetStateAction<string | null>>;
  t: ReturnType<typeof useTranslation>['t'];
}

export function useCreateDuelFlowLifecycle({
  appToast,
  error,
  flow,
  identityToken,
  isConfirming,
  isPending,
  isSuccess,
  receipt,
  refetchAllowance,
  reset,
  setFlow,
  setRedirectTarget,
  t,
}: UseCreateDuelFlowLifecycleOptions) {
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
              stage: 'create-duel',
              actionState: 'idle',
              errorMessage: null,
              pendingTransaction: null,
            }
      );
      return;
    }

    if (flow.pendingTransaction !== 'create-duel' || !receipt) {
      return;
    }

    reset();
    emitBalanceRefresh();
    void refetchAllowance();

    const duelId = extractCreatedDuelId(receipt);
    const nextRoute = duelId ? buildDuelPath(duelId, flow.draft.inviteSecret) : '/dashboard';

    if (duelId && flow.draft.inviteSecret) {
      storeInviteSecret(flow.draft.chainId, flow.draft.contractAddress, Number(duelId), flow.draft.inviteSecret);
    }

    if (duelId && flow.draft.gameName && identityToken) {
      attachGameToDuel(
        identityToken,
        Number(duelId),
        flow.draft.chainId,
        flow.draft.contractAddress,
        flow.draft.gameName
      ).catch(() => {
        appToast.info('toast.gameAttachFailed');
      });
    }

    setRedirectTarget(nextRoute);
    setFlow((current) =>
      !current || current.pendingTransaction !== 'create-duel'
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
    identityToken,
    isConfirming,
    isPending,
    isSuccess,
    receipt,
    refetchAllowance,
    reset,
    setFlow,
    setRedirectTarget,
    appToast,
    t,
  ]);
}
