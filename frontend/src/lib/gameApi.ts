import type { Game, GameCategory, DuelMeta } from './game';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export async function fetchGames(
  category?: GameCategory,
  search?: string,
  limit?: number,
): Promise<Game[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  if (limit && limit > 0) params.set('limit', String(limit));
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/games${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch games');
  return res.json();
}

export async function createGame(
  token: string,
  name: string,
  category: GameCategory,
): Promise<Game> {
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, category }),
  });
  if (!res.ok) throw new Error('Failed to create game');
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

export async function fetchDuelMetaBatch(chainId: number, duelIds: number[]): Promise<DuelMeta[]> {
  if (duelIds.length === 0) return [];
  const ids = duelIds.join(',');
  const res = await fetch(`${API_BASE}/duels/meta/batch?chainId=${chainId}&duelIds=${ids}`);
  if (!res.ok) throw new Error('Failed to fetch duel metadata batch');
  return res.json();
}
