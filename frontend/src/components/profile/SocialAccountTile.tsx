'use client';

import type { ReactNode } from 'react';
import { PLATFORM_NAME_KEY, PlatformIcon } from '@/components/profile/PlatformIcon';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { SocialPlatform } from '@/lib/profile';
import type { SocialAccount } from '@/lib/profileEdit';
import { cn } from '@/lib/utils';

interface SocialAccountTileProps {
  platform: SocialPlatform;
  /** The account linked there, or null for a slot still empty. */
  account: SocialAccount | null;
  /** What the owner can do with it: connect it, change it, unlink it. */
  children?: ReactNode;
}

/**
 * One platform on a profile: its logo on an ink token, the account and the way to it, and whether
 * signing in to it proved it is theirs. A slot nobody filled is drawn dashed, like an open seat.
 */
export function SocialAccountTile({ platform, account, children }: SocialAccountTileProps) {
  const { t } = useTranslation();

  return (
    <li
      className={cn(
        'grid content-start gap-3 rounded-tile p-3.5',
        account ? 'border-[1.5px] border-line bg-paper' : 'border-2 border-dashed border-line-strong'
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full',
            account ? 'bg-ink text-paper inset-shadow-avatar' : 'bg-canvas text-ink-3'
          )}
        >
          <PlatformIcon platform={platform} className="size-5" />
        </span>
        <span className="grid min-w-0 flex-1 justify-items-start">
          <span className="text-note text-ink-3">{t(PLATFORM_NAME_KEY[platform])}</span>
          {account === null ? (
            <span className="font-label text-ink-3">{t('profile.socialLinks.notLinked')}</span>
          ) : account.href ? (
            <a
              href={account.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group/account -my-2.5 inline-flex min-h-11 max-w-full items-center gap-1 font-strong hover:text-blue-deep"
            >
              <span className="truncate">{account.label}</span>
              <Icon
                name="external"
                className="size-3.5 text-ink-3 transition-[translate] duration-200 ease-press group-hover/account:translate-x-0.5 group-hover/account:-translate-y-0.5"
              />
            </a>
          ) : (
            <span className="max-w-full truncate font-strong">{account.label}</span>
          )}
        </span>
        {account && <Proof isVerified={account.isVerified} />}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </li>
  );
}

/** Proven by signing in, in the green of a duel honored; only typed in, dashed and quiet. */
function Proof({ isVerified }: { isVerified: boolean }) {
  const { t } = useTranslation();

  return isVerified ? (
    <Chip className="bg-good-soft font-strong text-good-ink">
      <Icon name="check" className="size-3.5 stroke-[2.8]" />
      {t('profile.socialLinks.verified')}
    </Chip>
  ) : (
    <Chip className="border-[1.5px] border-dashed border-line-strong bg-transparent">{t('profile.socialLinks.selfReported')}</Chip>
  );
}
