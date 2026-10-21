import { PROFILE_LIMITS, type Profile, type ProfileRequest, type SocialLinks, type SocialPlatform } from '@/lib/profile';

/** The fields of a profile written as one line or a few, each edited on its own. */
export type ProfileTextField = 'nickname' | 'status' | 'aboutMe';

/**
 * What saving one change sends: the backend replaces the whole profile, so every field the player
 * did not touch goes back as it was. A field cleared to blank is sent as null, which removes it.
 */
export function profileRequestWith(profile: Profile | null, change: ProfileRequest): ProfileRequest {
  const request: ProfileRequest = {
    nickname: profile?.nickname ?? null,
    status: profile?.status ?? null,
    aboutMe: profile?.aboutMe ?? null,
    games: profile?.games ?? null,
    ...change,
  };
  for (const field of ['nickname', 'status', 'aboutMe'] as const) {
    if (typeof request[field] === 'string' && request[field].trim() === '') {
      request[field] = null;
    }
  }
  return request;
}

/** Why a typed game cannot join the list, or null when it can. */
export type GameTagProblem = 'empty' | 'tooLong' | 'duplicate' | 'full';

/** Whether `raw` can be added to `games`: not blank, within the length, new to the list, and room for it. */
export function gameTagProblem(games: readonly string[], raw: string): GameTagProblem | null {
  const tag = raw.trim();
  if (tag === '') return 'empty';
  if (tag.length > PROFILE_LIMITS.gameTag) return 'tooLong';
  if (games.some((game) => game.toLowerCase() === tag.toLowerCase())) return 'duplicate';
  if (games.length >= PROFILE_LIMITS.gamesMax) return 'full';
  return null;
}

/** The list with `raw` added at the end when it can be, else the list as it was. */
export function withGameTag(games: readonly string[], raw: string): string[] {
  return gameTagProblem(games, raw) === null ? [...games, raw.trim()] : [...games];
}

/** A linked account as a profile shows it: its name there, where it opens, and how sure we are it is theirs. */
export interface SocialAccount {
  platform: SocialPlatform;
  label: string;
  /** Null when the account has no public page to open: a Telegram account without a username. */
  href: string | null;
  /** Steam and Telegram are proven by signing in to them; an Instagram handle is only what the player typed. */
  isVerified: boolean;
}

/** The accounts a profile has linked, Steam first, then Telegram, then Instagram. */
export function socialAccountsOf(links: SocialLinks | null | undefined): SocialAccount[] {
  const accounts: SocialAccount[] = [];
  if (links?.steam) {
    accounts.push({
      platform: 'steam',
      label: links.steam.username ?? links.steam.steamId,
      href: `https://steamcommunity.com/profiles/${encodeURIComponent(links.steam.steamId)}`,
      isVerified: true,
    });
  }
  if (links?.telegram) {
    const { username, displayName } = links.telegram;
    accounts.push({
      platform: 'telegram',
      label: username ? `@${username}` : displayName,
      href: username ? `https://t.me/${encodeURIComponent(username)}` : null,
      isVerified: true,
    });
  }
  if (links?.instagram) {
    accounts.push({
      platform: 'instagram',
      label: `@${links.instagram.handle}`,
      href: `https://www.instagram.com/${encodeURIComponent(links.instagram.handle)}/`,
      isVerified: false,
    });
  }
  return accounts;
}
