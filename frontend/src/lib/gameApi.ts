import type { Game, GameCategory, DuelMeta } from './game';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export async function fetchGames(category?: GameCategory, search?: string): Promise<Game[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/games${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch games');
  return res.json();
}

export async function fetchGameBySlug(slug: string): Promise<Game | null> {
  const res = await fetch(`${API_BASE}/games/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch game');
  return res.json();
}

export async function attachGameToDuel(
  token: string,
  duelId: number,
  chainId: number,
  gameName: string,
  category?: GameCategory,
): Promise<DuelMeta> {
  const res = await fetch(`${API_BASE}/duels/${duelId}/meta?chainId=${chainId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameName, category }),
  });
  if (!res.ok) throw new Error('Failed to attach game');
  return res.json();
}

export async function fetchDuelsByGame(gameSlug: string): Promise<DuelMeta[]> {
  const res = await fetch(`${API_BASE}/duels/meta?gameSlug=${encodeURIComponent(gameSlug)}`);
  if (!res.ok) throw new Error('Failed to fetch duels by game');
  return res.json();
}

export async function fetchDuelMeta(duelId: number, chainId: number): Promise<DuelMeta | null> {
  const res = await fetch(`${API_BASE}/duels/${duelId}/meta?chainId=${chainId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch duel metadata');
  return res.json();
}
