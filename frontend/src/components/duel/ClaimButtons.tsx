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
        className="flex-1"
        onClick={onClaimVictory}
        disabled={isPending}
      >
        <Trophy className="mr-2 h-4 w-4" />
        {t('action.iWon')}
      </Button>
      <Button
        size="lg"
        variant="paper"
        className="flex-1"
        onClick={onAdmitDefeat}
        disabled={isPending}
      >
        <Flag className="mr-2 h-4 w-4" />
        {t('action.iLost')}
      </Button>
    </div>
  );
}
