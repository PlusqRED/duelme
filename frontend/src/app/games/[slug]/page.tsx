import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { GameDetail } from '@/components/game/GameDetail';
import { GameGuideBody } from '@/components/game/GameGuideBody';
import { GuideShortcuts } from '@/components/game/GuideShortcuts';
import { JsonLd } from '@/components/seo/JsonLd';
import { localePath } from '@/i18n/localePath';
import { getTranslation } from '@/i18n/serverTranslation';
import { uncataloguedGame, type Game } from '@/lib/game';
import { gameGuide, type GameGuide } from '@/lib/gameGuides';
import { pageMetadata } from '@/lib/pageMetadata';
import { readGame } from '@/lib/serverGame';
import { breadcrumbSchema } from '@/lib/structuredData';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

interface PageGame {
  /** The game as the page server settled it: the catalog's, or a guide's the catalog does not have. */
  game?: Game;
  /** A guide's game, shown while the browser reads the catalog the server could not. */
  fallbackGame?: Game;
  guide: GameGuide | null;
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
  if (read.status === 'found') return { game: read.game, guide };
  if (read.status === 'missing') {
    if (!guide) notFound();
    return { game: uncataloguedGame(guide), guide };
  }
  return { fallbackGame: guide ? uncataloguedGame(guide) : undefined, guide };
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { game, fallbackGame, guide } = await pageGame(slug);
  const { t, language } = await getTranslation();
  const copy = guide?.copy[language];
  const named = game ?? fallbackGame;
  return pageMetadata({
    path: `/games/${slug}`,
    title: copy?.title ?? (named ? t('seo.game.title', { game: named.name }) : t('seo.games.title')),
    description: copy?.description ?? (named ? t('seo.game.description', { game: named.name }) : t('seo.games.description')),
  });
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const { game, fallbackGame, guide } = await pageGame(slug);
  const { t, language } = await getTranslation();
  const named = game ?? fallbackGame;

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
        initialGame={game}
        fallbackGame={fallbackGame}
        lead={guide?.copy[language].lead}
        after={
          <>
            {guide && <GameGuideBody guide={guide} />}
            <GuideShortcuts except={slug} className="mt-[clamp(32px,4vw,48px)]" />
          </>
        }
      />
    </>
  );
}
