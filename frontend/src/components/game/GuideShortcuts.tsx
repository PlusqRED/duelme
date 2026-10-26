import { GameTile } from '@/components/identity/GameTile';
import { PILL_FACE } from '@/components/lists/FilterPill';
import { Icon } from '@/components/ui/icon';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { getTranslation } from '@/i18n/serverTranslation';
import { GAME_GUIDES } from '@/content/gameGuides';
import type { GameGuide } from '@/lib/gameGuides';
import { gameInk } from '@/lib/gameTile';
import { cn } from '@/lib/utils';

interface GuideShortcutsProps {
  /** The games to offer, in order: a few of the guides, never all of them. */
  guides: readonly GameGuide[];
  /** The game whose page this is, which the last pill does not count among the rest. */
  except?: string;
  className?: string;
}

/**
 * A row of games with a guide, each a pill led by its tile, and a last one to the whole catalog
 * counting the guides the row leaves out: on the landing and under a game's page, drawn on the
 * server so search engines follow them.
 */
export async function GuideShortcuts({ guides, except, className }: GuideShortcutsProps) {
  const { t } = await getTranslation();
  const rest = GAME_GUIDES.filter((guide) => guide.slug !== except && !guides.includes(guide)).length;

  return (
    // On a phone the list is one strip that scrolls inside the nav; sized by its content, the nav
    // would take the strip's whole length and push whatever holds it past the screen.
    <nav aria-label={t('games.guidesLabel')} className={cn('w-full min-w-0', className)}>
      <ul className="flex flex-wrap gap-2 max-xs:swipe-strip max-xs:flex-nowrap">
        {guides.map((guide) => (
          <li key={guide.slug} className="shrink-0">
            <LocaleLink
              href={`/games/${guide.slug}`}
              style={{ '--tone': gameInk(guide.category) }}
              className={cn(PILL_FACE, 'py-1 pr-3.5 pl-1 hover:border-(--tone)')}
            >
              <GameTile name={guide.name} category={guide.category} className="size-8 rounded-full text-micro" />
              {guide.name}
            </LocaleLink>
          </li>
        ))}
        <li className="shrink-0">
          <LocaleLink href="/games" className={cn(PILL_FACE, 'py-1 pr-3.5 pl-1 hover:border-ink')}>
            {/* Shaped like the games' tiles, so the rest reads as more of them. */}
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full bg-canvas-deep text-micro font-extrabold text-ink tabular-nums"
            >
              {rest > 0 ? `+${rest}` : <Icon name="gamepad" className="size-4" />}
            </span>
            {t('games.allGames')}
          </LocaleLink>
        </li>
      </ul>
    </nav>
  );
}
