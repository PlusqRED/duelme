'use client';

import { SigningWindow } from '@/components/sign/SigningWindow';
import { signItems } from '@/components/sign/signItems';
import type { SigningModel } from '@/components/sign/signingModel';
import { useContractConfig } from '@/hooks/useContractConfig';
import { useLastNonNull } from '@/hooks/useLastNonNull';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useTranslation } from '@/i18n/useTranslation';
import {
  ACTION_FUNCTIONS,
  type ActionFlowConfig,
  type ActionFlowSession,
  type ActionFlowStage,
  type ActionFlowSummaryContext,
} from '@/lib/actionFlow';
import { DEFAULT_CHAIN, DUELME_ADDRESSES } from '@/lib/constants';
import { ACTION_COPY, actionCopyParams, closesTimedOutDuel, signActionOf } from '@/lib/signingCopy';
import type { FlowPlace } from '@/lib/signingSteps';
import { signPlan } from '@/lib/signPlan';
import { durationWords } from '@/lib/timeWords';
import { resolveWriteRoute } from '@/lib/writeRoute';

interface ActionSigningWindowProps {
  open: boolean;
  canClose: boolean;
  flow: ActionFlowSession | null;
  config: ActionFlowConfig | null;
  needsNetworkSwitch: boolean;
  summaryContext: ActionFlowSummaryContext;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onSwitchNetwork: () => void;
  onExecute: () => void;
  onDone: () => void;
}

const PLACES: Record<ActionFlowStage, FlowPlace> = {
  review: 'review',
  'switch-network': 'switch-network',
  execute: 'write',
  success: 'success',
};

/**
 * A duel action (`useActionFlow`) in the signing window: one signature DuelMe sends, or one
 * transaction the wallet pays for when relaying is off. It keeps showing the last action while it
 * closes.
 */
export function ActionSigningWindow({
  open,
  canClose,
  flow,
  config,
  needsNetworkSwitch,
  summaryContext,
  onOpenChange,
  onContinue,
  onSwitchNetwork,
  onExecute,
  onDone,
}: ActionSigningWindowProps) {
  const { t, plural } = useTranslation();
  const shownFlow = useLastNonNull(flow);
  const shownConfig = useLastNonNull(config);
  const chainId = shownFlow?.chainId ?? DEFAULT_CHAIN.id;
  const { isRelayEnabled } = useRelayerStatus(chainId);
  const { claimTimeout } = useContractConfig(chainId);

  if (!shownFlow || !shownConfig) {
    return null;
  }

  const contract = DUELME_ADDRESSES[shownFlow.chainId];
  const functionName = ACTION_FUNCTIONS[shownConfig.type];
  const route = resolveWriteRoute({ isRelayEnabled, target: contract, contractAddress: contract, functionName });
  const copy = ACTION_COPY[signActionOf(shownConfig)];
  const count = shownConfig.batch?.count ?? 1;
  const params = {
    ...actionCopyParams(summaryContext, shownConfig),
    timeout: durationWords(claimTimeout, plural),
    duels: plural('sign.collect.fromDuels', count),
  };
  const move = t(closesTimedOutDuel(shownConfig) && copy.timeoutMove ? copy.timeoutMove : copy.move, params);
  const close = () => onOpenChange(false);

  const model: SigningModel = {
    open,
    copy,
    title: t(copy.title, params),
    sub: shownConfig.batch
      ? t('sign.collect.sub', { count, duels: plural('sign.collect.duels', count) })
      : t('duel.title', { id: summaryContext.duelId }),
    caption: t(copy.caption, params),
    button: t(copy.button, params),
    doneTitle: t(copy.doneTitle, params),
    doneText: t(copy.doneText, params),
    doneButton: t(copy.back),
    backLabel: t(copy.back),
    slowText: t('sign.slow.text'),
    route,
    items: signItems({
      plan: signPlan({ route, funds: false, needsApproval: false }),
      route,
      move,
      moveGas: 'move',
      moveGasTimes: shownConfig.batch?.count ?? 1,
      t,
    }),
    place: PLACES[shownFlow.stage],
    actionState: shownFlow.actionState,
    error: shownFlow.errorMessage,
    signing: shownFlow.signing,
    showNetwork: needsNetworkSwitch || shownFlow.completedSteps.switchNetwork,
    approved: false,
    chainId: shownFlow.chainId,
    chainName: shownFlow.chainName,
    duelId: shownConfig.batch ? null : Number(shownFlow.duelId),
    duelCount: shownConfig.batch?.count,
    blockedReason: null,
    canContinue: true,
    canClose,
    facts: { contract, functionName },
    onContinue,
    // An action has no approve: its write is the only transaction.
    run: { 'switch-network': onSwitchNetwork, approve: onExecute, write: onExecute },
    onClose: close,
    onDone,
  };

  return <SigningWindow model={model} />;
}
