import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: 'Play 1v1 for USDT — Game Detail',
    description:
      'See open and recent 1v1 USDT duels for this game on DuelMe. Find an opponent, set your wager, and play for crypto on Arbitrum with 0% platform fee.',
    alternates: { canonical: `/games/${slug}` },
  };
}

export default function GameDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
