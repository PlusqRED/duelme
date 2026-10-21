import { describe, expect, it } from 'vitest';
import { PROFILE_LIMITS, type Profile } from '@/lib/profile';
import { gameTagProblem, profileRequestWith, socialAccountsOf, withGameTag } from '@/lib/profileEdit';

const PROFILE: Profile = {
  walletAddress: '0xaaaa',
  nickname: 'alice',
  status: 'ready',
  aboutMe: 'plays chess',
  games: ['Chess'],
  socialLinks: null,
  createdAt: null,
  updatedAt: null,
};

describe('profileRequestWith', () => {
  it('sends back every field the change leaves alone', () => {
    expect(profileRequestWith(PROFILE, { status: 'busy' })).toEqual({
      nickname: 'alice',
      status: 'busy',
      aboutMe: 'plays chess',
      games: ['Chess'],
    });
  });

  it('removes a field cleared to blank', () => {
    expect(profileRequestWith(PROFILE, { nickname: '   ' }).nickname).toBeNull();
  });

  it('starts a first profile from nothing', () => {
    expect(profileRequestWith(null, { nickname: 'bob' })).toEqual({ nickname: 'bob', status: null, aboutMe: null, games: null });
  });
});

describe('gameTagProblem', () => {
  it('lets a new game in', () => {
    expect(gameTagProblem(['Chess'], ' Dota 2 ')).toBeNull();
  });

  it('turns a blank game away', () => {
    expect(gameTagProblem([], '  ')).toBe('empty');
  });

  it('turns away a game longer than a tag may be', () => {
    expect(gameTagProblem([], 'x'.repeat(PROFILE_LIMITS.gameTag + 1))).toBe('tooLong');
  });

  it('turns away a game already listed, whatever its case', () => {
    expect(gameTagProblem(['Chess'], 'chess')).toBe('duplicate');
  });

  it('turns a game away once the list is full', () => {
    const full = Array.from({ length: PROFILE_LIMITS.gamesMax }, (_, index) => `Game ${index}`);

    expect(gameTagProblem(full, 'One more')).toBe('full');
  });
});

describe('withGameTag', () => {
  it('adds the game trimmed at the end', () => {
    expect(withGameTag(['Chess'], ' CS 2 ')).toEqual(['Chess', 'CS 2']);
  });

  it('leaves the list as it was for a game it turns away', () => {
    expect(withGameTag(['Chess'], 'chess')).toEqual(['Chess']);
  });
});

describe('socialAccountsOf', () => {
  it('lists the linked accounts Steam first, each with its page and proof', () => {
    const accounts = socialAccountsOf({
      steam: { steamId: '7656', username: 'alice', avatarUrl: null, linkedAt: '' },
      telegram: null,
      instagram: { handle: 'alice.gg', linkedAt: '' },
    });

    expect(accounts).toEqual([
      { platform: 'steam', label: 'alice', href: 'https://steamcommunity.com/profiles/7656', isVerified: true },
      { platform: 'instagram', label: '@alice.gg', href: 'https://www.instagram.com/alice.gg/', isVerified: false },
    ]);
  });

  it('names a Telegram account without a username by its display name, with no page to open', () => {
    const [telegram] = socialAccountsOf({
      steam: null,
      telegram: { telegramId: '1', username: null, displayName: 'Alice', photoUrl: null, linkedAt: '' },
      instagram: null,
    });

    expect([telegram.label, telegram.href]).toEqual(['Alice', null]);
  });

  it('names a Steam account without a username by its id', () => {
    const [steam] = socialAccountsOf({ steam: { steamId: '7656', username: null, avatarUrl: null, linkedAt: '' }, telegram: null, instagram: null });

    expect(steam.label).toBe('7656');
  });

  it('has nothing to list without links', () => {
    expect(socialAccountsOf(null)).toEqual([]);
  });
});
