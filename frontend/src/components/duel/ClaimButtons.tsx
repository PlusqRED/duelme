'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { Trophy, Flag } from 'lucide-react';

interface ClaimButtonsProps {
  onClaimVictory: () => void;
  onAdmitDefeat: () => void;
  isPending: boolean;
}

export function ClaimButtons({
  onClaimVictory,
  onAdmitDefeat,
  isPending,
}: ClaimButtonsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-3">
      <Button
        size="lg"
        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={onClaimVictory}
        disabled={isPending}
      >
        <Trophy className="mr-2 h-4 w-4" />
        {t('action.iWon')}
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="flex-1 border-slate-300 text-slate-600 hover:bg-slate-50"
        onClick={onAdmitDefeat}
        disabled={isPending}
      >
        <Flag className="mr-2 h-4 w-4" />
        {t('action.iLost')}
      </Button>
    </div>
  );
}
