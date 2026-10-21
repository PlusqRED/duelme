import type { Metadata } from 'next';
import { GameCatalog } from '@/components/game/GameCatalog';

export const metadata: Metadata = {
  alternates: { canonical: '/games' },
};

export default function GamesPage() {
  return <GameCatalog />;
}
