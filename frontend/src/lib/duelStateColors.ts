import { DuelState } from '@/lib/contracts';
import type { TranslationKey } from '@/i18n/translations';

export interface DuelStateConfig {
  key: TranslationKey;
  colorClass: string;
  accentClass: string;
}

export const DUEL_STATE_CONFIG: Record<DuelState, DuelStateConfig> = {
  [DuelState.Created]: {
    key: 'duel.waiting',
    colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
    accentClass: 'border-t-blue-300',
  },
  [DuelState.Funded]: {
    key: 'duel.inProgress',
    colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentClass: 'border-t-indigo-400',
  },
  [DuelState.WinnerClaimed]: {
    key: 'duel.waitingConfirm',
    colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
    accentClass: 'border-t-amber-300',
  },
  [DuelState.Resolved]: {
    key: 'duel.resolved',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentClass: 'border-t-emerald-400',
  },
  [DuelState.Refunded]: {
    key: 'duel.refunded',
    colorClass: 'bg-slate-50 text-slate-600 border-slate-200',
    accentClass: 'border-t-slate-300',
  },
  [DuelState.Cancelled]: {
    key: 'duel.cancelled',
    colorClass: 'bg-slate-50 text-slate-500 border-slate-200',
    accentClass: 'border-t-slate-300',
  },
  [DuelState.Declined]: {
    key: 'duel.declined',
    colorClass: 'bg-rose-50 text-rose-700 border-rose-200',
    accentClass: 'border-t-rose-300',
  },
  [DuelState.Disputed]: {
    key: 'duel.disputed',
    colorClass: 'bg-orange-50 text-orange-700 border-orange-200',
    accentClass: 'border-t-orange-400',
  },
  [DuelState.MutualCancelRequested]: {
    key: 'duel.cancellationPending',
    colorClass: 'bg-violet-50 text-violet-700 border-violet-200',
    accentClass: 'border-t-violet-300',
  },
  [DuelState.MutuallyCancelled]: {
    key: 'duel.mutuallyCancelled',
    colorClass: 'bg-sky-50 text-sky-700 border-sky-200',
    accentClass: 'border-t-sky-300',
  },
};

export const TIMED_OUT_CONFIG: DuelStateConfig = {
  key: 'duel.responseTimedOut',
  colorClass: 'bg-red-50 text-red-700 border-red-200',
  accentClass: 'border-t-red-400',
};
