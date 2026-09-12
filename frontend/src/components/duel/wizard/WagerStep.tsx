'use client';

import { DollarSign, Trophy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useContractConfig } from '@/hooks/useContractConfig';
import { useTranslation } from '@/i18n/useTranslation';
import { MAX_WAGER_SLIDER } from '@/lib/constants';
import { parseWager, projectWagerToSlider } from '@/lib/wager';

const PRESETS = [3, 5, 10, 25, 50, 100];
const SLIDER_STEP = 0.1; // presentational slider granularity only

interface WagerStepProps {
  amount: string;
  onAmountChange: (value: string) => void;
  isValid: boolean;
}

export function WagerStep({ amount, onAmountChange, isValid }: WagerStepProps) {
  const { t } = useTranslation();
  const { minWager } = useContractConfig();
  const { numeric, pot } = parseWager(amount);
  const slider = projectWagerToSlider(numeric, { min: minWager, max: MAX_WAGER_SLIDER });
  const sliderTrack = {
    background: `linear-gradient(to right,
      rgb(99 102 241) 0%,
      rgb(139 92 246) ${slider.percent}%,
      rgb(226 232 240) ${slider.percent}%,
      rgb(226 232 240) 100%)`,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none sm:text-2xl">
          {t('wizard.title.wager')}
        </h2>
        <p className="text-sm text-slate-500">{t('wizard.subtitle.wager')}</p>
      </div>

      <div className="flex flex-col gap-4">
        <label htmlFor="wizard-wager-amount" className="text-sm font-semibold text-slate-700">
          {t('create.amount')}
        </label>
        <div className="relative">
          <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="wizard-wager-amount"
            type="number"
            inputMode="decimal"
            min={minWager}
            step="any"
            placeholder={t('create.amountPlaceholder')}
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            className="h-14 border-slate-200 pl-10 pr-16 text-lg font-semibold focus:border-indigo-300 focus:ring-indigo-200"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
            USDT
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="range"
            min={minWager}
            max={MAX_WAGER_SLIDER}
            step={SLIDER_STEP}
            value={slider.value}
            onChange={(event) => onAmountChange(event.target.value)}
            disabled={slider.isAboveRange}
            aria-label={t('create.amount')}
            style={sliderTrack}
            className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-indigo-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:active:scale-110 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
          />
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{minWager} USDT</span>
            <span>
              {slider.isAboveRange
                ? t('wizard.wager.sliderAbove', { max: MAX_WAGER_SLIDER })
                : `${MAX_WAGER_SLIDER} USDT`}
            </span>
          </div>
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
          <p className="text-xs text-red-500">{t('create.min', { min: minWager })}</p>
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
