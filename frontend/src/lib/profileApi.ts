import type { Profile, ProfileRequest, SocialPlatform } from './profile';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface OAuthInitiateResponse {
  redirectUrl: string;
}

export class SocialLinkError extends Error {
  constructor(public readonly code: string, message?: string) {
    super(message ?? code);
    this.name = 'SocialLinkError';
  }
}

async function parseErrorCode(res: Response): Promise<string> {
  if (res.status === 401) return 'unauthorized';
  if (res.status === 409) return 'alreadyLinked';
  if (res.status === 400) return 'invalid';
  if (res.status === 502) return 'unavailable';
  return `http${res.status}`;
}

export async function fetchMyProfile(token: string): Promise<Profile | null> {
  const res = await fetch(`${API_BASE}/profiles/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // 204: authenticated user has no profile yet. 404 kept for backward safety.
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function upsertMyProfile(token: string, data: ProfileRequest): Promise<Profile> {
  const res = await fetch(`${API_BASE}/profiles/me`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save profile');
  return res.json();
}

export async function fetchProfileByAddress(address: string): Promise<Profile | null> {
  if (!ETH_ADDRESS_RE.test(address)) return null;
  const res = await fetch(`${API_BASE}/profiles/${address}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function fetchProfilesByAddresses(addresses: string[]): Promise<Profile[]> {
  const validated = addresses.filter((a) => ETH_ADDRESS_RE.test(a));
  if (validated.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < validated.length; i += 50) {
    chunks.push(validated.slice(i, i + 50));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch(
        `${API_BASE}/profiles?addresses=${encodeURIComponent(chunk.join(','))}`
      );
      if (!res.ok) return [];
      return res.json() as Promise<Profile[]>;
    })
  );

  return results.flat();
}

// --- Social linking ------------------------------------------------------

async function initiateOAuth(
  token: string,
  platform: 'steam' | 'telegram',
): Promise<OAuthInitiateResponse> {
  const res = await fetch(`${API_BASE}/profiles/me/social/${platform}/initiate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new SocialLinkError(await parseErrorCode(res));
  return res.json();
}

export function startSteamLink(token: string): Promise<OAuthInitiateResponse> {
  return initiateOAuth(token, 'steam');
}

export function startTelegramLink(token: string): Promise<OAuthInitiateResponse> {
  return initiateOAuth(token, 'telegram');
}

export async function setInstagramHandle(token: string, handle: string): Promise<Profile> {
  const res = await fetch(`${API_BASE}/profiles/me/social/instagram`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ handle }),
  });
  if (!res.ok) throw new SocialLinkError(await parseErrorCode(res));
  return res.json();
}

export async function unlinkSocial(token: string, platform: SocialPlatform): Promise<void> {
  const res = await fetch(`${API_BASE}/profiles/me/social/${platform}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new SocialLinkError(await parseErrorCode(res));
}
