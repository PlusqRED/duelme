'use client';

import { useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useTranslation } from '@/i18n/useTranslation';
import { useDuelActions } from '@/hooks/useDuelActions';
import { useActionFlowLifecycle } from '@/hooks/useActionFlowLifecycle';
import { getGuidedFlowErrorMessage } from '@/lib/guidedFlowRuntime';
import { DEFAULT_CHAIN } from '@/lib/constants';
import type { ActionFlowConfig, ActionFlowSession } from '@/lib/actionFlow';

interface UseActionFlowArgs {
  duelId: number;
  refetchDuel: () => void;
}

export function useActionFlow({ duelId, refetchDuel }: UseActionFlowArgs) {
  const { t } = useTranslation();
  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();
  const chainConfig = DEFAULT_CHAIN;

  const actions = useDuelActions(chainConfig.id);
  const [flow, setFlow] = useState<ActionFlowSession | null>(null);
  const [activeConfig, setActiveConfig] = useState<ActionFlowConfig | null>(null);

  useActionFlowLifecycle({
    error: actions.error,
    flow,
    activeConfig,
    isConfirming: actions.isConfirming,
    isPending: actions.isPending,
    isSuccess: actions.isSuccess,
    refetchDuel,
    reset: actions.reset,
    setFlow,
    t,
  });

  function openFlow(config: ActionFlowConfig) {
    actions.reset();
    setActiveConfig(config);
    setFlow({
      actionType: config.type,
      duelId: BigInt(duelId),
      chainId: chainConfig.id,
      chainName: chainConfig.name,
      stage: 'review',
      actionState: 'idle',
      errorMessage: null,
      pendingTransaction: false,
      completedSwitchNetwork: false,
    });
  }

  function closeFlow() {
    setFlow(null);
    setActiveConfig(null);
    actions.reset();
  }

  function handleContinue() {
    if (!flow) return;
    if (connectedChainId !== flow.chainId) {
      setFlow((c) => c ? { ...c, stage: 'switch-network', actionState: 'idle', errorMessage: null } : c);
      return;
    }
    setFlow((c) => c ? { ...c, stage: 'execute', actionState: 'idle', errorMessage: null } : c);
  }

  async function handleSwitchNetwork() {
    if (!flow) return;
    setFlow((c) => c ? { ...c, stage: 'switch-network', actionState: 'awaiting-wallet', errorMessage: null } : c);
    try {
      await switchChainAsync({ chainId: flow.chainId });
      setFlow((c) =>
        c ? { ...c, completedSwitchNetwork: true, stage: 'execute', actionState: 'idle', errorMessage: null } : c
      );
    } catch (switchError) {
      setFlow((c) =>
        c
          ? {
              ...c,
              actionState: 'error',
              errorMessage: getGuidedFlowErrorMessage(switchError, t, c.chainName, 'create.flow.error.switch'),
              pendingTransaction: false,
            }
          : c
      );
    }
  }

  function handleExecute() {
    if (!flow || !activeConfig) return;
    if (connectedChainId !== flow.chainId) {
      setFlow((c) => c ? { ...c, stage: 'switch-network', actionState: 'idle', errorMessage: null } : c);
      return;
    }
    actions.reset();
    setFlow((c) =>
      c ? { ...c, stage: 'execute', actionState: 'awaiting-wallet', errorMessage: null, pendingTransaction: true } : c
    );
    try {
      activeConfig.execute();
    } catch (executeError) {
      actions.reset();
      setFlow((c) =>
        c
          ? {
              ...c,
              actionState: 'error',
              errorMessage: getGuidedFlowErrorMessage(executeError, t, c.chainName),
              pendingTransaction: false,
            }
          : c
      );
    }
  }

  const canClose =
    flow?.actionState !== 'awaiting-wallet' &&
    flow?.actionState !== 'confirming' &&
    flow?.stage !== 'success';

  const needsNetworkSwitch =
    flow !== null &&
    (flow.stage === 'switch-network' ||
      (flow.stage === 'review' && connectedChainId !== flow.chainId));

  return {
    flow,
    activeConfig,
    canClose,
    needsNetworkSwitch,
    openFlow,
    closeFlow,
    handleContinue,
    handleSwitchNetwork,
    handleExecute,
    handleFlowOpenChange: (open: boolean) => { if (!open) closeFlow(); },
    duelActions: actions,
  };
}
