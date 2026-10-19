'use client';

import { useId } from 'react';
import { EscrowCard } from '@/components/landing/EscrowCard';
import { Guarantees } from '@/components/landing/Guarantees';
import { SectionHead } from '@/components/landing/SectionHead';
import { useTranslation } from '@/i18n/useTranslation';
import { LANDING_SECTION_IDS } from '@/lib/navigation';

/**
 * The page's one navy band, the contract's own colour: the escrow contract to check for yourself,
 * and the four guarantees it gives.
 */
export function Safety() {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <section
      id={LANDING_SECTION_IDS.safety}
      aria-labelledby={titleId}
      className="mt-section bg-ink py-[clamp(56px,6vw,88px)] text-paper [&_:focus-visible]:outline-sun"
    >
      <div className="mx-auto w-full max-w-page px-gutter">
        <div className="grid gap-7 wide:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] wide:items-center wide:gap-14">
          <SectionHead titleId={titleId} title={t('trust.title')} subtitle={t('trust.subtitle')} isOnNavy className="mb-0" />
          <EscrowCard />
        </div>
        <Guarantees className="mt-9" />
      </div>
    </section>
  );
}
