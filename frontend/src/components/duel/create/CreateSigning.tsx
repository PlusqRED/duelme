'use client';

import { CreateSigningWindow } from '@/components/sign/CreateSigningWindow';
import type { useCreateDuelFlow } from '@/hooks/useCreateDuelFlow';

/**
 * The window that signs the new duel, over the create page. The page's one tie to it: the window
 * is swapped here, and the page keeps only the flow.
 */
export function CreateSigning({ flow }: { flow: ReturnType<typeof useCreateDuelFlow> }) {
  return (
    <CreateSigningWindow
      open={flow.flow !== null}
      canClose={flow.canCloseFlow}
      draft={flow.flow?.draft ?? null}
      stage={flow.flow?.stage ?? 'review'}
      actionState={flow.flow?.actionState ?? 'idle'}
      needsNetworkSwitch={flow.needsNetworkSwitch}
      needsApproval={flow.needsApproval}
      completedSwitchNetwork={flow.flow?.completedSteps.switchNetwork ?? false}
      completedApproval={flow.flow?.completedSteps.approve ?? false}
      errorMessage={flow.flow?.errorMessage}
      review={flow.review}
      onOpenChange={flow.handleFlowOpenChange}
      onContinue={flow.handleContinueFlow}
      onSwitchNetwork={flow.handleSwitchNetwork}
      onApprove={flow.handleApprove}
      onCreateDuel={flow.handleCreateTransaction}
      onBackToForm={flow.closeFlow}
    />
  );
}
