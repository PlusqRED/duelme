import { DuelState } from '@/lib/contracts';
import type { PlayerDuel, PlayerStats } from '@/hooks/usePlayerDuels';
import type { Profile } from '@/lib/profile';

export interface TitleContext {
  address: string;
  duels: PlayerDuel[];
  stats: PlayerStats;
  profile: Profile | null;
}

export type TitleCategory = 'milestone' | 'behavior' | 'volume' | 'streak' | 'vanity';

export interface Title {
  id: string;
  weight: number;
  category: TitleCategory;
  isNegative?: boolean;
  earnedBy: (ctx: TitleContext) => boolean;
  progressOf?: (ctx: TitleContext) => { current: number; target: number } | null;
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

function isPlayerWinnerOf(d: PlayerDuel, address: string): boolean {
  return d.state === DuelState.Resolved && d.claimedWinner.toLowerCase() === address.toLowerCase();
}

function totalDuels(ctx: TitleContext): number {
  return ctx.duels.length;
}

function isAddressInDuel(d: PlayerDuel, address: string): { isCreator: boolean; isOpponent: boolean } {
  const a = address.toLowerCase();
  return {
    isCreator: d.creator.toLowerCase() === a,
    isOpponent: d.opponent.toLowerCase() === a,
  };
}

function avgWager(ctx: TitleContext): number {
  if (ctx.duels.length === 0) return 0;
  return ctx.stats.totalWagered / ctx.duels.length;
}

function currentStreak(ctx: TitleContext, type: 'win' | 'loss'): number {
  let count = 0;
  for (const d of ctx.stats.historyDuels) {
    if (d.state !== DuelState.Resolved) break;
    const won = d.claimedWinner.toLowerCase() === ctx.address.toLowerCase();
    if (type === 'win' && won) count++;
    else if (type === 'loss' && !won) count++;
    else break;
  }
  return count;
}

function topOpponentShare(ctx: TitleContext): { count: number; total: number } {
  const counts = new Map<string, number>();
  for (const d of ctx.duels) {
    const { isCreator } = isAddressInDuel(d, ctx.address);
    const opp = (isCreator ? d.opponent : d.creator).toLowerCase();
    if (opp === ZERO_ADDR) continue;
    counts.set(opp, (counts.get(opp) ?? 0) + 1);
  }
  let max = 0;
  for (const v of counts.values()) if (v > max) max = v;
  return { count: max, total: ctx.duels.length };
}

function declinedAsOpponent(ctx: TitleContext): number {
  return ctx.duels.filter((d) => {
    const { isOpponent } = isAddressInDuel(d, ctx.address);
    return isOpponent && d.state === DuelState.Declined;
  }).length;
}

function abandonedAsLoser(ctx: TitleContext): number {
  return ctx.stats.historyDuels.filter((d) => {
    const won = d.claimedWinner.toLowerCase() === ctx.address.toLowerCase();
    return d.state === DuelState.WinnerClaimed && !won;
  }).length;
}

function acceptRateAsOpponent(ctx: TitleContext): { accepted: number; total: number } {
  let accepted = 0;
  let total = 0;
  for (const d of ctx.duels) {
    const { isOpponent } = isAddressInDuel(d, ctx.address);
    if (!isOpponent) continue;
    total++;
    if (
      d.state !== DuelState.Created &&
      d.state !== DuelState.Cancelled &&
      d.state !== DuelState.Declined
    ) {
      accepted++;
    }
  }
  return { accepted, total };
}

function isClaimedByPlayer(d: PlayerDuel, address: string): boolean {
  const { isCreator, isOpponent } = isAddressInDuel(d, address);
  if (isCreator) return d.creatorClaimed;
  if (isOpponent) return d.opponentClaimed;
  return false;
}

function ironHandRatio(ctx: TitleContext): { claimed: number; total: number } {
  let total = 0;
  let claimed = 0;
  for (const d of ctx.duels) {
    if (!isPlayerWinnerOf(d, ctx.address)) continue;
    total++;
    if (isClaimedByPlayer(d, ctx.address)) claimed++;
  }
  return { claimed, total };
}

export const TITLES: Title[] = [
  {
    id: 'first_blood',
    weight: 90,
    category: 'milestone',
    earnedBy: (c) => c.stats.wins >= 1,
  },
  {
    id: 'cardinal_sin',
    weight: 50,
    category: 'milestone',
    isNegative: true,
    earnedBy: (c) => c.stats.losses >= 1,
  },
  {
    id: 'rookie',
    weight: 30,
    category: 'milestone',
    earnedBy: (c) => totalDuels(c) > 0 && totalDuels(c) < 5,
  },
  {
    id: 'veteran',
    weight: 95,
    category: 'milestone',
    earnedBy: (c) => totalDuels(c) >= 50,
    progressOf: (c) => ({ current: totalDuels(c), target: 50 }),
  },
  {
    id: 'legend',
    weight: 100,
    category: 'milestone',
    earnedBy: (c) => totalDuels(c) >= 200,
    progressOf: (c) => ({ current: totalDuels(c), target: 200 }),
  },
  {
    id: 'iron_hand',
    weight: 85,
    category: 'behavior',
    earnedBy: (c) => {
      const { claimed, total } = ironHandRatio(c);
      return total >= 3 && claimed === total;
    },
    progressOf: (c) => {
      const { claimed, total } = ironHandRatio(c);
      return { current: claimed, target: Math.max(total, 3) };
    },
  },
  {
    id: 'the_brave',
    weight: 70,
    category: 'behavior',
    earnedBy: (c) => {
      const { accepted, total } = acceptRateAsOpponent(c);
      return total >= 5 && accepted / total >= 0.8;
    },
  },
  {
    id: 'stage_fright',
    weight: 40,
    category: 'behavior',
    isNegative: true,
    earnedBy: (c) => declinedAsOpponent(c) >= 5,
  },
  {
    id: 'the_coward',
    weight: 35,
    category: 'behavior',
    isNegative: true,
    earnedBy: (c) => abandonedAsLoser(c) >= 5,
  },
  {
    id: 'friendly_fire',
    weight: 60,
    category: 'behavior',
    earnedBy: (c) => {
      const { count, total } = topOpponentShare(c);
      return total >= 6 && count / total >= 0.5;
    },
  },
  {
    id: 'the_whale',
    weight: 90,
    category: 'volume',
    earnedBy: (c) => c.stats.totalWagered >= 1000,
    progressOf: (c) => ({ current: Math.floor(c.stats.totalWagered), target: 1000 }),
  },
  {
    id: 'the_penny',
    weight: 50,
    category: 'volume',
    earnedBy: (c) => totalDuels(c) >= 5 && avgWager(c) < 1,
  },
  {
    id: 'hot_streak',
    weight: 80,
    category: 'streak',
    earnedBy: (c) => currentStreak(c, 'win') >= 5,
    progressOf: (c) => ({ current: currentStreak(c, 'win'), target: 5 }),
  },
  {
    id: 'cold_streak',
    weight: 75,
    category: 'streak',
    isNegative: true,
    earnedBy: (c) => currentStreak(c, 'loss') >= 5,
  },
  {
    id: 'the_mysterious',
    weight: 45,
    category: 'vanity',
    earnedBy: (c) => {
      if (!c.profile) return true;
      const noNick = !c.profile.nickname;
      const noAbout = !c.profile.aboutMe;
      const sl = c.profile.socialLinks;
      const noSocials = !sl || (!sl.steam && !sl.telegram && !sl.instagram);
      return noNick && noAbout && noSocials;
    },
  },
  {
    id: 'the_influencer',
    weight: 55,
    category: 'vanity',
    earnedBy: (c) => {
      const sl = c.profile?.socialLinks;
      return !!(sl?.steam && sl?.telegram && sl?.instagram);
    },
  },
];

export function computeTitles(ctx: TitleContext): {
  earned: Title[];
  unearned: Title[];
  top3: Title[];
} {
  const earned: Title[] = [];
  const unearned: Title[] = [];
  for (const title of TITLES) {
    if (title.earnedBy(ctx)) earned.push(title);
    else unearned.push(title);
  }
  const sorted = [...earned].sort((a, b) => b.weight - a.weight);
  const top3 = sorted.slice(0, 3);
  return { earned, unearned, top3 };
}
