import type { Metadata } from 'next';

// `alternates.canonical` intentionally omitted — would cascade into
// `/profile/[walletAddress]`. The own-profile page is private (noindex), so
// canonical isn't crawl-relevant either way.
export const metadata: Metadata = {
  // template re-declared so /profile/[walletAddress] still gets the suffix
  // (Next.js does not propagate template through a segment that sets a
  // string title).
  title: {
    default: 'Your Profile',
    template: '%s | DuelMe',
  },
  description:
    'Your DuelMe profile: nickname, on-chain reputation, linked social accounts (Steam, Telegram), and 1v1 USDT duel history.',
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
