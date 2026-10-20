'use client';

import { useId } from 'react';
import { PartialDataNotice } from '@/components/duel/PartialDataNotice';
import { PlayerTotals } from '@/components/identity/PlayerTotals';
import { usePlayerTotals } from '@/hooks/usePlayerTotals';
import { useTranslation } from '@/i18n/useTranslation';

/** A player's duels in figures, as the dashboard shows the reader's own. */
export function RecordCard({ address }: { address: `0x${string}` }) {
  const { t } = useTranslation();
  const titleId = useId();
  const { totals, isError, retry } = usePlayerTotals(address);

  return (
    <section aria-labelledby={titleId} className="grid content-start gap-4 rounded-[28px] border border-line bg-paper p-[clamp(18px,3vw,28px)]">
      <h2 id={titleId} className="text-xl">
        {t('profile.record.title')}
      </h2>
      <PartialDataNotice when={isError} onRetry={() => void retry()} />
      <PlayerTotals totals={totals} />
    </section>
  );
}
