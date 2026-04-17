'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Swords } from 'lucide-react';
import { CreateDuelFlowDialog } from '@/components/duel/CreateDuelFlowDialog';
import { GameStep } from '@/components/duel/wizard/GameStep';
import { ReviewStep } from '@/components/duel/wizard/ReviewStep';
import { StepIndicator, type WizardStep } from '@/components/duel/wizard/StepIndicator';
import { TypeMessageStep } from '@/components/duel/wizard/TypeMessageStep';
import { WagerStep } from '@/components/duel/wizard/WagerStep';
import { WizardNavBar } from '@/components/duel/wizard/WizardNavBar';
import { useCreateDuelFlow } from '@/hooks/useCreateDuelFlow';
import { useDefaultChain } from '@/hooks/useDefaultChain';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import type { Game, GameCategory } from '@/lib/game';
import {
  isGameStepValid,
  isReviewStepValid,
  isTypeMessageStepValid,
  isWagerStepValid,
} from '@/lib/wizardValidation';

const STEP_LABEL_KEYS: TranslationKey[] = [
  'wizard.step.game',
  'wizard.step.wager',
  'wizard.step.type',
  'wizard.step.review',
];

interface SelectedGame {
  slug: string;
  name: string;
  category: GameCategory;
}

export function CreateDuelWizard() {
  const { t } = useTranslation();
  const chainKey = useDefaultChain();
  const stepHeadingRef = useRef<HTMLDivElement | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedGame, setSelectedGame] = useState<SelectedGame | null>(null);
  const [amount, setAmount] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [message, setMessage] = useState('');

  const wizardState = {
    gameSlug: selectedGame?.slug ?? '',
    gameName: selectedGame?.name ?? '',
    amount,
    message,
    isPublic,
  };

  const isValidGame = isGameStepValid(wizardState);
  const isValidWager = isWagerStepValid(wizardState);
  const isValidMessage = isTypeMessageStepValid(wizardState);
  const isValidReview = isReviewStepValid(wizardState);

  const stepValidations = useMemo(
    () => [isValidGame, isValidWager, isValidMessage, isValidReview] as const,
    [isValidGame, isValidWager, isValidMessage, isValidReview]
  );

  const flow = useCreateDuelFlow({
    amount,
    message,
    gameName: wizardState.gameName,
    isPublic,
    selectedChain: chainKey,
    isValidAmount: isValidWager,
    isValidMessage,
  });

  const steps: WizardStep[] = useMemo(
    () =>
      STEP_LABEL_KEYS.map((labelKey, idx) => ({
        index: idx,
        labelKey,
        isComplete: idx !== stepIndex && stepValidations[idx],
        isReachable:
          idx <= stepIndex ||
          stepValidations.slice(0, idx).every((isValid) => isValid),
      })),
    [stepIndex, stepValidations]
  );

  useEffect(() => {
    // Soft contract: every step's first heading is `<h2 tabIndex={-1}>` so screen
    // readers and keyboard users land on it after a step transition.
    stepHeadingRef.current
      ?.querySelector<HTMLHeadingElement>('h2[tabindex="-1"]')
      ?.focus({ preventScroll: true });
  }, [stepIndex]);

  function handleSelectGame(game: Game) {
    setSelectedGame({ slug: game.slug, name: game.name, category: game.category });
  }

  function handleStepClick(index: number) {
    if (steps[index].isReachable) setStepIndex(index);
  }

  function goNext() {
    if (stepIndex === STEP_LABEL_KEYS.length - 1) {
      // When unauthenticated, handleCreateDuelClick triggers Privy login instead
      // of the duel-create transaction; the WizardNavBar label switches to "Connect Wallet".
      flow.handleCreateDuelClick();
      return;
    }
    setStepIndex((idx) => Math.min(idx + 1, STEP_LABEL_KEYS.length - 1));
  }

  function goBack() {
    setStepIndex((idx) => Math.max(idx - 1, 0));
  }

  const isLastStep = stepIndex === STEP_LABEL_KEYS.length - 1;
  const canGoNext = isLastStep
    ? isValidReview && (!flow.authenticated || !flow.submitDisabled)
    : stepValidations[stepIndex];
  const isSubmitting = flow.flow !== null;
  const isFlowOpen = flow.flow !== null;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6 text-center animate-fade-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
          <Swords className="h-6 w-6 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('create.title')}
        </h1>
      </div>

      <div className="card-glow rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <StepIndicator
            steps={steps}
            currentIndex={stepIndex}
            onStepClick={handleStepClick}
          />
        </div>

        <div ref={stepHeadingRef} className="min-h-[420px]">
          {stepIndex === 0 && (
            <GameStep
              selectedSlug={selectedGame?.slug ?? ''}
              onSelect={handleSelectGame}
              chainKey={chainKey}
            />
          )}
          {stepIndex === 1 && (
            <WagerStep amount={amount} onAmountChange={setAmount} isValid={isValidWager} />
          )}
          {stepIndex === 2 && (
            <TypeMessageStep
              isPublic={isPublic}
              onPublicChange={setIsPublic}
              message={message}
              onMessageChange={setMessage}
              isMessageValid={isValidMessage}
            />
          )}
          {stepIndex === 3 && (
            <ReviewStep
              gameName={selectedGame?.name ?? ''}
              gameCategory={selectedGame?.category ?? null}
              amount={amount}
              isPublic={isPublic}
              message={message}
              chainKey={chainKey}
              onEditStep={handleStepClick}
            />
          )}
        </div>

        <div className="mt-6 hidden sm:block">
          <WizardNavBar
            canGoBack={stepIndex > 0}
            canGoNext={canGoNext}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
            onBack={goBack}
            onNext={goNext}
            authenticated={flow.authenticated}
          />
        </div>
      </div>

      {!isFlowOpen && (
        <div className="sm:hidden">
          <WizardNavBar
            canGoBack={stepIndex > 0}
            canGoNext={canGoNext}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
            onBack={goBack}
            onNext={goNext}
            authenticated={flow.authenticated}
          />
        </div>
      )}

      <CreateDuelFlowDialog
        open={isFlowOpen}
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
