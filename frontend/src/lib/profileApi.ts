import type { Profile, ProfileRequest } from './profile';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function fetchMyProfile(token: string): Promise<Profile | null> {
  const res = await fetch(`${API_BASE}/profiles/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
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
        `${API_BASE}/profiles/?addresses=${encodeURIComponent(chunk.join(','))}`
      );
      if (!res.ok) return [];
      return res.json() as Promise<Profile[]>;
    })
  );

  return results.flat();
}
