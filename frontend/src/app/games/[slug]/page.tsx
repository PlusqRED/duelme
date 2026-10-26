import type { Metadata } from 'next';
import { GameDetail } from '@/components/game/GameDetail';
import { getTranslation } from '@/i18n/serverTranslation';
import { pageMetadata } from '@/lib/pageMetadata';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getTranslation();
  return pageMetadata({ path: `/games/${slug}`, title: t('seo.game.title'), description: t('seo.game.description') });
}

export default async function GamePage({ params }: GamePageProps) {
  const { slug } = await params;
  return <GameDetail slug={slug} />;
}
