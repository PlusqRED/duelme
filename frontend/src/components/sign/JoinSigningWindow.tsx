'use client';

import { fundingModel } from '@/components/sign/fundingModel';
import { SigningWindow } from '@/components/sign/SigningWindow';
import type { FlowReviewGate } from '@/hooks/useFlowFunding';
import { useLastNonNull } from '@/hooks/useLastNonNull';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN } from '@/lib/constants';
import type { FlowError } from '@/lib/flowError';
import type { FlowActionState } from '@/lib/flowSession';
import type { JoinDuelFlowDraft, JoinDuelFlowStage } from '@/lib/joinDuelFlow';
import { ACTION_COPY } from '@/lib/signingCopy';
import { formatUSDT, truncateAddress } from '@/lib/utils';

interface JoinSigningWindowProps {
  open: boolean;
  canClose: boolean;
  draft: JoinDuelFlowDraft | null;
  stage: JoinDuelFlowStage;
  actionState: FlowActionState;
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
  completedSwitchNetwork: boolean;
  completedApproval: boolean;
  errorMessage?: FlowError | null;
  review: FlowReviewGate;
  /** The creator as the page names them, by nickname where they have one; their address otherwise. */
  creatorName?: string;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onSwitchNetwork: () => void;
  onApprove: () => void;
  onJoinDuel: () => void;
  onDone: () => void;
}

/** Joining a duel (`useJoinDuelFlow`) in the signing window: the stake into the opponent's seat, then the join. */
export function JoinSigningWindow(props: JoinSigningWindowProps) {
  const { t, language } = useTranslation();
  const draft = useLastNonNull(props.draft);
  const { isRelayEnabled } = useRelayerStatus(draft?.chainId ?? DEFAULT_CHAIN.id);

  if (!draft) {
    return null;
  }

  const copy = ACTION_COPY.join;
  const params = {
    id: String(draft.duelId),
    wager: formatUSDT(draft.rawAmount, language),
    pot: formatUSDT(draft.rawAmount * 2n, language),
    other: props.creatorName || truncateAddress(draft.creatorAddress),
    network: draft.chainName,
  };
  const funding = fundingModel(
    { ...props, draft },
    { call: 'joinDuel', isRelayEnabled, wager: params.wager, move: t(copy.move, params), t }
  );

  return (
    <SigningWindow
      model={{
        ...funding,
        duelId: Number(draft.duelId),
        copy,
        title: t(copy.title, params),
        sub: draft.chainName,
        caption: t(copy.caption, params),
        button: t(copy.button, params),
        doneTitle: t(copy.doneTitle, params),
        doneText: t(copy.doneText, params),
        doneButton: t(copy.back),
        backLabel: t(copy.back),
        slowText: t('sign.slow.text'),
        onContinue: props.onContinue,
        run: { 'switch-network': props.onSwitchNetwork, approve: props.onApprove, write: props.onJoinDuel },
        onClose: () => props.onOpenChange(false),
        onDone: props.onDone,
      }}
    />
  );
}
