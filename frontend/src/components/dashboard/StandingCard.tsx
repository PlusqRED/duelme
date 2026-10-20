'use client';

import Link from 'next/link';
import { StandingReputation } from '@/components/dashboard/StandingReputation';
import { StandingTotals } from '@/components/dashboard/StandingTotals';
import { Avatar } from '@/components/identity/Avatar';
import { useReputation } from '@/hooks/useReputation';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import type { MyTotals } from '@/lib/dashboard';
import { truncateAddress } from '@/lib/utils';

interface StandingCardProps {
  /** Checksummed, for showing. */
  address: string;
  walletAddress: `0x${string}`;
  totals: MyTotals;
}

/**
 * Who the reader is, beside their duels: their address and profile, their reputation and their
 * totals. Between a phone and the wide layout, where it sits under the duels, it takes two columns.
 */
export function StandingCard({ address, walletAddress, totals }: StandingCardProps) {
  const { t } = useTranslation();
  const reputation = useReputation(walletAddress, DEFAULT_CHAIN_ID);
  const isKnown = !reputation.isLoading && !reputation.isError;

  return (
    <section
      aria-labelledby="standing-title"
      className="grid gap-[18px] rounded-3xl border border-line bg-paper p-5 min-[720px]:max-[1080px]:grid-cols-2 min-[720px]:max-[1080px]:gap-x-7"
    >
      <div className="col-span-full flex items-center gap-3.5">
        <Avatar address={address} tone="ink" className="size-14" />
        <div className="grid min-w-0 justify-items-start">
          <h2 id="standing-title" className="text-[1.1875rem] tracking-[-0.01em] tabular-nums">
            {truncateAddress(address)}
          </h2>
          <Link href="/profile" className="link inline-flex min-h-8 items-center text-body-sm">
            {t('nav.myProfile')}
          </Link>
        </div>
      </div>
      {isKnown ? (
        <StandingReputation address={address} honored={reputation.honored} abandoned={reputation.abandoned} />
      ) : (
        <div aria-hidden="true" className="grid gap-3 border-t border-line pt-4">
          <span className="h-8 animate-wait rounded-full bg-canvas-deep" />
          <span className="h-[120px] animate-wait rounded-2xl bg-canvas-deep" />
        </div>
      )}
      <StandingTotals totals={totals} />
    </section>
  );
}
