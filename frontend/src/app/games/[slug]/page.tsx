import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GameDetail } from '@/components/game/GameDetail';
import { GameGuideBody } from '@/components/game/GameGuideBody';
import { GuideShortcuts } from '@/components/game/GuideShortcuts';
import { JsonLd } from '@/components/seo/JsonLd';
import { localePath } from '@/i18n/localePath';
import { getLanguage, getTranslation } from '@/i18n/serverTranslation';
import type { Game } from '@/lib/game';
import { gameGuide, guideGame, type GameGuide } from '@/lib/gameGuides';
import { pageMetadata } from '@/lib/pageMetadata';
import { readGame } from '@/lib/serverGame';
import { breadcrumbSchema } from '@/lib/structuredData';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * The game the page is about, as the page server knows it: the catalog's, or the guide's for a game
 * nobody has duelled in yet; undefined when there is no backend to ask, and the page reads it in
 * the browser. A slug neither the catalog nor a guide knows is a 404, not a page saying so.
 */
async function pageGame(slug: string): Promise<{ game: Game | undefined; guide: GameGuide | null }> {
  const guide = gameGuide(slug);
  const read = await readGame(slug);
  if (read.status === 'found') return { game: read.game, guide };
  if (guide) return { game: guideGame(guide), guide };
  if (read.status === 'missing') notFound();
  return { game: undefined, guide };
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { game, guide } = await pageGame(slug);
  const language = await getLanguage();
  const { t } = await getTranslation();
  const copy = guide?.copy[language];
  return pageMetadata({
    path: `/games/${slug}`,
    title: copy?.title ?? (game ? t('seo.game.title', { game: game.name }) : t('seo.games.title')),
    description: copy?.description ?? (game ? t('seo.game.description', { game: game.name }) : t('seo.games.description')),
    indexed: guide !== null,
  });
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  const { game, guide } = await pageGame(slug);
  const language = await getLanguage();
  const { t } = await getTranslation();
  const copy = guide?.copy[language];

  return (
    <>
      {game && (
        <JsonLd
          data={breadcrumbSchema([
            { name: t('seo.crumb.home'), path: localePath('/', language) },
            { name: t('nav.games'), path: localePath('/games', language) },
            { name: game.name, path: localePath(`/games/${game.slug}`, language) },
          ])}
        />
      )}
      <GameDetail
        slug={slug}
        initialGame={game}
        lead={copy?.lead}
        after={
          <>
            {copy && game && <GameGuideBody gameName={game.name} category={game.category} sections={copy.sections} />}
            <GuideShortcuts except={slug} className="mt-[clamp(32px,4vw,48px)]" />
          </>
        }
      />
    </>
  );
}
