'use client';

import { DollarSign, Gamepad2, Globe, Lock, MessageSquare, Pencil } from 'lucide-react';
import { NetworkChip } from '@/components/duel/wizard/NetworkChip';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translations';
import type { ChainKey } from '@/lib/constants';
import type { GameCategory } from '@/lib/game';
import { parseWager } from '@/lib/wager';

interface ReviewStepProps {
  gameName: string;
  gameCategory: GameCategory | null;
  amount: string;
  isPublic: boolean;
  message: string;
  chainKey: ChainKey;
  onEditStep: (index: number) => void;
}

export function ReviewStep({
  gameName,
  gameCategory,
  amount,
  isPublic,
  message,
  chainKey,
  onEditStep,
}: ReviewStepProps) {
  const { t } = useTranslation();
  const { numeric, pot } = parseWager(amount);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none sm:text-2xl">
          {t('wizard.title.review')}
        </h2>
        <p className="text-sm text-slate-500">{t('wizard.subtitle.review')}</p>
        <NetworkChip chainKey={chainKey} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <ReviewRow
          icon={<Gamepad2 className="h-4 w-4" />}
          label={t('wizard.review.game')}
          value={
            <span>
              <span className="font-semibold text-slate-900">{gameName}</span>
              {gameCategory && (
                <span className="ml-2 text-xs text-slate-500">
                  · {t(`category.${gameCategory}` as TranslationKey)}
                </span>
              )}
            </span>
          }
          onEdit={() => onEditStep(0)}
          editLabel={t('wizard.review.edit')}
        />
        <ReviewRow
          icon={<DollarSign className="h-4 w-4" />}
          label={t('wizard.review.wager')}
          value={
            <span className="font-semibold text-slate-900">
              {numeric} USDT
              <span className="ml-2 text-xs font-normal text-slate-500">
                · {t('wizard.review.pot', { pot })}
              </span>
            </span>
          }
          onEdit={() => onEditStep(1)}
          editLabel={t('wizard.review.edit')}
        />
        <ReviewRow
          icon={isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          label={t('wizard.review.type')}
          value={
            <span className="font-semibold text-slate-900">
              {isPublic ? t('create.public') : t('create.private')}
            </span>
          }
          onEdit={() => onEditStep(2)}
          editLabel={t('wizard.review.edit')}
        />
        <ReviewRow
          icon={<MessageSquare className="h-4 w-4" />}
          label={t('wizard.review.message')}
          value={
            message.trim() ? (
              <span className="text-slate-700">&ldquo;{message}&rdquo;</span>
            ) : (
              <span className="text-slate-400">{t('wizard.review.noMessage')}</span>
            )
          }
          onEdit={() => onEditStep(2)}
          editLabel={t('wizard.review.edit')}
          isLast
        />
      </div>

      <p className="text-xs text-slate-500">{t('wizard.review.footer')}</p>
    </div>
  );
}

function ReviewRow({
  icon,
  label,
  value,
  onEdit,
  editLabel,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  onEdit: () => void;
  editLabel: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-4 ${
        isLast ? '' : 'border-b border-slate-100'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </div>
          <div className="mt-0.5 text-sm">{value}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
