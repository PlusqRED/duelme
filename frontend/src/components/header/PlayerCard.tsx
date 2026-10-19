'use client';

import Link from 'next/link';
import { Avatar } from '@/components/identity/Avatar';
import { LevelBadge } from '@/components/identity/LevelBadge';
import { QuestLine } from '@/components/identity/QuestLine';
import { Icon } from '@/components/ui/icon';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { useReputation } from '@/hooks/useReputation';
import { useTranslation } from '@/i18n/useTranslation';
import { DEFAULT_CHAIN_ID } from '@/lib/constants';
import { levelQuest } from '@/lib/reputation';
import { cn, truncateAddress } from '@/lib/utils';

interface PlayerCardProps {
  /** Checksummed, for showing and copying. */
  address: string;
  walletAddress: `0x${string}`;
  /** Light the quest's cells one by one, the first time the card is shown for this wallet. */
  isEntering: boolean;
  /** Following the profile link leaves the menu. */
  onLeave: () => void;
}

/** Who you are: your address, your level and the way to the next one, and your profile. */
export function PlayerCard({ address, walletAddress, isEntering, onLeave }: PlayerCardProps) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyFeedback('wallet.copyFailed');
  const reputation = useReputation(walletAddress, DEFAULT_CHAIN_ID);
  const isKnown = !reputation.isLoading && !reputation.isError;
  const quest = levelQuest(reputation.honored, reputation.abandoned);

  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 rounded-[20px] bg-canvas p-3.5">
      <Avatar address={address} tone="ink" className="size-12" />
      <div className="grid min-w-0 justify-items-start gap-1">
        <p className="flex max-w-full items-center gap-0.5">
          <span className="text-body/[1.3] font-extrabold tracking-[-0.01em] tabular-nums">{truncateAddress(address)}</span>
          <button
            type="button"
            onClick={() => void copy(address)}
            aria-label={copied ? undefined : t('wallet.copyAddress')}
            className={cn(
              'inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center gap-[5px] rounded-full px-2 text-note font-bold transition-colors',
              copied ? 'bg-good-soft text-good-ink' : 'text-ink-3 hover:bg-paper hover:text-ink'
            )}
          >
            <Icon name={copied ? 'check' : 'copy'} className={cn('size-4', copied && 'animate-pop stroke-[2.6]')} />
            {copied && t('wallet.copied')}
          </button>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {isKnown ? (
            <LevelBadge level={quest.level} className="h-7 pr-[11px] pl-2 text-note" />
          ) : (
            <span aria-hidden="true" className="h-7 w-24 rounded-full bg-canvas-deep" />
          )}
          <Link
            href="/profile"
            onClick={onLeave}
            className="group link inline-flex min-h-8 items-center gap-0.5 text-sm"
          >
            {t('nav.myProfile')}
            <Icon name="chevron-right" className="size-4 transition-[translate] duration-200 ease-press group-hover:translate-x-0.5" />
          </Link>
        </p>
      </div>
      {isKnown && (
        <QuestLine
          quest={quest}
          isEntering={isEntering}
          className="col-span-2 border-t border-dashed border-line-strong pt-2.5"
        />
      )}
    </div>
  );
}
