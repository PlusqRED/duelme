import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { GameDetail } from '@/components/game/GameDetail';
import { GameGuideBody } from '@/components/game/GameGuideBody';
import { GuideShortcuts } from '@/components/game/GuideShortcuts';
import { JsonLd } from '@/components/seo/JsonLd';
import { localePath } from '@/i18n/localePath';
import { getTranslation } from '@/i18n/serverTranslation';
import { uncataloguedGame, type Game, type KnownGame } from '@/lib/game';
import { gameGuide, relatedGuides, type GameGuide } from '@/lib/gameGuides';
import { pageMetadata } from '@/lib/pageMetadata';
import { readGame } from '@/lib/serverGame';
import { breadcrumbSchema } from '@/lib/structuredData';

/** How many other games a game's page offers at its foot, its category's first. */
const RELATED_SHOWN = 8;

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

interface PageGame {
  known: KnownGame;
  guide: GameGuide | null;
}

/** The game the page names: the settled one, or the one shown while the browser reads it. */
function namedGame(known: KnownGame): Game | undefined {
  return known.status === 'settled' ? known.game : known.fallback;
}

/**
 * The game the page is about. The catalog lower-cases slugs, so `/games/CS2` moves to `/games/cs2`
 * rather than stand beside it. A slug neither the catalog nor a guide knows is a 404, not a page
 * saying so; one the server could not ask about is read in the browser, a guide's game shown
 * meanwhile, so a page search engines list never waits on the backend.
 */
async function pageGame(slug: string): Promise<PageGame> {
  const catalogSlug = slug.toLowerCase();
  if (slug !== catalogSlug) {
    const { language } = await getTranslation();
    permanentRedirect(localePath(`/games/${encodeURIComponent(catalogSlug)}`, language));
  }
  const guide = gameGuide(slug);
  const read = await readGame(slug);
  if (read.status === 'found') return { known: { status: 'settled', game: read.game }, guide };
  if (read.status === 'missing') {
    if (!guide) notFound();
    return { known: { status: 'settled', game: uncataloguedGame(guide) }, guide };
  }
  return { known: { status: 'unsettled', fallback: guide ? uncataloguedGame(guide) : undefined }, guide };
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { known, guide } = await pageGame(slug);
  const { t, language } = await getTranslation();
  const copy = guide?.copy[language];
  // With no game read, the address names it: the page is about that game, not the catalog.
  const name = namedGame(known)?.name ?? slug;
  return pageMetadata({
    path: `/games/${slug}`,
    title: copy?.title ?? t('seo.game.title', { game: name }),
    description: copy?.description ?? t('seo.game.description', { game: name }),
  });
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const { known, guide } = await pageGame(slug);
  const { t, language } = await getTranslation();
  const named = namedGame(known);

  return (
    <>
      {named && (
        <JsonLd
          data={breadcrumbSchema(
            [
              { name: t('seo.crumb.home'), path: '/' },
              { name: t('nav.games'), path: '/games' },
              { name: named.name, path: `/games/${named.slug}` },
            ],
            language
          )}
        />
      )}
      <GameDetail
        slug={slug}
        knownGame={known}
        lead={guide?.copy[language].lead}
        after={
          <>
            {guide && <GameGuideBody guide={guide} />}
            <GuideShortcuts
              guides={relatedGuides(slug, named?.category, RELATED_SHOWN)}
              except={slug}
              className="mt-[clamp(32px,4vw,48px)]"
            />
          </>
        }
      />
    </>
  );
}
