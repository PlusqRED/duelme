'use client';

import { DollarSign, Trophy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { MIN_WAGER } from '@/lib/constants';
import { parseWager } from '@/lib/wager';

const PRESETS = [3, 5, 10, 25, 50, 100];

interface WagerStepProps {
  amount: string;
  onAmountChange: (value: string) => void;
  isValid: boolean;
}

export function WagerStep({ amount, onAmountChange, isValid }: WagerStepProps) {
  const { t } = useTranslation();
  const { numeric, pot } = parseWager(amount);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none sm:text-2xl">
          {t('wizard.title.wager')}
        </h2>
        <p className="text-sm text-slate-500">{t('wizard.subtitle.wager')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="wizard-wager-amount" className="text-sm font-semibold text-slate-700">
          {t('create.amount')}
        </label>
        <div className="relative">
          <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="wizard-wager-amount"
            type="number"
            inputMode="decimal"
            min={MIN_WAGER}
            step="1"
            placeholder={t('create.amountPlaceholder')}
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            className="h-14 border-slate-200 pl-10 pr-16 text-lg font-semibold focus:border-indigo-300 focus:ring-indigo-200"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
            USDT
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onAmountChange(preset.toString())}
              className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                numeric === preset
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40'
              }`}
            >
              {preset} USDT
            </button>
          ))}
        </div>

        {amount && !isValid && (
          <p className="text-xs text-red-500">{t('create.min')}</p>
        )}
      </div>

      {numeric > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">{t('create.pot')}</span>
              <span className="text-xl font-bold text-slate-900">
                {pot} <span className="text-sm font-medium text-slate-400">USDT</span>
              </span>
            </div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {t('create.potHint')}
          </span>
        </div>
      )}
    </div>
  );
}
