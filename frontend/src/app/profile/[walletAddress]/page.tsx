import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlayerProfile } from '@/components/profile/PlayerProfile';
import { getTranslation } from '@/i18n/serverTranslation';
import { profilePath } from '@/lib/navigation';
import { pageMetadata } from '@/lib/pageMetadata';

interface PlayerProfilePageProps {
  params: Promise<{ walletAddress: string }>;
}

export async function generateMetadata({ params }: PlayerProfilePageProps): Promise<Metadata> {
  const { walletAddress } = await params;
  const { t } = await getTranslation();
  return pageMetadata({
    path: profilePath(walletAddress),
    title: t('seo.player.title'),
    description: t('seo.player.description'),
  });
}

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const walletAddress = (await params).walletAddress.toLowerCase();
  // Not an address at all: the page does not exist, rather than a profile nobody set up.
  if (!/^0x[0-9a-f]{40}$/.test(walletAddress)) {
    notFound();
  }
  return <PlayerProfile address={walletAddress as `0x${string}`} />;
}
