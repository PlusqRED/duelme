'use client';

import { useState } from 'react';
import { DollarSign, Shield, Swords, Zap } from 'lucide-react';
import { CreateDuelFlowDialog } from '@/components/duel/CreateDuelFlowDialog';
import { CreateDuelFormCard } from '@/components/duel/CreateDuelFormCard';
import { useCreateDuelFlow } from '@/hooks/useCreateDuelFlow';
import { useTranslation } from '@/i18n/useTranslation';
import { MIN_WAGER, SUPPORTED_CHAINS } from '@/lib/constants';
import { isDuelMessageValid } from '@/lib/duelMessage';

export function CreateDuelForm() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [selectedChain, setSelectedChain] = useState<keyof typeof SUPPORTED_CHAINS>(
    'arbitrumSepolia'
  );
  const [gameName, setGameName] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const isValidAmount = numericAmount >= MIN_WAGER;
  const isValidMessage = isDuelMessageValid(message);
  const flow = useCreateDuelFlow({
    amount,
    message,
    gameName,
    isPublic,
    selectedChain,
    isValidAmount,
    isValidMessage,
  });

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-8 text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
          <Swords className="h-7 w-7 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('create.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          {t('create.subtitle')}
        </p>
      </div>

      <CreateDuelFormCard
        amount={amount}
        onAmountChange={setAmount}
        isValidAmount={isValidAmount}
        message={message}
        onMessageChange={setMessage}
        isValidMessage={isValidMessage}
        gameName={gameName}
        onGameNameChange={setGameName}
        isPublic={isPublic}
        onPublicChange={setIsPublic}
        selectedChain={selectedChain}
        onChainChange={setSelectedChain}
        isAuthenticated={flow.authenticated}
        isSubmitDisabled={flow.submitDisabled}
        onSubmit={flow.handleCreateDuelClick}
      />

      <div className="mt-6 flex items-center justify-center gap-6 animate-fade-in animation-delay-300">
        <TrustBadge icon={DollarSign} label={t('create.noFees')} />
        <TrustBadge icon={Shield} label={t('create.smartContract')} />
        <TrustBadge icon={Zap} label={t('create.instant')} />
      </div>

      <CreateDuelFlowDialog
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
        onOpenChange={flow.handleFlowOpenChange}
        onContinue={flow.handleContinueFlow}
        onSwitchNetwork={flow.handleSwitchNetwork}
        onApprove={flow.handleApprove}
        onCreateDuel={flow.handleCreateTransaction}
        onBackToForm={flow.closeFlow}
      />
    </div>
  );
}

interface TrustBadgeProps {
  icon: typeof DollarSign;
  label: string;
}

function TrustBadge({ icon: Icon, label }: TrustBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}
