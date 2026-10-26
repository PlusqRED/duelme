import { GameTile } from '@/components/identity/GameTile';
import { LocaleLink } from '@/components/ui/LocaleLink';
import { getTranslation } from '@/i18n/serverTranslation';
import { GAME_GUIDES } from '@/lib/gameGuides';
import { gameInk } from '@/lib/gameTile';

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
    <nav aria-label={t('games.guidesLabel')} className={className}>
      <ul className="flex flex-wrap gap-2 max-xs:swipe-strip max-xs:flex-nowrap">
        {GAME_GUIDES.filter((guide) => guide.slug !== except).map((guide) => (
          <li key={guide.slug} className="shrink-0">
            <LocaleLink
              href={`/games/${guide.slug}`}
              style={{ '--tone': gameInk(guide.category) }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-paper py-1 pr-3.5 pl-1 text-body-sm font-label whitespace-nowrap text-ink transition-[border-color,translate] duration-200 ease-press hover:border-(--tone) active:translate-y-px"
            >
              <GameTile name={guide.name} category={guide.category} className="size-8 rounded-full text-[0.6875rem]" />
              {guide.name}
            </LocaleLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
