'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { truncateAddress, formatTimeRemaining } from '@/lib/utils';
import { CLAIM_TIMEOUT } from '@/lib/constants';
import { CheckCircle, Clock } from 'lucide-react';

interface ConfirmResultProps {
  claimedBy: string;
  claimTimestamp: number;
  onConfirm: () => void;
  isPending: boolean;
}

export function ConfirmResult({
  claimedBy,
  claimTimestamp,
  onConfirm,
  isPending,
}: ConfirmResultProps) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    function update() {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - claimTimestamp;
      const left = Math.max(0, CLAIM_TIMEOUT - elapsed);
      setRemaining(left);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [claimTimestamp]);

  return (
    <Card className="border-amber-200 bg-amber-50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-amber-800">
          <Clock className="h-4 w-4" />
          {t('duel.waitingConfirm')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-amber-700">
          <span className="font-mono font-semibold">
            {truncateAddress(claimedBy)}
          </span>{' '}
          {t('action.iWon').toLowerCase()}.
        </p>

        <div className="flex items-center gap-2 text-sm text-amber-700">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {t('duel.timeLeft')}: <strong>{formatTimeRemaining(remaining)}</strong>
          </span>
        </div>

        <div className="flex gap-3">
          <Button
            size="lg"
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={onConfirm}
            disabled={isPending}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('action.confirm')}
          </Button>
        </div>

        <p className="text-xs text-amber-600">
          {t('action.deny')} &mdash;{' '}
          {remaining <= 0
            ? 'Timeout reached. Both players can claim a refund.'
            : 'If you do not confirm, both players will be refunded after the timeout.'}
        </p>
      </CardContent>
    </Card>
  );
}
