'use client';

import { RotateCcw } from 'lucide-react';
import { useContractConfig } from '@/hooks/useContractConfig';
import { useTranslation } from '@/i18n/useTranslation';

interface RestoredDraftNoticeProps {
  isValidWager: boolean;
  isValidMessage: boolean;
}

/**
 * Says the form came back, and — when the restored terms no longer pass today's on-chain limits —
 * which one failed, in the wizard's own words. The Create button stays closed by the same checks.
 */
export function RestoredDraftNotice({ isValidWager, isValidMessage }: RestoredDraftNoticeProps) {
  const { t } = useTranslation();
  const { minWager, maxMessageCharacters } = useContractConfig();

  return (
    <div role="status" className="mb-4 flex flex-col gap-1 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm">
      <span className="flex items-center gap-1.5 font-medium text-indigo-800">
        <RotateCcw className="h-4 w-4 shrink-0" />
        {t('deposit.restored')}
      </span>
      {!isValidWager && <span className="text-red-700">{t('create.min', { min: minWager })}</span>}
      {!isValidMessage && <span className="text-red-700">{t('create.messageTooLong', { max: maxMessageCharacters })}</span>}
    </div>
  );
}
