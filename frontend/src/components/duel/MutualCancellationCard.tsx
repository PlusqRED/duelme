'use client';

import { Handshake, Undo2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { truncateAddress, formatDateTime } from '@/lib/utils';

type MutualCancellationPendingAction =
  | 'idle'
  | 'requestingMutualCancel'
  | 'acceptingMutualCancel'
  | 'decliningMutualCancelRequest'
  | 'withdrawingMutualCancelRequest'
  | (string & {});

interface MutualCancellationCardProps {
  mode: 'available' | 'requester' | 'responder' | 'spectator';
  requestedBy?: string;
  requestedAt?: bigint;
  viewerAddress?: string;
  pendingAction: MutualCancellationPendingAction;
  isPending: boolean;
  onRequest?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onWithdraw?: () => void;
  resolveDisplay?: (address: string) => string;
}

export function MutualCancellationCard({
  mode,
  requestedBy,
  requestedAt,
  viewerAddress,
  pendingAction,
  isPending,
  onRequest,
  onAccept,
  onDecline,
  onWithdraw,
  resolveDisplay,
}: MutualCancellationCardProps) {
  const { t, language } = useTranslation();
  const isRequester = mode === 'requester';
  const isResponder = mode === 'responder';
  const normalizedViewer = viewerAddress?.toLowerCase();
  const displayRequester = requestedBy ? (resolveDisplay?.(requestedBy) ?? truncateAddress(requestedBy)) : null;
  const formattedRequester = requestedBy
    ? normalizedViewer === requestedBy.toLowerCase()
      ? `${t('duel.you')} • ${displayRequester}`
      : displayRequester
    : null;

  if (mode === 'available') {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
              <Handshake className="h-4 w-4" />
              <span>{t('duel.requestCancellationTitle')}</span>
            </div>
            <p className="text-sm text-violet-800">{t('duel.requestCancellationHint')}</p>
          </div>

          <Button
            size="lg"
            variant="outline"
            className="w-full border-violet-300 bg-white text-violet-900 hover:bg-violet-100 sm:w-auto"
            onClick={onRequest}
            disabled={isPending}
          >
            {t('action.requestCancellation')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <Handshake className="h-4 w-4" />
            <span>
              {isRequester
                ? t('duel.awaitingCancellationDecision')
                : isResponder
                  ? t('duel.reviewCancellationRequest')
                  : t('duel.cancellationPending')}
            </span>
          </div>
          <p className="text-sm text-violet-800">
            {isRequester
              ? t('duel.mutualCancelRequestedByYou')
              : isResponder
                ? t('duel.mutualCancelRequestedByOpponent')
                : t('duel.cancellationPendingSpectator')}
          </p>
        </div>

        {(formattedRequester || requestedAt) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {formattedRequester && (
              <div className="rounded-xl border border-violet-200 bg-white/80 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-700">
                  {t('duel.mutualCancelRequestedByLabel')}
                </div>
                <p className="font-mono text-sm font-semibold text-slate-900">{formattedRequester}</p>
              </div>
            )}

            {requestedAt && requestedAt > 0n && (
              <div className="rounded-xl border border-violet-200 bg-white/80 p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-700">
                  {t('duel.mutualCancelRequestedAtLabel')}
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatDateTime(requestedAt, language)}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {isResponder && (
            <>
              <Button
                size="lg"
                className="flex-1 bg-violet-600 text-white hover:bg-violet-700"
                onClick={onAccept}
                disabled={isPending}
              >
                <Handshake className="mr-2 h-4 w-4" />
                {pendingAction === 'acceptingMutualCancel'
                  ? t('status.acceptingCancellation')
                  : t('action.acceptCancellation')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 border-violet-300 text-violet-900 hover:bg-violet-100"
                onClick={onDecline}
                disabled={isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {pendingAction === 'decliningMutualCancelRequest'
                  ? t('status.processing')
                  : t('action.declineCancellation')}
              </Button>
            </>
          )}

          {isRequester && (
            <Button
              size="lg"
              variant="outline"
              className="w-full border-violet-300 text-violet-900 hover:bg-violet-100 sm:w-auto"
              onClick={onWithdraw}
              disabled={isPending}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              {pendingAction === 'withdrawingMutualCancelRequest'
                ? t('status.withdrawing')
                : t('action.withdrawCancellationRequest')}
            </Button>
          )}
        </div>

        <p className="text-xs text-violet-800">
          {isRequester
            ? t('duel.mutualCancelRequesterHint')
            : isResponder
              ? t('duel.mutualCancelResponderHint')
              : t('duel.cancellationPendingSpectatorHint')}
        </p>
      </div>
    </div>
  );
}
