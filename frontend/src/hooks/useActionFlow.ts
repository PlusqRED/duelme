'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { useDuelActions } from '@/hooks/useDuelActions';
import { useFlowLifecycle } from '@/hooks/useFlowLifecycle';
import { DEFAULT_CHAIN } from '@/lib/constants';
import { classifyFlowError } from '@/lib/flowError';
import { reduceFlow, startFlow, type FlowEvent } from '@/lib/flowSession';
import type { ActionFlowConfig, ActionFlowSession, ActionFlowStage, ActionFlowState } from '@/lib/actionFlow';

interface UseActionFlowArgs {
  duelId: number;
  refetchDuel: () => void;
}

/**
 * One duel action signed in the signing window: open it with the action's config, then review,
 * switch the network if the wallet is elsewhere, and send. The write's progress comes from
 * `useDuelActions` through the flows' shared lifecycle.
 */
export function useActionFlow({ duelId, refetchDuel }: UseActionFlowArgs) {
  const { switchChainAsync } = useSwitchChain();
  const { chainId: connectedChainId } = useAccount();
  const chainConfig = DEFAULT_CHAIN;

  const actions = useDuelActions(chainConfig.id);
  const [state, setState] = useState<ActionFlowState | null>(null);
  const [activeConfig, setActiveConfig] = useState<ActionFlowConfig | null>(null);

  const dispatch = useCallback(
    (event: FlowEvent<ActionFlowStage>) => setState((current) => current && reduceFlow(current, event)),
    []
  );

  const onWritten = useCallback((): ActionFlowStage => {
    refetchDuel();
    activeConfig?.onSuccess?.();
    return 'success';
  }, [refetchDuel, activeConfig]);

  useFlowLifecycle<ActionFlowStage, ActionFlowState>({
    flow: state,
    setFlow: setState,
    write: actions,
    chainId: chainConfig.id,
    paysOwnFees: !actions.isRelayEnabled,
    onWritten,
  });

  function openFlow(config: ActionFlowConfig) {
    actions.reset();
    setActiveConfig(config);
    setState({
      ...startFlow<ActionFlowStage>('review'),
      actionType: config.type,
      duelId: BigInt(duelId),
      chainId: chainConfig.id,
      chainName: chainConfig.name,
    });
  }

  function closeFlow() {
    setState(null);
    setActiveConfig(null);
    actions.reset();
  }

  function handleContinue() {
    if (!state) return;
    dispatch({ type: 'moved', stage: connectedChainId === state.chainId ? 'execute' : 'switch-network' });
  }

  async function handleSwitchNetwork() {
    if (!state) return;
    dispatch({ type: 'switching', stage: 'switch-network' });
    try {
      await switchChainAsync({ chainId: state.chainId });
      dispatch({ type: 'switched', next: 'execute' });
    } catch (switchError) {
      dispatch({ type: 'failed', error: classifyFlowError(switchError, { chainId: state.chainId, isNetworkSwitch: true }) });
    }
  }

  function handleExecute() {
    if (!state || !activeConfig) return;
    if (connectedChainId !== state.chainId) {
      dispatch({ type: 'moved', stage: 'switch-network' });
      return;
    }
    actions.reset();
    dispatch({ type: 'writing', step: 'execute' });
    const failed = (executeError: unknown) => {
      actions.reset();
      dispatch({ type: 'failed', step: 'execute', error: classifyFlowError(executeError, { chainId: state.chainId }) });
    };
    try {
      void Promise.resolve(activeConfig.execute()).catch(failed);
    } catch (executeError) {
      failed(executeError);
    }
  }

  const flow = useMemo<ActionFlowSession | null>(
    () =>
      state && {
        ...state,
        signing: {
          phase: actions.signingPhase,
          hash: actions.hash,
          failedWhile: state.failedWhile,
          feePaidWei: state.feePaidWei,
          createdDuelId: null,
        },
      },
    [state, actions.signingPhase, actions.hash]
  );

  // Closing while the wallet or the network still works on it would hide a result that is coming.
  const canClose = state?.actionState !== 'awaiting-wallet' && state?.actionState !== 'confirming';

  const needsNetworkSwitch =
    state !== null &&
    (state.stage === 'switch-network' || (state.stage === 'review' && connectedChainId !== state.chainId));

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
