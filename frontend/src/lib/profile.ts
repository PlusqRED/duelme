export interface SteamLink {
  steamId: string;
  username: string | null;
  avatarUrl: string | null;
  linkedAt: string;
}

export interface TelegramLink {
  telegramId: string;
  username: string | null;
  displayName: string;
  photoUrl: string | null;
  linkedAt: string;
}

export interface InstagramLink {
  handle: string;
  linkedAt: string;
}

export interface SocialLinks {
  steam: SteamLink | null;
  telegram: TelegramLink | null;
  instagram: InstagramLink | null;
}

export type SocialPlatform = 'steam' | 'telegram' | 'instagram';

export interface Profile {
  walletAddress: string;
  nickname: string | null;
  status: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  aboutMe: string | null;
  games: string[] | null;
  socialLinks: SocialLinks | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const STEAM_DEFAULT_AVATAR_RE = /\/0{40}(?:_(?:full|medium))?\.jpg(?:[?#].*)?$/i;

function cleanAvatarUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function isUsableSteamAvatarUrl(url: string | null | undefined): boolean {
  const trimmed = cleanAvatarUrl(url);
  return !!trimmed && !STEAM_DEFAULT_AVATAR_RE.test(trimmed);
}

export function getProfileAvatarUrls(profile: Pick<Profile, 'socialLinks'> | null | undefined): string[] {
  const urls: string[] = [];
  const steamAvatar = cleanAvatarUrl(profile?.socialLinks?.steam?.avatarUrl);
  const telegramPhoto = cleanAvatarUrl(profile?.socialLinks?.telegram?.photoUrl);

  if (steamAvatar && isUsableSteamAvatarUrl(steamAvatar)) {
    urls.push(steamAvatar);
  }
  if (telegramPhoto && telegramPhoto !== steamAvatar) {
    urls.push(telegramPhoto);
  }

  return urls;
}

export function getProfileAvatarUrl(profile: Pick<Profile, 'socialLinks'> | null | undefined): string | null {
  return getProfileAvatarUrls(profile)[0] ?? null;
}

export interface ProfileRequest {
  nickname?: string | null;
  status?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  aboutMe?: string | null;
  games?: string[] | null;
}

export const PROFILE_LIMITS = {
  nickname: 30,
  status: 140,
  firstName: 50,
  lastName: 50,
  gender: 20,
  aboutMe: 500,
  gameTag: 30,
  gamesMax: 20,
  instagramHandle: 30,
} as const;

/**
 * Instagram handle rules, mirrored from the backend validator:
 *   1-30 chars, alphanumerics + period + underscore;
 *   cannot start or end with a period; no consecutive periods.
 */
export const INSTAGRAM_HANDLE_RE = /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9._]{1,30}$/;

export function stripInstagramAt(raw: string): string {
  const value = raw.trim();
  return value.startsWith('@') ? value.slice(1) : value;
}

export function isValidInstagramHandle(raw: string): boolean {
  if (!raw) return false;
  return INSTAGRAM_HANDLE_RE.test(stripInstagramAt(raw));
}
