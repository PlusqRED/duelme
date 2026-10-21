'use client';

import { useEffect, useId, type ReactNode, type RefObject } from 'react';
import { AccessStepBody } from '@/components/duel/create/AccessStepBody';
import { GameStepBody } from '@/components/duel/create/GameStepBody';
import { MessageStepBody } from '@/components/duel/create/MessageStepBody';
import { SetupStep, StepPick } from '@/components/duel/create/SetupStep';
import { StakeStepBody } from '@/components/duel/create/StakeStepBody';
import { shownWayOnButton } from '@/components/duel/create/WayOnBar';
import { TurnPanel } from '@/components/duel/room/TurnPanel';
import { GameTile } from '@/components/identity/GameTile';
import { Icon } from '@/components/ui/icon';
import type { useCreateSetup } from '@/hooks/useCreateSetup';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import type { BalanceStatus, FundingStatus } from '@/lib/balanceStatus';
import type { ContractConfig } from '@/lib/contractConfig';
import { SETUP_STEPS, stepStatus, type SetupStep as SetupStepId } from '@/lib/createSetup';
import type { Game } from '@/lib/game';
import { cn, formatUSDT } from '@/lib/utils';

const stepLabels: Record<SetupStepId, TranslationKey> = {
  game: 'create.step.game',
  stake: 'create.step.stake',
  access: 'create.step.access',
  message: 'create.step.message',
};

interface SetupPanelProps {
  /** The duel is being made out of sight: its terms stay as they were sent, and Create shows it again. */
  isLocked?: boolean;
  setup: ReturnType<typeof useCreateSetup>;
  /** The creator's face, which the panel's notch points at: these choices are theirs. */
  pointAt: RefObject<HTMLElement | null>;
  catalog: readonly Game[];
  limits: ContractConfig;
  stops: readonly number[];
  address: `0x${string}` | null;
  balance: BalanceStatus;
  funding: FundingStatus;
  /** The message field's example: a note players made a duel of this game with, or the copy's own. */
  example: string;
  onTopUp: () => void;
  onRetryBalance: () => void;
  onRipple: () => void;
  /** The way on, at the end of the panel. */
  children: ReactNode;
}

/**
 * The "your move" panel under the draft arena: four choices, one open at a time, each closing on
 * its answer, so the closed steps are the review. Once every step is answered the focus goes to the
 * way on.
 */
export function SetupPanel({ isLocked = false, setup, pointAt, catalog, limits, stops, address, balance, funding, example, children, ...actions }: SetupPanelProps) {
  const { t, language } = useTranslation();
  const titleId = useId();
  const bodyId = useId();
  const { form, reading, message, answers, progress, focusTurn } = setup;

  useEffect(() => {
    if (progress.open !== null || focusTurn === 0) return;
    shownWayOnButton()?.focus();
    // Only a step the player closes hands the focus on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTurn]);

  function valueOf(step: SetupStepId): ReactNode {
    if (step === 'game') {
      return (
        form.game && (
          <StepPick mark={<GameTile name={form.game.name} category={form.game.category} className="size-[22px] rounded-[7px] text-[0.5625rem]" />}>
            {form.game.name}
          </StepPick>
        )
      );
    }
    if (step === 'stake') {
      if (reading.kind !== 'valid') return null;
      return t('create.stake.summary', { amount: formatUSDT(reading.raw, language), pot: formatUSDT(reading.raw * 2n, language) });
    }
    if (step === 'access') {
      return (
        <StepPick mark={<Icon name={form.isPublic ? 'globe' : 'lock'} className="size-4 text-ink-3" />}>
          {t(form.isPublic ? 'create.access.public' : 'create.access.private')}
        </StepPick>
      );
    }
    if (message) return `“${message}”`;
    return progress.visited.message ? t('create.message.none') : null;
  }

  const bodies: Record<SetupStepId, ReactNode> = {
    game: <GameStepBody catalog={catalog} picked={form.game} isOpen={progress.open === 'game'} onPick={setup.pickGame} />,
    stake: (
      <StakeStepBody
        stakeText={form.stakeText}
        reading={reading}
        minWager={limits.minWager}
        stops={stops}
        isOpen={progress.open === 'stake'}
        isSignedIn={address !== null}
        balance={balance}
        funding={funding}
        onStakeText={(stakeText) => setup.update({ stakeText })}
        onContinue={() => setup.next('stake')}
        onTopUp={actions.onTopUp}
        onRetryBalance={actions.onRetryBalance}
        onRipple={actions.onRipple}
      />
    ),
    access: <AccessStepBody isPublic={form.isPublic} onChange={(isPublic) => setup.update({ isPublic })} onContinue={() => setup.next('access')} />,
    message: (
      <MessageStepBody
        text={form.message}
        message={message}
        isValid={answers.message}
        limits={limits}
        address={address}
        example={example}
        onChange={(text) => setup.update({ message: text })}
        onDone={() => setup.next('message')}
      />
    ),
  };

  return (
    <TurnPanel
      tone="creator"
      pointAt={pointAt}
      whose={{ tone: 'creator', label: t('room.whose.you'), isLive: true }}
      titleId={titleId}
      title={t('create.title')}
      text={t('create.text')}
    >
      <ol inert={isLocked} className={cn('mt-0.5 grid gap-2 transition-opacity duration-200', isLocked && 'opacity-60')}>
        {SETUP_STEPS.map((step, index) => (
          <SetupStep
            key={step}
            number={index + 1}
            label={t(stepLabels[step])}
            aside={step === 'message' ? t('create.step.optional') : undefined}
            status={stepStatus(step, progress, answers)}
            value={valueOf(step)}
            focusTurn={focusTurn}
            bodyId={`${bodyId}-${step}`}
            onOpen={() => setup.open(step)}
          >
            {bodies[step]}
          </SetupStep>
        ))}
      </ol>
      {children}
    </TurnPanel>
  );
}
