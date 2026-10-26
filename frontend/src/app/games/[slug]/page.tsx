import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GameDetail } from '@/components/game/GameDetail';
import { GameGuideBody } from '@/components/game/GameGuideBody';
import { GuideShortcuts } from '@/components/game/GuideShortcuts';
import { JsonLd } from '@/components/seo/JsonLd';
import { getTranslation } from '@/i18n/serverTranslation';
import { uncataloguedGame, type Game } from '@/lib/game';
import { gameGuide, type GameGuide } from '@/lib/gameGuides';
import { pageMetadata } from '@/lib/pageMetadata';
import { readGame } from '@/lib/serverGame';
import { breadcrumbSchema } from '@/lib/structuredData';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * A game with a guide is drawn whatever the backend says: the catalog's game when it can be read,
 * otherwise the guide's, so a page search engines list never fails with the backend. A failed read
 * is still logged. Without a guide the catalog decides: a slug it does not know is a 404, a backend
 * that fails is an error, and with no backend to ask the page reads the game in the browser.
 */
async function readGuided(slug: string, guide: GameGuide): Promise<Game> {
  try {
    const read = await readGame(slug);
    return read.status === 'found' ? read.game : uncataloguedGame(guide);
  } catch (error) {
    console.error(`[game page] ${slug}: the catalog could not be read, drawing the game from its guide`, error);
    return uncataloguedGame(guide);
  }
}

async function pageGame(slug: string): Promise<{ game: Game | undefined; guide: GameGuide | null }> {
  const guide = gameGuide(slug);
  if (guide) return { game: await readGuided(slug, guide), guide };
  const read = await readGame(slug);
  if (read.status === 'missing') notFound();
  return { game: read.status === 'found' ? read.game : undefined, guide };
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { game, guide } = await pageGame(slug);
  const { t, language } = await getTranslation();
  const copy = guide?.copy[language];
  return pageMetadata({
    path: `/games/${slug}`,
    title: copy?.title ?? (game ? t('seo.game.title', { game: game.name }) : t('seo.games.title')),
    description: copy?.description ?? (game ? t('seo.game.description', { game: game.name }) : t('seo.games.description')),
  });
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const { game, guide } = await pageGame(slug);
  const { t, language } = await getTranslation();

  return (
    <>
      {game && (
        <JsonLd
          data={breadcrumbSchema(
            [
              { name: t('seo.crumb.home'), path: '/' },
              { name: t('nav.games'), path: '/games' },
              { name: game.name, path: `/games/${game.slug}` },
            ],
            language
          )}
        />
      )}
      <GameDetail
        slug={slug}
        initialGame={game}
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
