import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recent Duels — Live Activity',
  description:
    'Live feed of recent 1v1 USDT duels on DuelMe: see who is playing what, who won, the pot size, and the on-chain proof. Sort by wager, status, or recency.',
  keywords: [
    'recent crypto duels',
    'live usdt pvp',
    'on-chain duel feed',
    'недавние дуэли',
    'лента pvp за крипту',
    'история дуэлей usdt',
  ],
  alternates: { canonical: '/duels/recent' },
};

export default function RecentDuelsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
