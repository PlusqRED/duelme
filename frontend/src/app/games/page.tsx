import type { Metadata } from 'next';
import { GameCatalog } from '@/components/game/GameCatalog';
import { GAME_GUIDES } from '@/content/gameGuides';
import { getTranslation } from '@/i18n/serverTranslation';
import { uncataloguedGame } from '@/lib/game';
import { pageMetadata } from '@/lib/pageMetadata';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/games', title: t('seo.games.title'), description: t('seo.games.description') });
}

/** The guides' games only, not their words: the catalog is drawn in the browser too. */
const GUIDE_GAMES = GAME_GUIDES.map(uncataloguedGame);

export default function GamesPage() {
  return <GameCatalog guides={GUIDE_GAMES} />;
}
