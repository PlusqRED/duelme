import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Public USDT Duels — Open 1v1 Challenges',
  description:
    'Browse open USDT duels waiting for a challenger. Check the creator’s reputation, the game, and the wager before joining — full pot goes to the winner, 0% fee, on-chain on Arbitrum.',
  keywords: [
    'public crypto duels',
    'open usdt wagers',
    'find 1v1 crypto opponent',
    'публичные дуэли usdt',
    'открытые вызовы за крипту',
    'найти соперника pvp за крипту',
  ],
  alternates: { canonical: '/duels/public' },
};

export default function PublicDuelsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
