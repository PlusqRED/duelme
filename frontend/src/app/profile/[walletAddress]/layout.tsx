import type { Metadata } from 'next';
import { profilePath } from '@/lib/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ walletAddress: string }>;
}): Promise<Metadata> {
  const { walletAddress } = await params;
  return {
    title: 'Player Profile',
    description:
      'On-chain reputation, linked social accounts, and 1v1 USDT duel history of a DuelMe player.',
    robots: { index: false, follow: true },
    alternates: { canonical: profilePath(walletAddress) },
  };
}

export default function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
