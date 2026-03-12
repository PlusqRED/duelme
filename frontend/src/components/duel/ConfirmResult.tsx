'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/i18n/useTranslation';
import { truncateAddress, formatTimeRemaining } from '@/lib/utils';
import { CLAIM_TIMEOUT } from '@/lib/constants';
import { CheckCircle, Clock, RotateCcw, Trophy, UserRound, XCircle } from 'lucide-react';

interface ConfirmResultProps {
  claimedBy: string;
  claimedWinner: string;
  viewerAddress?: string;
  isParticipantViewer: boolean;
  claimTimestamp: number;
  onConfirm: () => void;
  onDispute: () => void;
  onRefund: () => void;
  isPending: boolean;
  canConfirm: boolean;
  canDispute: boolean;
  canRefund: boolean;
}

export function ConfirmResult({
  claimedBy,
  claimedWinner,
  viewerAddress,
  isParticipantViewer,
  claimTimestamp,
  onConfirm,
  onDispute,
  onRefund,
  isPending,
  canConfirm,
  canDispute,
  canRefund,
}: ConfirmResultProps) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(0);
  const normalizedViewer = viewerAddress?.toLowerCase();
  const normalizedClaimedBy = claimedBy.toLowerCase();
  const normalizedClaimedWinner = claimedWinner.toLowerCase();
  const isClaimer = normalizedViewer === normalizedClaimedBy;
  const viewerIsReportedWinner = normalizedViewer === normalizedClaimedWinner;

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

  const timedOut = remaining <= 0;

  const formatParticipant = (address: string) =>
    normalizedViewer === address.toLowerCase()
      ? `${t('duel.you')} • ${truncateAddress(address)}`
      : truncateAddress(address);

  const title = !isParticipantViewer
    ? t('duel.resultUnderReview')
    : isClaimer
      ? t('duel.awaitingOpponentResponse')
      : t('duel.reviewReportedResult');
  const summary = !isParticipantViewer
    ? t('duel.spectatorResultSummary', {
        claimedBy: formatParticipant(claimedBy),
        claimedWinner: formatParticipant(claimedWinner),
      })
    : isClaimer
      ? viewerIsReportedWinner
        ? t('duel.youReportedYouWon')
        : t('duel.youReportedOpponentWon')
      : viewerIsReportedWinner
        ? t('duel.opponentReportedYouWon')
        : t('duel.opponentReportedThemWon');

  return (
    <Card className="border-amber-200 bg-amber-50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-amber-800">
          <Clock className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-amber-700">{summary}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-white/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-amber-700">
              <UserRound className="h-3.5 w-3.5" />
              {t('duel.reportedBy')}
            </div>
            <p className="font-mono text-sm font-semibold text-slate-900">
              {formatParticipant(claimedBy)}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-700">
              <Trophy className="h-3.5 w-3.5" />
              {t('duel.reportedWinner')}
            </div>
            <p className="font-mono text-sm font-semibold text-emerald-900">
              {formatParticipant(claimedWinner)}
            </p>
          </div>
        </div>

        {!timedOut && (
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {t('duel.timeLeft')}: <strong>{formatTimeRemaining(remaining)}</strong>
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {canConfirm && !timedOut && (
            <Button
              size="lg"
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onConfirm}
              disabled={isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('action.confirm')}
            </Button>
          )}
          {canDispute && !timedOut && (
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={onDispute}
              disabled={isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {t('action.dispute')}
            </Button>
          )}
          {canRefund && timedOut && (
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-slate-300"
              onClick={onRefund}
              disabled={isPending}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('action.refund')}
            </Button>
          )}
        </div>

        {timedOut ? (
          <p className="text-xs text-amber-700">{t('duel.timeoutReached')}</p>
        ) : !isParticipantViewer ? (
          <p className="text-xs text-amber-700">{t('duel.spectatorResultHint')}</p>
        ) : isClaimer ? (
          <p className="text-xs text-amber-700">{t('duel.waitingOpponentReviewHint')}</p>
        ) : (
          <div className="space-y-2 text-xs text-amber-700">
            <p>{t('duel.reviewGuidance')}</p>
            <p>{t('duel.disputeGuidance')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
