'use client';

import { ArrowLeft, ArrowRight, Loader2, Swords } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface WizardNavBarProps {
  canGoBack: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  authenticated: boolean;
}

export function WizardNavBar({
  canGoBack,
  canGoNext,
  isLastStep,
  isSubmitting,
  onBack,
  onNext,
  authenticated,
}: WizardNavBarProps) {
  const { t } = useTranslation();
  const nextLabel = !authenticated
    ? t('nav.connectWallet')
    : isLastStep
      ? t('wizard.nav.create')
      : t('wizard.nav.next');

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur-sm pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:backdrop-blur-none">
      <div className="mx-auto flex max-w-lg items-center gap-3 sm:max-w-none">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || isSubmitting}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t('wizard.nav.back')}</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isLastStep ? (
            <Swords className="h-4 w-4" />
          ) : null}
          {nextLabel}
          {!isLastStep && !isSubmitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
