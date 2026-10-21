import { notFound } from 'next/navigation';
import { PlayerProfile } from '@/components/profile/PlayerProfile';

export default async function PlayerProfilePage({ params }: { params: Promise<{ walletAddress: string }> }) {
  const walletAddress = (await params).walletAddress.toLowerCase();
  // Not an address at all: the page does not exist, rather than a profile nobody set up.
  if (!/^0x[0-9a-f]{40}$/.test(walletAddress)) {
    notFound();
  }
  return <PlayerProfile address={walletAddress as `0x${string}`} />;
}
