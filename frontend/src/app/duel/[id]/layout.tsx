import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'Join the Duel — 1v1 USDT Wager',
    description:
      'A 1v1 USDT duel is waiting for you. Review the stake, the game, and the creator’s reputation, then accept the challenge — winner takes the full pot on-chain.',
    robots: { index: false, follow: false },
    alternates: { canonical: `/duel/${id}` },
  };
}

export default function DuelDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
