import type { Metadata } from 'next';
import { CreateDuelWizard } from '@/components/duel/wizard/CreateDuelWizard';
import { JsonLd } from '@/components/seo/JsonLd';

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
        type="breadcrumb"
        items={[
          { name: 'Home', url: '/' },
          { name: 'Create Duel', url: '/duel/create' },
        ]}
      />
      <div className="relative min-h-[calc(100vh-3.5rem)] bg-slate-50 bg-dots">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-indigo-50/80 to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 py-8 pb-28 sm:px-6 sm:py-16 sm:pb-16">
          <CreateDuelWizard />
        </div>
      </div>
    </>
  );
}
