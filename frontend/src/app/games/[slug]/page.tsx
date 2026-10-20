import { GameDetail } from '@/components/game/GameDetail';

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <GameDetail slug={slug} />;
}
