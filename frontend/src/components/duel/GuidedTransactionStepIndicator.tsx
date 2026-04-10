'use client';

import { AlertCircle, Check, Minus } from 'lucide-react';
import type { GuidedTransactionStepState } from '@/lib/guidedTransaction';

interface GuidedTransactionStepIndicatorProps {
  status: GuidedTransactionStepState;
}

export function GuidedTransactionStepIndicator({
  status,
}: GuidedTransactionStepIndicatorProps) {
  if (status === 'completed') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-4 ring-emerald-100/70 shadow-sm transition-all duration-300 ease-out">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (status === 'skipped') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition-all duration-300 ease-out">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 ring-4 ring-red-100/70 shadow-sm transition-all duration-300 ease-out">
        <AlertCircle className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (status === 'active') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white ring-4 ring-indigo-100/80 shadow-[0_10px_24px_-14px_rgba(79,70,229,0.85)] transition-all duration-300 ease-out">
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all duration-300 ease-out">
      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
    </span>
  );
}
