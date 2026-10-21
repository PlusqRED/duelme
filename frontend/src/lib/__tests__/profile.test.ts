import { describe, it, expect } from 'vitest';
import {
  getProfileAvatarUrls,
  isUsableAvatarImageSize,
  isUsableSteamAvatarUrl,
  isValidInstagramHandle,
  stripInstagramAt,
} from '../profile';

describe('stripInstagramAt', () => {
  it('strips a leading @', () => {
    expect(stripInstagramAt('@alice')).toBe('alice');
  });

  it('returns the input unchanged when no @', () => {
    expect(stripInstagramAt('alice')).toBe('alice');
  });

  it('trims surrounding whitespace', () => {
    expect(stripInstagramAt(' @alice ')).toBe('alice');
  });

  it('only strips one leading @', () => {
    expect(stripInstagramAt('@@alice')).toBe('@alice');
  });
});

describe('isValidInstagramHandle', () => {
  it.each([
    'user',
    'user.name',
    'user_123',
    'a',
    'a.b_c',
    '1',
    '1user',
    'user.name.with.dots',
    'abcdefghij1234567890abcdefghij', // 30 chars
    '@valid',
    '@user.name',
    ' @valid ',
  ])('accepts valid handle %s', (handle) => {
    expect(isValidInstagramHandle(handle)).toBe(true);
  });

  it.each([
    '.leading',
    'trailing.',
    'consec..utive',
    'a..b',
    'abcdefghij1234567890abcdefghij1', // 31 chars
    'hello world',
    'user-name',
    'user@name',
    'спасибо',
    '',
  ])('rejects invalid handle %s', (handle) => {
    expect(isValidInstagramHandle(handle)).toBe(false);
  });

  it('rejects empty string and null-ish', () => {
    expect(isValidInstagramHandle('')).toBe(false);
    // @ts-expect-error -- runtime safety: non-string input
    expect(isValidInstagramHandle(null)).toBe(false);
    // @ts-expect-error -- runtime safety: non-string input
    expect(isValidInstagramHandle(undefined)).toBe(false);
  });
});

describe('getProfileAvatarUrls', () => {
  it('prefers a custom Steam avatar over Telegram photo', () => {
    expect(
      getProfileAvatarUrls({
        socialLinks: {
          steam: {
            steamId: '76561197960287930',
            username: 'alice',
            avatarUrl: 'https://avatars.steamstatic.com/custom_full.jpg',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          telegram: {
            telegramId: 'tg-1',
            username: 'alice',
            displayName: 'Alice',
            photoUrl: 'https://t.me/i/userpic/320/alice.jpg',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          instagram: null,
        },
      })[0],
    ).toBe('https://avatars.steamstatic.com/custom_full.jpg');
  });

  it('falls back to Telegram when Steam has the default empty avatar', () => {
    expect(
      getProfileAvatarUrls({
        socialLinks: {
          steam: {
            steamId: '76561197960287930',
            username: 'alice',
            avatarUrl: 'https://avatars.steamstatic.com/0000000000000000000000000000000000000000_full.jpg',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          telegram: {
            telegramId: 'tg-1',
            username: 'alice',
            displayName: 'Alice',
            photoUrl: 'https://t.me/i/userpic/320/alice.jpg',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          instagram: null,
        },
      })[0],
    ).toBe('https://t.me/i/userpic/320/alice.jpg');
  });

  it('returns no URL when no social avatar is usable', () => {
    expect(getProfileAvatarUrls({ socialLinks: null })).toEqual([]);
  });

  it('returns candidate URLs in fallback order', () => {
    expect(
      getProfileAvatarUrls({
        socialLinks: {
          steam: {
            steamId: '76561197960287930',
            username: 'alice',
            avatarUrl: 'https://avatars.steamstatic.com/custom_full.jpg',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          telegram: {
            telegramId: 'tg-1',
            username: 'alice',
            displayName: 'Alice',
            photoUrl: 'https://t.me/i/userpic/320/alice.jpg',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          instagram: null,
        },
      }),
    ).toEqual([
      'https://avatars.steamstatic.com/custom_full.jpg',
      'https://t.me/i/userpic/320/alice.jpg',
    ]);
  });

  it('ignores non-http avatar URLs', () => {
    expect(
      getProfileAvatarUrls({
        socialLinks: {
          steam: {
            steamId: '76561197960287930',
            username: 'alice',
            avatarUrl: 'javascript:alert(1)',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          telegram: {
            telegramId: 'tg-1',
            username: null,
            displayName: 'Alice',
            photoUrl: 'data:image/png;base64,abc',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          instagram: null,
        },
      }),
    ).toEqual([]);
  });

  it('ignores http avatar URLs to avoid mixed-content profile images', () => {
    expect(
      getProfileAvatarUrls({
        socialLinks: {
          steam: {
            steamId: '76561197960287930',
            username: 'alice',
            avatarUrl: 'http://avatars.steamstatic.com/custom_full.jpg',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          telegram: {
            telegramId: 'tg-1',
            username: null,
            displayName: 'Alice',
            photoUrl: 'http://t.me/i/userpic/320/alice.jpg',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          instagram: null,
        },
      }),
    ).toEqual([]);
  });

  it('does not synthesize a Telegram avatar URL from username when photoUrl is missing', () => {
    expect(
      getProfileAvatarUrls({
        socialLinks: {
          steam: null,
          telegram: {
            telegramId: 'tg-1',
            username: 'alice_tg',
            displayName: 'Alice',
            photoUrl: null,
            linkedAt: '2026-01-01T00:00:00Z',
          },
          instagram: null,
        },
      }),
    ).toEqual([]);
  });

  it('ignores invalid Telegram username when photoUrl is missing', () => {
    expect(
      getProfileAvatarUrls({
        socialLinks: {
          steam: null,
          telegram: {
            telegramId: 'tg-1',
            username: 'bad/name',
            displayName: 'Alice',
            photoUrl: null,
            linkedAt: '2026-01-01T00:00:00Z',
          },
          instagram: null,
        },
      }),
    ).toEqual([]);
  });

  it('uses Telegram photoUrl without adding a t.me username fallback', () => {
    expect(
      getProfileAvatarUrls({
        socialLinks: {
          steam: null,
          telegram: {
            telegramId: 'tg-1',
            username: 'alice_tg',
            displayName: 'Alice',
            photoUrl: 'https://cdn.telegram.org/alice.jpg',
            linkedAt: '2026-01-01T00:00:00Z',
          },
          instagram: null,
        },
      }),
    ).toEqual(['https://cdn.telegram.org/alice.jpg']);
  });
});

describe('isUsableSteamAvatarUrl', () => {
  it('rejects blank and default Steam avatars', () => {
    expect(isUsableSteamAvatarUrl('')).toBe(false);
    expect(isUsableSteamAvatarUrl('https://avatars.steamstatic.com/0000000000000000000000000000000000000000.jpg')).toBe(false);
    expect(isUsableSteamAvatarUrl('https://avatars.steamstatic.com/0000000000000000000000000000000000000000_medium.jpg')).toBe(false);
    expect(isUsableSteamAvatarUrl('https://avatars.steamstatic.com/0000000000000000000000000000000000000000_full.jpg')).toBe(false);
  });
});

describe('isUsableAvatarImageSize', () => {
  it('rejects Telegram placeholder-sized images', () => {
    expect(isUsableAvatarImageSize(1, 1)).toBe(false);
    expect(isUsableAvatarImageSize(7, 320)).toBe(false);
    expect(isUsableAvatarImageSize(320, 7)).toBe(false);
  });

  it('accepts real avatar-sized images', () => {
    expect(isUsableAvatarImageSize(8, 8)).toBe(true);
    expect(isUsableAvatarImageSize(320, 320)).toBe(true);
  });
});
