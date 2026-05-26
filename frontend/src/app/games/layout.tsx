import type { Metadata } from 'next';

// Note: `alternates.canonical` is intentionally not set here. This layout wraps
// both the `/games` list and `/games/[slug]` detail routes; setting a canonical
// would cascade into [slug] and point every detail page back to `/games`. Each
// route sets its own canonical.
export const metadata: Metadata = {
  // template re-declared so /games/[slug]'s string title still gets the
  // " | DuelMe" suffix (Next.js does not propagate template through a
  // segment that itself sets a string title).
  title: {
    default: 'Games — Pick a 1v1 to Wager USDT on',
    template: '%s | DuelMe',
  },
  description:
    'Browse every game available for 1v1 USDT duels on DuelMe: CS2, Dota 2, FIFA, Fortnite, Valorant, chess, Apex Legends, Rocket League and more. Play any of them for crypto on-chain.',
  keywords: [
    'crypto duel games',
    'usdt wager games',
    'pvp games for crypto',
    'игры за крипту',
    'игры на usdt',
    'пвп игры за деньги',
  ],
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
