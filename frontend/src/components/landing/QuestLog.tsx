'use client';

import { useId } from 'react';
import { Icon } from '@/components/ui/icon';
import { QUEST_STEPS, type Quest } from '@/hooks/useQuest';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';

interface QuestStep {
  title: TranslationKey;
  desc: TranslationKey;
  /** What the step says when duel actions are paid by the player rather than by DuelMe. */
  descSelfPaid?: TranslationKey;
}

const steps: readonly QuestStep[] = [
  { title: 'onboarding.step1.title', desc: 'onboarding.step1.desc' },
  { title: 'onboarding.step2.title', desc: 'onboarding.step2.desc' },
  { title: 'onboarding.step3.title', desc: 'onboarding.step3.desc', descSelfPaid: 'onboarding.step3.descSelf' },
  { title: 'onboarding.step4.title', desc: 'onboarding.step4.desc' },
];

type StepState = 'current' | 'done' | 'ahead';

interface QuestLogProps {
  quest: Quest;
  isRelayEnabled: boolean;
  className?: string;
}

/**
 * The quest as it is written down: how far along it is, and its four steps, the current one open.
 * Any step can be opened from here; the phone beside it acts it out.
 */
export function QuestLog({ quest, isRelayEnabled, className }: QuestLogProps) {
  const { t } = useTranslation();
  const idPrefix = useId();

  function stateOf(step: number): StepState {
    if (step === quest.reached) return 'current';
    return step < quest.reached ? 'done' : 'ahead';
  }

  return (
    <div className={className}>
      <h3 className="text-lead">{t('onboarding.stepsTitle')}</h3>
      <p className="mt-1.5 text-ink-2">{t('onboarding.stepsSubtitle')}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <span aria-live="polite" className="text-sm font-extrabold">
          {quest.isDone
            ? t('start.complete', { total: QUEST_STEPS })
            : t('start.progress', { n: quest.step, total: QUEST_STEPS })}
        </span>
        <span aria-hidden="true" className="grid max-w-60 flex-[1_1_160px] grid-cols-4 gap-1">
          {steps.map((step, index) => (
            <i
              key={step.title}
              data-state={stateOf(index + 1)}
              className="relative h-2 overflow-hidden rounded-lg bg-canvas-deep after:absolute after:inset-0 after:origin-left after:scale-x-0 after:rounded-[inherit] after:bg-good after:transition-[scale,background-color] after:duration-500 after:ease-sheet data-[state=current]:after:scale-x-100 data-[state=current]:after:bg-ink data-[state=done]:after:scale-x-100"
            />
          ))}
        </span>
      </div>
      <ol className="mt-[18px] grid gap-2">
        {steps.map((step, index) => {
          const state = stateOf(index + 1);
          const bodyId = `${idPrefix}-step-${index + 1}`;
          return (
            <li
              key={step.title}
              data-state={state}
              className="group/step rounded-tile border-[1.5px] border-line transition-[border-color,box-shadow] duration-250 data-[state=current]:border-ink data-[state=current]:shadow-[0_3px_0_var(--color-ink)]"
            >
              <button
                type="button"
                aria-expanded={state === 'current'}
                aria-controls={bodyId}
                aria-current={state === 'current' ? 'step' : undefined}
                onClick={() => quest.goTo(index + 1)}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-body/[1.3] font-bold hover:bg-canvas group-data-[state=current]/step:hover:bg-transparent"
              >
                <span className="relative grid size-8 flex-none place-items-center rounded-full bg-canvas-deep text-sm font-extrabold text-ink-2 transition-colors duration-300 group-data-[state=current]/step:bg-ink group-data-[state=current]/step:text-paper group-data-[state=done]/step:bg-good group-data-[state=done]/step:text-paper">
                  <b className="transition-opacity duration-200 group-data-[state=done]/step:opacity-0">{index + 1}</b>
                  <Icon
                    name="check"
                    className="absolute size-4 scale-40 stroke-3 opacity-0 transition-[opacity,scale] duration-400 ease-spring group-data-[state=done]/step:scale-100 group-data-[state=done]/step:opacity-100"
                  />
                </span>
                {t(step.title)}
              </button>
              <div id={bodyId} hidden={state !== 'current'}>
                <p className="animate-swap pr-4 pb-3.5 pl-[58px] text-ink-2 max-xs:pl-4">
                  {t(!isRelayEnabled && step.descSelfPaid ? step.descSelfPaid : step.desc)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
