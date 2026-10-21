'use client';

import { Avatar } from '@/components/identity/Avatar';
import { PlayerLink } from '@/components/identity/PlayerLink';
import { ReputationPill } from '@/components/identity/ReputationPill';
import { useTranslation } from '@/i18n/useTranslation';
import type { ReputationSummary } from '@/lib/reputation';

interface TurnFoeProps {
  address: `0x${string}`;
  name: string;
  /** Their record; unknown until the contract has answered. */
  level: ReputationSummary | undefined;
}

/** Who the reader would play, before they put money in: the creator's face and name, leading to their profile, then their level and record. */
export function TurnFoe({ address, name, level }: TurnFoeProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-2xl bg-canvas px-3.5 py-3 text-body-sm">
      <span className="basis-full text-note font-strong text-ink-3">{t('room.created.guest.check')}</span>
      <PlayerLink address={address} className="inline-flex items-center gap-x-2.5 font-strong tabular-nums">
        <Avatar address={address} tone="red" className="size-[30px] inset-shadow-none" />
        {name}
      </PlayerLink>
      {level && (
        <>
          <ReputationPill level={level.level} className="text-body-sm" />
          <span className="text-sm text-ink-2">{t('room.rep.stats', { honored: level.honored, abandoned: level.abandoned })}</span>
        </>
      )}
    </div>
  );
}
