'use client';

import { Globe, Lock } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import { useContractConfig } from '@/hooks/useContractConfig';
import { countDuelMessageCharacters } from '@/lib/duelMessage';

export const MESSAGE_PLACEHOLDER_KEYS: readonly TranslationKey[] = [
  'create.messagePlaceholder.01',
  'create.messagePlaceholder.02',
  'create.messagePlaceholder.03',
  'create.messagePlaceholder.04',
  'create.messagePlaceholder.05',
  'create.messagePlaceholder.06',
  'create.messagePlaceholder.07',
  'create.messagePlaceholder.08',
  'create.messagePlaceholder.09',
  'create.messagePlaceholder.10',
  'create.messagePlaceholder.11',
  'create.messagePlaceholder.12',
  'create.messagePlaceholder.13',
  'create.messagePlaceholder.14',
];

interface TypeMessageStepProps {
  isPublic: boolean;
  onPublicChange: (value: boolean) => void;
  message: string;
  onMessageChange: (value: string) => void;
  isMessageValid: boolean;
  placeholderKey: TranslationKey;
}

export function TypeMessageStep({
  isPublic,
  onPublicChange,
  message,
  onMessageChange,
  isMessageValid,
  placeholderKey,
}: TypeMessageStepProps) {
  const { t } = useTranslation();
  const { maxMessageCharacters } = useContractConfig();
  const messageLength = countDuelMessageCharacters(message);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none sm:text-2xl">
          {t('wizard.title.type')}
        </h2>
        <p className="text-sm text-slate-500">{t('wizard.subtitle.type')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold text-slate-700">
          {t('create.duelType')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <DuelTypeButton
            isSelected={!isPublic}
            onClick={() => onPublicChange(false)}
            icon={<Lock className="h-4 w-4" />}
            label={t('create.private')}
            hint={t('create.privateHint')}
          />
          <DuelTypeButton
            isSelected={isPublic}
            onClick={() => onPublicChange(true)}
            icon={<Globe className="h-4 w-4" />}
            label={t('create.public')}
            hint={t('create.publicHint')}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="wizard-message" className="text-sm font-semibold text-slate-700">
            {t('create.message')}
          </label>
          <span
            className={`text-xs font-medium ${
              isMessageValid ? 'text-slate-400' : 'text-red-500'
            }`}
          >
            {t('create.messageCounter', {
              count: messageLength,
              max: maxMessageCharacters,
            })}
          </span>
        </div>
        <textarea
          id="wizard-message"
          rows={3}
          placeholder={t(placeholderKey)}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          className="min-h-[96px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 transition-colors outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
        <p className="text-xs text-slate-500">{t('create.messageHint', { max: maxMessageCharacters })}</p>
        {!isMessageValid && (
          <p className="text-xs text-red-500">{t('create.messageTooLong', { max: maxMessageCharacters })}</p>
        )}
      </div>
    </div>
  );
}

function DuelTypeButton({
  isSelected,
  onClick,
  icon,
  label,
  hint,
}: {
  isSelected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-20 flex-col items-start gap-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50/50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div
        className={`flex items-center gap-2 text-sm font-semibold ${
          isSelected ? 'text-indigo-700' : 'text-slate-700'
        }`}
      >
        {icon}
        {label}
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
    </button>
  );
}
