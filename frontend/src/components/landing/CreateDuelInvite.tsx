'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/identity/BrandMark';
import { buttonVariants } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

interface CreateDuelInviteProps {
  /**
   * A card beside a single open duel, or the whole row when there is none; a strip under a lobby,
   * whose cards are the point, so its button steps back to paper.
   */
  variant: 'card' | 'strip';
  /** No open duel at all: the card says so first. */
  isEmpty?: boolean;
  /** What the invitation says where a page has its own reason to make a duel, a game it lacks, say. */
  title?: string;
  description?: string;
  className?: string;
}

/** The way to a duel on other terms than the open ones: make your own. */
export function CreateDuelInvite({ variant, isEmpty = false, title, description, className }: CreateDuelInviteProps) {
  const { t } = useTranslation();
  const isStrip = variant === 'strip';

  return (
    <div
      className={cn(
        'rounded-3xl border-2 border-dashed border-line-strong',
        isStrip
          ? 'mt-5 flex flex-wrap items-center gap-x-5 gap-y-3.5 px-[22px] py-[18px]'
          : 'grid content-center justify-items-start gap-3 p-[clamp(18px,2.4vw,26px)]',
        className
      )}
    >
      <BrandMark size="lg" />
      <div className={cn(isStrip ? 'flex-[1_1_260px]' : 'contents')}>
        <h3 className={cn(isStrip ? 'text-lg' : 'text-xl')}>
          {title ?? t(isEmpty ? 'publicDuels.empty' : 'publicDuels.createTitle')}
        </h3>
        <p className={cn('text-ink-2', isStrip ? 'text-body-sm' : 'max-w-[38ch]')}>
          {description ?? t('publicDuels.createDesc')}
        </p>
      </div>
      <Link
        href="/duel/create"
        className={buttonVariants({ variant: isStrip ? 'paper' : 'navy', className: isStrip ? undefined : 'mt-2' })}
      >
        {t('hero.cta')}
      </Link>
    </div>
  );
}
