'use client';

import type { ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuidedTransactionStepIndicator } from '@/components/duel/GuidedTransactionStepIndicator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  GuidedTransactionAction,
  GuidedTransactionDetailItem,
  GuidedTransactionSummaryItem,
  GuidedTransactionStepView,
} from '@/lib/guidedTransaction';
import { cn } from '@/lib/utils';

interface GuidedTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canClose: boolean;
  title: string;
  description: string;
  steps: GuidedTransactionStepView[];
  currentStepLabel: string;
  currentStepTitle: string;
  currentStepDescription: string;
  currentStepHint?: string;
  currentIcon: LucideIcon;
  summaryTitle: string;
  summaryItems: GuidedTransactionSummaryItem[];
  technicalDetailsLabel: string;
  technicalDetails: GuidedTransactionDetailItem[];
  errorMessage?: string;
  primaryAction?: GuidedTransactionAction;
  secondaryAction?: GuidedTransactionAction;
  success?: boolean;
  footerContent?: ReactNode;
}

export function GuidedTransactionDialog({
  open,
  onOpenChange,
  canClose,
  title,
  description,
  steps,
  currentStepLabel,
  currentStepTitle,
  currentStepDescription,
  currentStepHint,
  currentIcon: CurrentIcon,
  summaryTitle,
  summaryItems,
  technicalDetailsLabel,
  technicalDetails,
  errorMessage,
  primaryAction,
  secondaryAction,
  success = false,
  footerContent,
}: GuidedTransactionDialogProps) {
  const stepAnimationKey = [
    currentStepLabel,
    currentStepTitle,
    currentStepDescription,
    success ? 'success' : 'pending',
  ].join(':');

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !canClose) {
      return;
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden border border-slate-200 bg-white/95 p-0 shadow-2xl backdrop-blur-sm sm:max-w-4xl"
        showCloseButton={canClose}
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-slate-50 px-6 py-5">
          <DialogHeader className="gap-1">
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              {description}
            </DialogDescription>
          </DialogHeader>
          <ol className={cn(
            'mt-5 grid gap-2',
            steps.length <= 3 ? 'sm:grid-cols-3' : steps.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-5'
          )}>
            {steps.map((step) => (
              <li
                key={step.id}
                className={cn(
                  'rounded-xl border px-3 py-3 transition-all duration-300 ease-out',
                  step.status === 'active' && 'border-indigo-200 bg-indigo-50 shadow-sm ring-1 ring-indigo-100/70',
                  step.status === 'completed' && 'border-emerald-200 bg-emerald-50 shadow-sm',
                  step.status === 'skipped' && 'border-slate-200 bg-slate-50',
                  step.status === 'error' && 'border-red-200 bg-red-50 shadow-sm ring-1 ring-red-100/70',
                  step.status === 'upcoming' && 'border-slate-200 bg-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <GuidedTransactionStepIndicator status={step.status} />
                  <span
                    className={cn(
                      'text-xs font-semibold tracking-wide',
                      step.status === 'active' && 'text-indigo-700',
                      step.status === 'completed' && 'text-emerald-700',
                      step.status === 'skipped' && 'text-slate-500',
                      step.status === 'error' && 'text-red-700',
                      step.status === 'upcoming' && 'text-slate-500'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]">
          <div className="space-y-4">
            <section
              key={stepAnimationKey}
              className="animate-soft-in rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition-colors duration-300">
                {currentStepLabel}
              </span>
              <div className="mt-4 flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all duration-300 ease-out',
                    success
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-indigo-100 text-indigo-600'
                  )}
                >
                  <CurrentIcon className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-slate-900">
                    {currentStepTitle}
                  </h3>
                  <p className="text-sm leading-6 text-slate-600">
                    {currentStepDescription}
                  </p>
                </div>
              </div>
              {errorMessage && (
                <div className="animate-soft-in-fast mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {currentStepHint && (
                <div className="animate-soft-in-fast mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {currentStepHint}
                </div>
              )}
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                {secondaryAction && (
                  <Button
                    size="lg"
                    variant={secondaryAction.variant ?? 'outline'}
                    onClick={secondaryAction.onClick}
                    disabled={secondaryAction.disabled}
                    className="h-11 transition-all duration-200 ease-out"
                  >
                    {secondaryAction.label}
                  </Button>
                )}
                {primaryAction && (
                  <Button
                    size="lg"
                    variant={primaryAction.variant ?? 'default'}
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.disabled}
                    className="h-11 transition-all duration-200 ease-out sm:min-w-44"
                  >
                    {primaryAction.loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {primaryAction.label}
                  </Button>
                )}
              </div>
            </section>

            {footerContent && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {footerContent}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="animate-fade-in-up rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <h3 className="text-sm font-semibold text-slate-900">{summaryTitle}</h3>
              <dl className="mt-4 space-y-3">
                {summaryItems.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="flex items-start justify-between gap-4"
                  >
                    <dt className="text-sm text-slate-500">{item.label}</dt>
                    <dd
                      className={cn(
                        'max-w-[60%] text-right text-sm text-slate-700',
                        item.emphasize && 'font-semibold text-slate-900'
                      )}
                    >
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {technicalDetails.length > 0 && (
              <details className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white animation-delay-100">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-900">
                  {technicalDetailsLabel}
                </summary>
                <dl className="space-y-3 border-t border-slate-200 px-5 py-4">
                  {technicalDetails.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="flex flex-col gap-1"
                    >
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {item.label}
                      </dt>
                      <dd
                        className={cn(
                          'text-sm text-slate-700 break-all',
                          item.monospace && 'font-mono text-xs'
                        )}
                      >
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
