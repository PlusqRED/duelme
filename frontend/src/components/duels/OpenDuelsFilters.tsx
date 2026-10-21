'use client';

import { FilterPill } from '@/components/lists/FilterPill';
import { SearchField } from '@/components/lists/SearchField';
import { GameTile } from '@/components/identity/GameTile';
import { useTranslation } from '@/i18n/useTranslation';
import { STAKE_BAND_LABELS, STAKE_BANDS, type OpenDuelGame, type StakeBand } from '@/lib/publicDuelsFilters';

interface OpenDuelsFiltersProps {
  query: string;
  onQueryChange: (query: string) => void;
  games: readonly OpenDuelGame[];
  /** The picked game's slug, `NO_GAME`, or null for every game. */
  game: string | null;
  onGame: (game: string | null) => void;
  stake: StakeBand | null;
  onStake: (stake: StakeBand | null) => void;
}

/**
 * What narrows the open duels: a search, the games they are in with how many each has, and the
 * stake to join as a power bar's bands, a cell more for each, in the blue of the seat it fills.
 */
export function OpenDuelsFilters({ query, onQueryChange, games, game, onGame, stake, onStake }: OpenDuelsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 grid gap-3">
      <SearchField value={query} onChange={onQueryChange} placeholder={t('publicDuels.searchPlaceholder')} />
      <div role="group" aria-label={t('publicDuels.gameFilterLabel')} className="flex flex-wrap gap-2 max-xs:swipe-strip max-xs:flex-nowrap">
        <FilterPill isPressed={game === null} onClick={() => onGame(null)}>
          {t('publicDuels.allGames')}
        </FilterPill>
        {games.map((entry) => (
          <FilterPill
            key={entry.slug}
            isPressed={game === entry.slug}
            onClick={() => onGame(game === entry.slug ? null : entry.slug)}
            count={entry.count}
          >
            <GameTile name={entry.name} category={entry.category} className="-ml-2 size-7 rounded-full text-micro" />
            {entry.name ?? t('publicDuels.noGame')}
          </FilterPill>
        ))}
      </div>
      <div role="group" aria-label={t('publicDuels.stakeFilterLabel')} className="flex flex-wrap gap-2 max-xs:swipe-strip max-xs:flex-nowrap">
        <FilterPill isPressed={stake === null} onClick={() => onStake(null)}>
          {t('publicDuels.allWagers')}
        </FilterPill>
        {STAKE_BANDS.map((band, index) => (
          <FilterPill key={band} isPressed={stake === band} onClick={() => onStake(stake === band ? null : band)}>
            <span aria-hidden="true" className="flex items-end gap-[3px]">
              {STAKE_BANDS.map((cell, cellIndex) => (
                <i
                  key={cell}
                  data-lit={cellIndex <= index ? '' : undefined}
                  style={{ '--cell': cellIndex }}
                  className="block h-[calc(8px+var(--cell)*2px)] w-[5px] rounded-[2px] bg-line-strong data-lit:bg-blue group-aria-pressed/pill:bg-paper/25 group-aria-pressed/pill:data-lit:bg-paper"
                />
              ))}
            </span>
            <span className="tabular-nums">{STAKE_BAND_LABELS[band]}</span>
            <span className="sr-only">USDT</span>
          </FilterPill>
        ))}
      </div>
    </div>
  );
}
