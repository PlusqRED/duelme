import type { Metadata } from 'next';
import { GamesClient } from './GamesClient';

export const metadata: Metadata = {
  alternates: { canonical: '/games' },
};

export default function GamesPage() {
  return <GamesClient />;
}
