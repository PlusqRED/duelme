import type { Metadata } from 'next';
import { CreateDuelRoom } from '@/components/duel/create/CreateDuelRoom';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/lib/structuredData';

export const metadata: Metadata = {
  title: 'Create a 1v1 USDT Duel — On-Chain PvP for Crypto',
  description:
    'Create a 1v1 USDT duel on DuelMe: pick the game, set the wager, share the invite link, and play your opponent for the full pot. 0% platform fee, Arbitrum smart-contract escrow.',
  keywords: [
    'create crypto duel',
    'start a usdt wager',
    'create 1v1 crypto match',
    'создать дуэль',
    'создать дуэль за крипту',
    'дуэль на usdt создать',
    'начать pvp за крипту',
  ],
  alternates: { canonical: '/duel/create' },
};

export default function CreateDuelPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Create Duel', path: '/duel/create' },
        ])}
      />
      <CreateDuelRoom />
    </>
  );
}
