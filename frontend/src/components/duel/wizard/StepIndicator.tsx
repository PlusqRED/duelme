'use client';

import { Check } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';

export interface WizardStep {
  index: number;
  labelKey: TranslationKey;
  isComplete: boolean;
  isReachable: boolean;
}

interface StepIndicatorProps {
  steps: WizardStep[];
  currentIndex: number;
  onStepClick: (index: number) => void;
}

export function StepIndicator({ steps, currentIndex, onStepClick }: StepIndicatorProps) {
  const { t } = useTranslation();
  const currentLabel = steps[currentIndex]?.labelKey
    ? t(steps[currentIndex].labelKey)
    : '';

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden sm:flex items-center gap-2">
        {steps.map((step, idx) => (
          <StepPill
            key={step.labelKey}
            step={step}
            index={idx}
            isCurrent={idx === currentIndex}
            onClick={onStepClick}
            label={t(step.labelKey)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between sm:hidden">
        <div className="text-xs font-semibold text-slate-500">
          {t('wizard.stepCounter', { current: currentIndex + 1, total: steps.length })}
        </div>
        <div className="text-sm font-semibold text-indigo-700">{currentLabel}</div>
      </div>
      <div
        role="tablist"
        aria-label={t('wizard.stepCounter', { current: currentIndex + 1, total: steps.length })}
        className="flex h-2 gap-1 sm:hidden"
      >
        {steps.map((step, idx) => {
          const isClickable = step.isReachable && idx !== currentIndex;
          return (
            <button
              key={step.labelKey}
              type="button"
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={t(step.labelKey)}
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(idx)}
              className={`h-full flex-1 rounded-full transition-colors ${
                idx < currentIndex || step.isComplete
                  ? 'bg-emerald-400'
                  : idx === currentIndex
                    ? 'bg-indigo-500'
                    : 'bg-slate-200'
              } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function StepPill({
  step,
  index,
  isCurrent,
  onClick,
  label,
}: {
  step: WizardStep;
  index: number;
  isCurrent: boolean;
  onClick: (index: number) => void;
  label: string;
}) {
  const isClickable = step.isReachable && !isCurrent;
  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => isClickable && onClick(index)}
      className={`group flex flex-1 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
        isCurrent
          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
          : step.isComplete
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-slate-200 bg-white text-slate-400'
      } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
          isCurrent
            ? 'bg-indigo-500 text-white'
            : step.isComplete
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-200 text-slate-500'
        }`}
      >
        {step.isComplete ? <Check className="h-3 w-3" /> : index + 1}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
