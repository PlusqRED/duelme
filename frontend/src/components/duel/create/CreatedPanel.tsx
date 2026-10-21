'use client';

import Link from 'next/link';
import { useId, type RefObject } from 'react';
import { InviteLinkBox } from '@/components/duel/room/InviteLinkBox';
import { TurnPanel } from '@/components/duel/room/TurnPanel';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';

interface CreatedPanelProps {
  pointAt: RefObject<HTMLElement | null>;
  /** The new duel's page, a private duel's key in its fragment. */
  path: string;
  wager: string;
  isPublic: boolean;
  onAgain: () => void;
}

/**
 * The duel page's own panel for a creator whose duel waits, so the page it links to looks the same:
 * the link to send, and the way to the duel or to another one. The move is the opponent's now.
 */
export function CreatedPanel({ pointAt, path, wager, isPublic, onAgain }: CreatedPanelProps) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <TurnPanel
      tone="creator"
      pointAt={pointAt}
      whose={{ tone: 'opponent', label: t('room.whose.them') }}
      titleId={titleId}
      title={t('room.created.creator.title')}
      text={t('room.created.creator.text', { wager })}
      className="animate-swap"
    >
      <InviteLinkBox link={`${window.location.origin}${path}`} isPublic={isPublic} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-xs:*:flex-[1_1_100%]">
        <Link href={path} data-action className={buttonVariants({ size: 'lg' })}>
          {t('create.goToDuel')}
        </Link>
        <Button type="button" variant="paper" size="lg" data-action onClick={onAgain}>
          <Icon name="plus" />
          {t('create.again')}
        </Button>
      </div>
    </TurnPanel>
  );
}
