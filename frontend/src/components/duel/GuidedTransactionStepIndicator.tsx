'use client';

import { AlertCircle, Check, Minus } from 'lucide-react';
import type { GuidedTransactionStepState } from '@/lib/createDuelFlow';

interface GuidedTransactionStepIndicatorProps {
  status: GuidedTransactionStepState;
}

export function GuidedTransactionStepIndicator({
  status,
}: GuidedTransactionStepIndicatorProps) {
  if (status === 'completed') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (status === 'skipped') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertCircle className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (status === 'active') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    );
  }

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400">
      <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
    </span>
  );
}
