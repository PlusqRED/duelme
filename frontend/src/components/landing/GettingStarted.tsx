'use client';

import { useId } from 'react';
import { ControlFacts } from '@/components/landing/ControlFacts';
import { QuestLog } from '@/components/landing/QuestLog';
import { QuestPhone } from '@/components/landing/QuestPhone';
import { SectionHead } from '@/components/landing/SectionHead';
import { useQuest } from '@/hooks/useQuest';
import { useRelayerStatus } from '@/hooks/useRelayerStatus';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';

/**
 * The first duel as a four-step quest for a player new to crypto: the steps written down beside a
 * phone that acts each one out, and what a wallet made for them still leaves in their hands. Below a
 * wide screen the phone comes between the steps and those facts.
 */
export function GettingStarted() {
  const { t } = useTranslation();
  const titleId = useId();
  const quest = useQuest();
  const { isRelayEnabled } = useRelayerStatus(DEFAULT_CHAIN_ID);

  return (
    <section id="getting-started" aria-labelledby={titleId} className="mx-auto w-full max-w-page px-gutter pt-section">
      <SectionHead titleId={titleId} title={t('onboarding.title')} subtitle={t('onboarding.subtitle')} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-7 rounded-[28px] border border-line bg-paper p-[clamp(18px,3vw,32px)] [grid-template-areas:'log'_'stage'_'control'] wide:grid-cols-[minmax(0,1fr)_minmax(0,380px)] wide:grid-rows-[auto_1fr] wide:gap-x-12 wide:gap-y-6 wide:[grid-template-areas:'log_stage'_'control_stage']">
        <QuestLog quest={quest} isRelayEnabled={isRelayEnabled} className="[grid-area:log]" />
        <QuestPhone quest={quest} isRelayEnabled={isRelayEnabled} className="[grid-area:stage]" />
        <ControlFacts className="[grid-area:control] wide:self-end" />
      </div>
    </section>
  );
}
