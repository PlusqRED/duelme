'use client';

import { ActionFlowDialog } from '@/components/duel/ActionFlowDialog';
import type { useActionFlow } from '@/hooks/useActionFlow';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN } from '@/lib/constants';

interface TakeFlowDialogProps {
  actionFlow: ReturnType<typeof useActionFlow>;
}

/**
 * The signing window for the safe's Take. Its summary is the config's own (the sum and how many
 * duels); the duel-specific fields of the context stay empty, since Take is no one duel.
 */
export function TakeFlowDialog({ actionFlow }: TakeFlowDialogProps) {
  const { t } = useTranslation();

  return (
    <ActionFlowDialog
      open={actionFlow.flow !== null}
      canClose={actionFlow.canClose}
      flow={actionFlow.flow}
      config={actionFlow.activeConfig}
      needsNetworkSwitch={actionFlow.needsNetworkSwitch}
      summaryContext={{
        duelId: 0,
        formattedWager: '',
        formattedPot: '',
        chainName: DEFAULT_CHAIN.name,
        opponentDisplay: '',
        claimedWinnerDisplay: '',
        claimableDisplay: '',
        t,
      }}
      onOpenChange={actionFlow.handleFlowOpenChange}
      onContinue={actionFlow.handleContinue}
      onSwitchNetwork={actionFlow.handleSwitchNetwork}
      onExecute={actionFlow.handleExecute}
      onDone={actionFlow.closeFlow}
    />
  );
}
