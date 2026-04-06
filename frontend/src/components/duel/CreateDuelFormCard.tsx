'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GameAutocomplete } from '@/components/game/GameAutocomplete';
import { useTranslation } from '@/i18n/useTranslation';
import {
  MAX_DUEL_MESSAGE_CHARACTERS,
  countDuelMessageCharacters,
} from '@/lib/duelMessage';
import { MIN_WAGER, SUPPORTED_CHAINS } from '@/lib/constants';
import { DollarSign, Gamepad2, Globe, Lock, Swords } from 'lucide-react';

const PRESETS = [5, 10, 25, 50, 100];

interface CreateDuelFormCardProps {
  amount: string;
  onAmountChange: (value: string) => void;
  isValidAmount: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  isValidMessage: boolean;
  gameName: string;
  onGameNameChange: (value: string) => void;
  isPublic: boolean;
  onPublicChange: (value: boolean) => void;
  selectedChain: keyof typeof SUPPORTED_CHAINS;
  onChainChange: (value: keyof typeof SUPPORTED_CHAINS) => void;
  isAuthenticated: boolean;
  isSubmitDisabled: boolean;
  onSubmit: () => void;
}

export function CreateDuelFormCard({
  amount,
  onAmountChange,
  isValidAmount,
  message,
  onMessageChange,
  isValidMessage,
  gameName,
  onGameNameChange,
  isPublic,
  onPublicChange,
  selectedChain,
  onChainChange,
  isAuthenticated,
  isSubmitDisabled,
  onSubmit,
}: CreateDuelFormCardProps) {
  const { t } = useTranslation();
  const numericAmount = parseFloat(amount) || 0;
  const messageCharacterCount = countDuelMessageCharacters(message);
  const potAmount = numericAmount * 2;

  return (
    <div className="card-glow animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-3">
        <label className="text-sm font-semibold text-slate-700">
          {t('create.duelType')}
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPublicChange(false)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
              !isPublic
                ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Lock className="h-4 w-4" />
            {t('create.private')}
          </button>
          <button
            type="button"
            onClick={() => onPublicChange(true)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
              isPublic
                ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Globe className="h-4 w-4" />
            {t('create.public')}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {isPublic ? t('create.publicHint') : t('create.privateHint')}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="wager-amount" className="text-sm font-semibold text-slate-700">
          {t('create.amount')}
        </label>
        <div className="relative">
          <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="wager-amount"
            type="number"
            min={MIN_WAGER}
            step="1"
            placeholder={t('create.amountPlaceholder')}
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            className="h-12 border-slate-200 pl-9 pr-16 text-lg font-semibold focus:border-indigo-300 focus:ring-indigo-200"
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
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                parseFloat(amount) === preset
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        {amount && !isValidAmount && (
          <p className="text-xs text-red-500">{t('create.min')}</p>
        )}
      </div>

      <div className="my-6 h-px bg-slate-100" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <label
            className="text-sm font-semibold text-slate-700"
            htmlFor="duel-message"
          >
            {t('create.message')}
          </label>
          <span
            className={`text-xs font-medium ${
              isValidMessage ? 'text-slate-400' : 'text-red-500'
            }`}
          >
            {t('create.messageCounter', {
              count: messageCharacterCount,
              max: MAX_DUEL_MESSAGE_CHARACTERS,
            })}
          </span>
        </div>

        <textarea
          id="duel-message"
          rows={3}
          placeholder={t('create.messagePlaceholder')}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          className="min-h-[96px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />

        <p className="text-xs text-slate-500">{t('create.messageHint')}</p>
        {!isValidMessage && (
          <p className="text-xs text-red-500">{t('create.messageTooLong')}</p>
        )}
      </div>

      <div className="my-6 h-px bg-slate-100" />

      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Gamepad2 className="h-4 w-4 text-indigo-600" />
          {t('create.game')}
        </label>
        <GameAutocomplete value={gameName} onChange={onGameNameChange} />
      </div>

      <div className="my-6 h-px bg-slate-100" />

      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-slate-700">
          {t('create.chain')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(SUPPORTED_CHAINS) as Array<keyof typeof SUPPORTED_CHAINS>).map(
            (key) => {
              const chain = SUPPORTED_CHAINS[key];
              const isSelected = selectedChain === key;
              const isArbitrum = key === 'arbitrum' || key === 'arbitrumSepolia';

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChainChange(key)}
                  className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                      isArbitrum
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    <span className="text-base font-bold">
                      {isArbitrum ? 'A' : 'P'}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? 'text-indigo-700' : 'text-slate-600'
                    }`}
                  >
                    {chain.name}
                  </span>
                  {isSelected && (
                    <div className="absolute -right-px -top-px flex h-5 w-5 items-center justify-center rounded-bl-lg rounded-tr-[10px] bg-indigo-500">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            }
          )}
        </div>
      </div>

      {numericAmount > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">{t('create.pot')}</span>
            <span className="text-xl font-bold text-slate-900">
              {potAmount}{' '}
              <span className="text-sm font-medium text-slate-400">USDT</span>
            </span>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {t('create.potHint')}
          </span>
        </div>
      )}

      <Button
        size="lg"
        className="mt-6 h-12 w-full bg-indigo-600 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-200 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200"
        onClick={onSubmit}
        disabled={isSubmitDisabled}
      >
        {!isAuthenticated ? (
          t('nav.connectWallet')
        ) : (
          <>
            <Swords className="mr-2 h-4 w-4" />
            {t('create.button')}
          </>
        )}
      </Button>

      <p className="mt-3 text-center text-xs text-slate-500">
        {isPublic ? t('create.publicHint') : t('create.privateInvite')}
      </p>
    </div>
  );
}
