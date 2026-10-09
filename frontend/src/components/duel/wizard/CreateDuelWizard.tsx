'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Swords } from 'lucide-react';
import { CreateDuelFlowDialog } from '@/components/duel/CreateDuelFlowDialog';
import { GameStep } from '@/components/duel/wizard/GameStep';
import { RestoredDraftNotice } from '@/components/duel/wizard/RestoredDraftNotice';
import { ReviewStep } from '@/components/duel/wizard/ReviewStep';
import { StepIndicator, type WizardStep } from '@/components/duel/wizard/StepIndicator';
import {
  MESSAGE_PLACEHOLDER_KEYS,
  TypeMessageStep,
} from '@/components/duel/wizard/TypeMessageStep';
import { WagerStep } from '@/components/duel/wizard/WagerStep';
import { WizardNavBar } from '@/components/duel/wizard/WizardNavBar';
import { useContractConfig } from '@/hooks/useContractConfig';
import { useCreateDuelDraftStorage } from '@/hooks/useCreateDuelDraftStorage';
import { useCreateDuelFlow } from '@/hooks/useCreateDuelFlow';
import { useDefaultChain } from '@/hooks/useDefaultChain';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { SUPPORTED_CHAINS } from '@/lib/constants';
import type { CreateDuelDraft, CreateDuelDraftGame } from '@/lib/createDuelDraft';
import type { Game } from '@/lib/game';
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


export function CreateDuelWizard() {
  const { t } = useTranslation();
  const chainKey = useDefaultChain();
  const stepHeadingRef = useRef<HTMLDivElement | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [selectedGame, setSelectedGame] = useState<CreateDuelDraftGame | null>(null);
  const [amount, setAmount] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [message, setMessage] = useState('');
  // Pick one trash-talk placeholder per wizard session so navigating between
  // steps does not reroll the prompt the user was reading.
  const [messagePlaceholderKey] = useState(
    () =>
      MESSAGE_PLACEHOLDER_KEYS[
        Math.floor(Math.random() * MESSAGE_PLACEHOLDER_KEYS.length)
      ]
  );

  const chainId = SUPPORTED_CHAINS[chainKey].id;
  const [isCreated, setIsCreated] = useState(false);
  const { restoredDraft, saveDraft } = useCreateDuelDraftStorage(chainId, isCreated);
  const [appliedDraft, setAppliedDraft] = useState<CreateDuelDraft | null>(null);
  // Re-render on the live on-chain limits, so a restored draft is judged by today's minimum.
  useContractConfig();

  // Back from topping up (the tab may have been reloaded meanwhile): the form as it was, on the
  // review step. Applied during render, once per restored draft, so no step flashes empty first.
  if (restoredDraft && restoredDraft !== appliedDraft) {
    setAppliedDraft(restoredDraft);
    setSelectedGame(restoredDraft.game);
    setAmount(restoredDraft.amount);
    setMessage(restoredDraft.message);
    setIsPublic(restoredDraft.isPublic);
    setStepIndex(STEP_LABEL_KEYS.length - 1);
    setMaxStepReached(STEP_LABEL_KEYS.length - 1);
  }

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

  const handleOpenDeposit = useCallback(() => {
    saveDraft({ chainId, game: selectedGame, amount, message, isPublic });
  }, [saveDraft, chainId, selectedGame, amount, message, isPublic]);

  const flow = useCreateDuelFlow({
    amount,
    message,
    gameName: wizardState.gameName,
    isPublic,
    selectedChain: chainKey,
    isValidAmount: isValidWager,
    isValidMessage,
    onOpenDeposit: handleOpenDeposit,
  });

  const flowStage = flow.flow?.stage;
  if (flowStage === 'success' && !isCreated) {
    setIsCreated(true);
  }

  const steps: WizardStep[] = useMemo(
    () =>
      STEP_LABEL_KEYS.map((labelKey, idx) => ({
        index: idx,
        labelKey,
        // A step is only "complete" after the user has actually visited it —
        // otherwise optional-by-default steps (like the message) would flash a
        // checkmark before the user ever saw them.
        isComplete: idx !== stepIndex && idx <= maxStepReached && stepValidations[idx],
        isReachable:
          idx <= stepIndex ||
          stepValidations.slice(0, idx).every((isValid) => isValid),
      })),
    [stepIndex, stepValidations, maxStepReached]
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

  function visitStep(index: number) {
    setStepIndex(index);
    setMaxStepReached((prev) => Math.max(prev, index));
  }

  function handleStepClick(index: number) {
    if (steps[index].isReachable) visitStep(index);
  }

  function goNext() {
    if (stepIndex === STEP_LABEL_KEYS.length - 1) {
      // When unauthenticated, handleCreateDuelClick triggers Privy login instead
      // of the duel-create transaction; the WizardNavBar label switches to "Connect Wallet".
      flow.handleCreateDuelClick();
      return;
    }
    visitStep(stepIndex + 1);
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
              placeholderKey={messagePlaceholderKey}
            />
          )}
          {stepIndex === 3 && appliedDraft && (
            <RestoredDraftNotice isValidWager={isValidWager} isValidMessage={isValidMessage} />
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
        review={flow.review}
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
