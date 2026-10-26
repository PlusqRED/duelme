import { GameTile } from '@/components/identity/GameTile';
import { PILL_FACE } from '@/components/lists/FilterPill';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { getTranslation } from '@/i18n/serverTranslation';
import { GAME_GUIDES } from '@/content/gameGuides';
import { gameInk } from '@/lib/gameTile';
import { cn } from '@/lib/utils';

interface GuideShortcutsProps {
  /** The game whose page this is, left out of its own list. */
  except?: string;
  className?: string;
}

/**
 * The games with a guide, as a row of pills each led by its tile, on top of the catalog and under a
 * game's page: the way to a game's page before anyone has duelled in it, drawn on the server so
 * search engines follow them.
 */
export async function GuideShortcuts({ except, className }: GuideShortcutsProps) {
  const { t } = await getTranslation();

  return (
    // On a phone the list is one strip that scrolls inside the nav; sized by its content, the nav
    // would take the strip's whole length and push whatever holds it past the screen.
    <nav aria-label={t('games.guidesLabel')} className={cn('w-full min-w-0', className)}>
      <ul className="flex flex-wrap gap-2 max-xs:swipe-strip max-xs:flex-nowrap">
        {GAME_GUIDES.filter((guide) => guide.slug !== except).map((guide) => (
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
      </ul>
    </nav>
  );
}
