'use client';

import type { ReactNode } from 'react';
import { speechClassName } from '@/components/arena/Bubble';
import { ReputationPill } from '@/components/identity/ReputationPill';
import { CopyAddress } from '@/components/profile/CopyAddress';
import { ProfileFace } from '@/components/profile/ProfileFace';
import type { Profile } from '@/lib/profile';
import type { ReputationLevel } from '@/lib/reputation';
import { cn, truncateAddress } from '@/lib/utils';

interface ProfileHeadProps {
  address: string;
  profile: Profile | null;
  /** Null while the record is still being read, or could not be. */
  level: ReputationLevel | null;
  /** The ways on from the head: editing it, seeing it as others do. */
  children?: ReactNode;
}

/**
 * Who the player is: their face taking its seat, their status said in a bubble over it, their name,
 * their address to copy and their level.
 */
export function ProfileHead({ address, profile, level, children }: ProfileHeadProps) {
  const name = profile?.nickname ?? truncateAddress(address);

  return (
    <header className="mb-[clamp(28px,4vw,44px)] grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-[clamp(16px,2.6vw,28px)] gap-y-3 [--face:clamp(84px,11vw,120px)]">
      {profile?.status && (
        <p
          className={cn(
            speechClassName,
            'relative col-span-full mb-1 max-w-[min(100%,56ch)] origin-bottom-left animate-pop justify-self-start px-3.5 py-2 text-body-sm/[1.35] font-label [overflow-wrap:anywhere] [--tone:var(--color-ink)]',
            'after:left-[calc(var(--face)/2+4px)]'
          )}
        >
          {profile.status}
        </p>
      )}
      <span className="block animate-take-seat rounded-full bg-paper p-1 shadow-pin ring-2 ring-ink [--from:-24px]">
        <ProfileFace profile={profile} displayName={name} address={address} className="size-(--face)" />
      </span>
      <div className="grid min-w-0 justify-items-start gap-1.5">
        <h1 className="max-w-full text-h1 [overflow-wrap:anywhere] max-xs:text-h2">{name}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CopyAddress address={address} isFull={!profile?.nickname} />
          {level && <ReputationPill level={level} className="h-7 text-sm" />}
        </p>
      </div>
      {children && <div className="col-span-full mt-2 flex flex-wrap gap-3">{children}</div>}
    </header>
  );
}
