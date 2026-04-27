import { describe, it, expect } from 'vitest';
import { computeTitles, TITLES } from '../profileTitles';
import type { PlayerDuel, PlayerStats } from '@/hooks/usePlayerDuels';
import { DuelState } from '@/lib/contracts';
import type { Profile } from '@/lib/profile';

const ADDR = '0xaaa1234567890123456789012345678901234567';
const OPP1 = '0xbbb1234567890123456789012345678901234567';
const OPP2 = '0xccc1234567890123456789012345678901234567';

function buildDuel(overrides: Partial<PlayerDuel> = {}): PlayerDuel {
  return {
    id: 0,
    creator: ADDR as `0x${string}`,
    opponent: OPP1 as `0x${string}`,
    inviteHash: '0x0' as `0x${string}`,
    message: '',
    wager: 5,
    wagerAmountRaw: 5_000_000n,
    state: DuelState.Resolved,
    claimedWinner: ADDR as `0x${string}`,
    claimedBy: ADDR as `0x${string}`,
    cancelRequestedBy: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    createdAt: 0n,
    fundedAt: 0n,
    cancelRequestedAt: 0n,
    claimTimestamp: 0n,
    finalizedAt: 0n,
    creatorPayout: 0n,
    opponentPayout: 0n,
    creatorClaimed: true,
    opponentClaimed: false,
    chainId: 421614,
    chainName: 'Arbitrum Sepolia',
    ...overrides,
  };
}

function emptyStats(): PlayerStats {
  return {
    wins: 0,
    losses: 0,
    totalWagered: 0,
    totalWithdrawn: 0n,
    activeDuels: [],
    historyDuels: [],
  };
}

const baseCtx = {
  address: ADDR,
  duels: [] as PlayerDuel[],
  stats: emptyStats(),
  profile: null as Profile | null,
};

function ctx(over: Partial<typeof baseCtx>) {
  return { ...baseCtx, ...over };
}

describe('TITLES catalog', () => {
  it('contains 16 titles', () => {
    expect(TITLES).toHaveLength(16);
  });

  it('has unique IDs', () => {
    const ids = new Set(TITLES.map((t) => t.id));
    expect(ids.size).toBe(TITLES.length);
  });
});

describe('first_blood', () => {
  it('earned with 1+ wins', () => {
    const result = computeTitles(ctx({ stats: { ...emptyStats(), wins: 1 } }));
    expect(result.earned.find((t) => t.id === 'first_blood')).toBeDefined();
  });

  it('not earned with 0 wins', () => {
    const result = computeTitles(ctx({}));
    expect(result.earned.find((t) => t.id === 'first_blood')).toBeUndefined();
  });
});

describe('cardinal_sin', () => {
  it('earned with 1+ losses', () => {
    const result = computeTitles(ctx({ stats: { ...emptyStats(), losses: 1 } }));
    expect(result.earned.find((t) => t.id === 'cardinal_sin')).toBeDefined();
  });
});

describe('rookie / veteran / legend', () => {
  it('rookie when totalDuels < 5', () => {
    const duels = [buildDuel(), buildDuel()];
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'rookie')).toBeDefined();
  });

  it('veteran when totalDuels >= 50', () => {
    const duels = Array.from({ length: 50 }, (_, i) => buildDuel({ id: i }));
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'veteran')).toBeDefined();
    expect(result.earned.find((t) => t.id === 'rookie')).toBeUndefined();
  });

  it('legend when totalDuels >= 200', () => {
    const duels = Array.from({ length: 200 }, (_, i) => buildDuel({ id: i }));
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'legend')).toBeDefined();
  });
});

describe('iron_hand', () => {
  it('earned when 100% of wins are claimed and wins >= 3', () => {
    const wins = [
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
    ];
    const stats = { ...emptyStats(), wins: 3 };
    const result = computeTitles(ctx({ duels: wins, stats }));
    expect(result.earned.find((t) => t.id === 'iron_hand')).toBeDefined();
  });

  it('not earned when one win is unclaimed', () => {
    const wins = [
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: false }),
    ];
    const stats = { ...emptyStats(), wins: 2 };
    const result = computeTitles(ctx({ duels: wins, stats }));
    expect(result.earned.find((t) => t.id === 'iron_hand')).toBeUndefined();
  });

  it('not earned with fewer than 3 wins', () => {
    const wins = [
      buildDuel({ creator: ADDR as `0x${string}`, claimedWinner: ADDR as `0x${string}`, creatorClaimed: true }),
    ];
    const stats = { ...emptyStats(), wins: 1 };
    const result = computeTitles(ctx({ duels: wins, stats }));
    expect(result.earned.find((t) => t.id === 'iron_hand')).toBeUndefined();
  });
});

describe('stage_fright', () => {
  it('earned with 5+ Declined as opponent', () => {
    const duels = Array.from({ length: 5 }, (_, i) =>
      buildDuel({ id: i, creator: OPP1 as `0x${string}`, opponent: ADDR as `0x${string}`, state: DuelState.Declined }),
    );
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'stage_fright')).toBeDefined();
  });
});

describe('the_whale', () => {
  it('earned with totalWagered >= 1000', () => {
    const stats = { ...emptyStats(), totalWagered: 1000 };
    const result = computeTitles(ctx({ stats }));
    expect(result.earned.find((t) => t.id === 'the_whale')).toBeDefined();
  });

  it('not earned with totalWagered < 1000', () => {
    const stats = { ...emptyStats(), totalWagered: 999 };
    const result = computeTitles(ctx({ stats }));
    expect(result.earned.find((t) => t.id === 'the_whale')).toBeUndefined();
  });
});

describe('the_penny', () => {
  it('earned with average wager < 1 and >= 5 duels', () => {
    const duels = Array.from({ length: 5 }, (_, i) =>
      buildDuel({ id: i, wager: 0.5 }),
    );
    const stats = { ...emptyStats(), totalWagered: 2.5 };
    const result = computeTitles(ctx({ duels, stats }));
    expect(result.earned.find((t) => t.id === 'the_penny')).toBeDefined();
  });
});

describe('hot_streak / cold_streak', () => {
  it('hot_streak earned with 5+ consecutive wins (newest first)', () => {
    const wins = Array.from({ length: 5 }, (_, i) =>
      buildDuel({ id: i, state: DuelState.Resolved, claimedWinner: ADDR as `0x${string}` }),
    );
    const stats = { ...emptyStats(), wins: 5, historyDuels: wins };
    const result = computeTitles(ctx({ duels: wins, stats }));
    expect(result.earned.find((t) => t.id === 'hot_streak')).toBeDefined();
  });

  it('cold_streak earned with 5+ consecutive losses', () => {
    const losses = Array.from({ length: 5 }, (_, i) =>
      buildDuel({ id: i, state: DuelState.Resolved, claimedWinner: OPP1 as `0x${string}` }),
    );
    const stats = { ...emptyStats(), losses: 5, historyDuels: losses };
    const result = computeTitles(ctx({ duels: losses, stats }));
    expect(result.earned.find((t) => t.id === 'cold_streak')).toBeDefined();
  });
});

describe('friendly_fire', () => {
  it('earned when >=50% of duels are with same opponent and total >= 6', () => {
    const duels = [
      ...Array.from({ length: 4 }, (_, i) => buildDuel({ id: i, opponent: OPP1 as `0x${string}` })),
      ...Array.from({ length: 2 }, (_, i) => buildDuel({ id: 4 + i, opponent: OPP2 as `0x${string}` })),
    ];
    const result = computeTitles(ctx({ duels }));
    expect(result.earned.find((t) => t.id === 'friendly_fire')).toBeDefined();
  });
});

describe('the_mysterious', () => {
  it('earned with no profile', () => {
    const result = computeTitles(ctx({ profile: null }));
    expect(result.earned.find((t) => t.id === 'the_mysterious')).toBeDefined();
  });

  it('earned with empty profile fields and no socials', () => {
    const profile: Profile = {
      walletAddress: ADDR,
      nickname: null,
      battleCry: null,
      aboutMe: null,
      pronouns: null,
      region: null,
      lookingForDuel: false,
      games: null,
      socialLinks: { steam: null, telegram: null, instagram: null },
      createdAt: null,
      updatedAt: null,
    };
    const result = computeTitles(ctx({ profile }));
    expect(result.earned.find((t) => t.id === 'the_mysterious')).toBeDefined();
  });

  it('not earned when nickname set', () => {
    const profile: Profile = {
      walletAddress: ADDR,
      nickname: 'someone',
      battleCry: null,
      aboutMe: null,
      pronouns: null,
      region: null,
      lookingForDuel: false,
      games: null,
      socialLinks: null,
      createdAt: null,
      updatedAt: null,
    };
    const result = computeTitles(ctx({ profile }));
    expect(result.earned.find((t) => t.id === 'the_mysterious')).toBeUndefined();
  });
});

describe('the_influencer', () => {
  it('earned with all 3 socials linked', () => {
    const profile: Profile = {
      walletAddress: ADDR,
      nickname: 'a',
      battleCry: null,
      aboutMe: null,
      pronouns: null,
      region: null,
      lookingForDuel: false,
      games: null,
      socialLinks: {
        steam: { steamId: '1', username: null, avatarUrl: null, linkedAt: '' },
        telegram: { telegramId: '1', username: null, displayName: 'a', photoUrl: null, linkedAt: '' },
        instagram: { handle: 'a', linkedAt: '' },
      },
      createdAt: null,
      updatedAt: null,
    };
    const result = computeTitles(ctx({ profile }));
    expect(result.earned.find((t) => t.id === 'the_influencer')).toBeDefined();
  });
});

describe('top3 selection', () => {
  it('returns up to 3 titles sorted by weight', () => {
    const duels = Array.from({ length: 50 }, (_, i) => buildDuel({ id: i }));
    const stats = { ...emptyStats(), wins: 3, totalWagered: 1500 };
    const result = computeTitles(ctx({
      duels,
      stats,
      profile: {
        walletAddress: ADDR, nickname: 'x', battleCry: null, aboutMe: null,
        pronouns: null, region: null, lookingForDuel: false, games: null,
        socialLinks: null, createdAt: null, updatedAt: null,
      },
    }));
    expect(result.top3.length).toBeLessThanOrEqual(3);
    expect(result.top3[0].id).toBe('veteran');
  });

  it('returns fewer than 3 when not enough earned', () => {
    const result = computeTitles(ctx({}));
    expect(result.top3.length).toBeLessThanOrEqual(3);
  });
});
