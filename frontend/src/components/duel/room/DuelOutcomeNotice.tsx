'use client';

import { Handshake, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TranslationKey } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { DuelState, type Duel } from '@/lib/contracts';
import { isDuelFullySettled, ZERO_ADDRESS } from '@/lib/duel';
import { formatUSDT } from '@/lib/utils';

const CLAIM_HINTS: Partial<Record<DuelState, TranslationKey>> = {
  [DuelState.Resolved]: 'duel.resolvedClaimHint',
  [DuelState.Refunded]: 'duel.refundedClaimHint',
  [DuelState.Declined]: 'duel.declinedClaimHint',
  [DuelState.Disputed]: 'duel.disputedClaimHint',
  [DuelState.MutuallyCancelled]: 'duel.mutuallyCancelledClaimHint',
  [DuelState.Cancelled]: 'duel.cancelledClaimHint',
};

interface DuelOutcomeNoticeProps {
  duel: Duel;
  resolveDisplay: (address: string) => string;
  /** The reader plays in this duel and is signed in. */
  canManage: boolean;
  claimableAmount: bigint;
  isBusy: boolean;
  onClaim: () => void;
}

/**
 * How a finished duel ended, and the money it still holds: what the reader can take and the button
 * that takes it. Kept from the old page until the duel page's own panel replaces it.
 */
export function DuelOutcomeNotice({ duel, resolveDisplay, canManage, claimableAmount, isBusy, onClaim }: DuelOutcomeNoticeProps) {
  const { t, language } = useTranslation();
  const state = duel.state;
  const claimHintKey = isDuelFullySettled(duel) ? null : (CLAIM_HINTS[state] ?? null);
  const canClaim = canManage && claimableAmount > 0n;

  return (
    <>
      {state === DuelState.Resolved && duel.claimedWinner !== ZERO_ADDRESS && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-good-soft p-4">
          <Trophy className="h-5 w-5 text-good-ink" />
          <span className="text-sm font-semibold text-good-ink">
            {resolveDisplay(duel.claimedWinner)} {t('recent.won')}!
          </span>
        </div>
      )}

      {state === DuelState.Refunded && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-canvas p-4">
          <RotateCcw className="h-5 w-5 text-ink-3" />
          <span className="text-sm text-ink-2">{t('duel.refunded')}</span>
        </div>
      )}

      {state === DuelState.Cancelled && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-canvas p-4">
          <XCircle className="h-5 w-5 text-ink-3" />
          <span className="text-sm text-ink-3">{t('duel.cancelled')}</span>
        </div>
      )}

      {state === DuelState.Declined && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-orange-soft p-4">
          <XCircle className="h-5 w-5 text-orange-ink" />
          <span className="text-sm font-medium text-orange-ink">{t('duel.declined')}</span>
        </div>
      )}

      {state === DuelState.Disputed && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-orange-soft p-4">
          <RotateCcw className="h-5 w-5 text-orange" />
          <span className="text-sm font-medium text-orange-ink">{t('duel.disputed')}</span>
        </div>
      )}

      {state === DuelState.MutuallyCancelled && (
        <div className="space-y-3 rounded-xl bg-canvas p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Handshake className="h-5 w-5 text-ink-2" />
            <span className="text-sm font-medium text-ink">{t('duel.mutuallyCancelled')}</span>
          </div>
          <p className="text-sm text-ink-2">{t('duel.mutuallyCancelledSummary')}</p>
        </div>
      )}

      {claimHintKey && (
        <div className="rounded-2xl border border-line bg-canvas p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              {canClaim && <p className="text-lg font-bold text-ink">{formatUSDT(claimableAmount, language)} USDT</p>}
              <p className="text-sm text-ink-2">{t(claimHintKey)}</p>
            </div>
            {canClaim && (
              <Button variant="sun" size="lg" className="w-full sm:w-auto" onClick={onClaim} disabled={isBusy}>
                {t('action.claimFunds')}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
