'use client';

import { GameTile } from '@/components/identity/GameTile';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/i18n/useTranslation';
import { getCategoryLabelKey, type Game } from '@/lib/game';

interface DraftHeadProps {
  titleId: string;
  game: Game | null;
  isPublic: boolean;
}

/**
 * The arena's head while the duel is set up: the game's tile once one is picked, popping in as it
 * changes, its name or "New duel", who may join, and the state drawn in outline, a plan.
 */
export function DraftHead({ titleId, game, isPublic }: DraftHeadProps) {
  const { t } = useTranslation();

  return (
    <header className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
      {game ? (
        <GameTile key={game.slug} name={game.name} category={game.category} className="animate-pop" />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-[13px] border-[1.5px] border-dashed border-line-strong bg-paper text-sm font-extrabold text-ink-3"
        >
          ?
        </span>
      )}
      <div className="min-w-0 flex-auto">
        <h1 id={titleId} className="text-[clamp(1.5rem,1.15rem+1.1vw,2rem)] tracking-[-0.03em] [overflow-wrap:anywhere]">
          {game?.name ?? t('create.head.new')}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-body-sm text-ink-3">
          <Chip>
            <Icon name={isPublic ? 'globe' : 'lock'} className="size-3.5" />
            {t(isPublic ? 'duel.public' : 'duel.private')}
          </Chip>
          {game && <Chip>{t(getCategoryLabelKey(game.category))}</Chip>}
          <span>{t('create.head.when')}</span>
        </p>
      </div>
      <p className="inline-flex min-h-[34px] items-center gap-[9px] rounded-full border-[1.5px] border-dashed border-line-strong bg-paper py-1 pr-3.5 pl-3 text-body-sm/[1.2] font-strong text-ink-2">
        <i aria-hidden="true" className="size-[9px] shrink-0 rounded-full border-[1.5px] border-dashed border-ink-3" />
        <span>{t('create.state.draft')}</span>
      </p>
    </header>
  );
}
