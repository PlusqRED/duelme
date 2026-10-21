'use client';

import { fundingModel } from '@/components/sign/fundingModel';
import { SigningWindow } from '@/components/sign/SigningWindow';
import type { FlowReviewGate } from '@/hooks/useFlowFunding';
import { useLastNonNull } from '@/hooks/useLastNonNull';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN } from '@/lib/constants';
import type { CreateDuelFlowDraft, CreateDuelFlowStage } from '@/lib/createDuelFlow';
import type { FlowError } from '@/lib/flowError';
import type { FlowActionState } from '@/lib/flowSession';
import { ACTION_COPY } from '@/lib/signingCopy';
import { formatUSDT } from '@/lib/utils';

interface CreateSigningWindowProps {
  open: boolean;
  canClose: boolean;
  wasLeft: boolean;
  draft: CreateDuelFlowDraft | null;
  stage: CreateDuelFlowStage;
  actionState: FlowActionState;
  needsNetworkSwitch: boolean;
  needsApproval: boolean;
  completedSwitchNetwork: boolean;
  completedApproval: boolean;
  errorMessage?: FlowError | null;
  review: FlowReviewGate;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onSwitchNetwork: () => void;
  onApprove: () => void;
  onCreateDuel: () => void;
  onBackToForm: () => void;
}

/**
 * Creating a duel (`useCreateDuelFlow`) in the signing window: the stake into the creator's seat,
 * then the create. Done never leaves the page: its button closes the window, and the page shows
 * the new duel's link.
 */
export function CreateSigningWindow(props: CreateSigningWindowProps) {
  const { t, language } = useTranslation();
  const draft = useLastNonNull(props.draft);
  const { isRelayEnabled } = useRelayerStatus(draft?.chainId ?? DEFAULT_CHAIN.id);

  if (!draft) {
    return null;
  }

  const copy = ACTION_COPY.create;
  const game = draft.gameName;
  const createdId = props.review.signing.createdDuelId;
  const params = { wager: formatUSDT(draft.rawAmount, language), game, id: createdId ?? '', network: draft.chainName };
  const funding = fundingModel(
    { ...props, draft },
    {
      call: 'createDuel',
      isRelayEnabled,
      wager: params.wager,
      move: game ? t(copy.move, params) : t('sign.create.move.noGame', params),
      t,
    }
  );

  return (
    <SigningWindow
      model={{
        ...funding,
        copy,
        title: t(copy.title, params),
        sub: game ? t('sign.create.sub', params) : t('sign.create.sub.noGame'),
        caption: t(copy.caption, params),
        button: t(copy.button, params),
        doneTitle: createdId === null ? t('sign.create.done.title.pending') : t(copy.doneTitle, params),
        doneText: t(draft.isPublic ? 'sign.create.public.done.text' : copy.doneText, params),
        doneButton: t(draft.isPublic ? 'sign.create.public.done.button' : 'sign.create.done.button'),
        backLabel: t(copy.back),
        // Closing on a slow approve stops the flow: no create is sent once the approve lands.
        slowText: t(props.stage === 'approve' ? 'sign.create.slow.approve.text' : 'sign.create.slow.text'),
        wasLeft: props.wasLeft,
        onContinue: props.onContinue,
        run: { 'switch-network': props.onSwitchNetwork, approve: props.onApprove, write: props.onCreateDuel },
        onClose: () => props.onOpenChange(false),
        onDone: props.onBackToForm,
      }}
    />
  );
}
