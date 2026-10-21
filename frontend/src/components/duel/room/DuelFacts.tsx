'use client';

import { useId, type ReactNode } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

export interface DuelFact {
  label: string;
  value: ReactNode;
  /** Good news (the platform fee of 0), the pot as the point of the card, or a choice not made yet. */
  tone?: 'good' | 'pot' | 'unset';
}

const valueTones: Record<NonNullable<DuelFact['tone']>, string> = {
  good: 'text-good-ink',
  pot: 'text-lg font-extrabold',
  unset: 'font-semibold text-ink-3',
};

interface DuelFactsProps {
  rows: readonly DuelFact[];
  /** Under the facts: the create page's way on. */
  children?: ReactNode;
}

/** "This duel": a duel's facts as label and value, the value taking what the label leaves and wrapping on its own. */
export function DuelFacts({ rows, children }: DuelFactsProps) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="rounded-3xl border border-line bg-paper px-[22px] py-5">
      <h2 id={titleId} className="mb-2 text-body/[1.12] tracking-[-0.01em]">
        {t('room.ledger.title')}
      </h2>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 border-t border-line py-[9px] first:border-t-0">
            {/* On a narrow phone a long label wraps, never the value: «Комиссия платформы» and its
                value outgrow a 320px card on one line. */}
            <dt className="min-w-0 text-body-sm text-ink-3">{row.label}</dt>
            <dd
              className={cn(
                'flex min-w-min flex-[1_1_0] items-center justify-end gap-1.5 text-right font-strong tabular-nums [&_svg]:size-4',
                row.tone && valueTones[row.tone]
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}
