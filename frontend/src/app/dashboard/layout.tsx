import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — Your USDT Duels',
  description:
    'Your active and completed 1v1 USDT duels on DuelMe: claim winnings, request refunds, and review your full duel history across Arbitrum.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/dashboard' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
