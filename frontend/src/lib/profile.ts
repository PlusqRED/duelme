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
const IDENTICON_SIZE = 5;
const IDENTICON_SOURCE_COLUMNS = 3;
const MIN_IDENTICON_SOURCE_CELLS = 5;
const MIN_AVATAR_IMAGE_SIZE = 8;

export interface WalletIdenticonCell {
  x: number;
  y: number;
}

export interface WalletIdenticon {
  backgroundColor: string;
  foregroundColor: string;
  cells: WalletIdenticonCell[];
}

function cleanAvatarUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function isUsableSteamAvatarUrl(url: string | null | undefined): boolean {
  const trimmed = cleanAvatarUrl(url);
  return !!trimmed && !STEAM_DEFAULT_AVATAR_RE.test(trimmed);
}

export function isUsableAvatarImageSize(width: number, height: number): boolean {
  return Number.isFinite(width)
    && Number.isFinite(height)
    && width >= MIN_AVATAR_IMAGE_SIZE
    && height >= MIN_AVATAR_IMAGE_SIZE;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function nextRandom(seed: number): [number, number] {
  const nextSeed = (seed + 0x6d2b79f5) >>> 0;
  let value = nextSeed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return [nextSeed, ((value ^ (value >>> 14)) >>> 0) / 4294967296];
}

export function getWalletIdenticon(walletAddress: string | null | undefined): WalletIdenticon | null {
  const normalized = walletAddress?.trim().toLowerCase();
  if (!normalized) return null;

  let seed = hashString(normalized);
  const hue = seed % 360;
  const sourceCells: Array<WalletIdenticonCell & { active: boolean; score: number }> = [];

  for (let y = 0; y < IDENTICON_SIZE; y += 1) {
    for (let x = 0; x < IDENTICON_SOURCE_COLUMNS; x += 1) {
      const [nextSeed, score] = nextRandom(seed);
      seed = nextSeed;
      sourceCells.push({ x, y, active: score > 0.5, score });
    }
  }

  const activeSourceCellCount = sourceCells.filter((cell) => cell.active).length;
  const forcedCellKeyCandidates = activeSourceCellCount < MIN_IDENTICON_SOURCE_CELLS
    ? [...sourceCells]
        .sort((a, b) => b.score - a.score)
        .slice(0, MIN_IDENTICON_SOURCE_CELLS)
        .map((cell) => `${cell.x}:${cell.y}`)
    : [];
  const forcedCellKeys = new Set<string>(forcedCellKeyCandidates);

  const cells = sourceCells
    .filter((cell) => cell.active || forcedCellKeys.has(`${cell.x}:${cell.y}`))
    .flatMap((cell) => {
      const mirroredX = IDENTICON_SIZE - 1 - cell.x;
      return mirroredX === cell.x
        ? [{ x: cell.x, y: cell.y }]
        : [{ x: cell.x, y: cell.y }, { x: mirroredX, y: cell.y }];
    })
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));

  return {
    backgroundColor: `hsl(${(hue + 28) % 360}, 48%, 92%)`,
    foregroundColor: `hsl(${hue}, 70%, 42%)`,
    cells,
  };
}

function pushUniqueUrl(urls: string[], url: string | null): void {
  if (url && !urls.includes(url)) {
    urls.push(url);
  }
}

export function getProfileAvatarUrls(profile: Pick<Profile, 'socialLinks'> | null | undefined): string[] {
  const urls: string[] = [];
  const steamAvatar = cleanAvatarUrl(profile?.socialLinks?.steam?.avatarUrl);
  const telegramPhoto = cleanAvatarUrl(profile?.socialLinks?.telegram?.photoUrl);

  if (steamAvatar && isUsableSteamAvatarUrl(steamAvatar)) {
    pushUniqueUrl(urls, steamAvatar);
  }
  pushUniqueUrl(urls, telegramPhoto);

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
