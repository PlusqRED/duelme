import type { Metadata } from 'next';
import { GameCatalog } from '@/components/game/GameCatalog';
import { getTranslation } from '@/i18n/serverTranslation';
import { pageMetadata } from '@/lib/pageMetadata';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return pageMetadata({ path: '/games', title: t('seo.games.title'), description: t('seo.games.description') });
}

export default function GamesPage() {
  return <GameCatalog />;
}
