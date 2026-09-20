import type { Game, GameCategory, DuelMeta } from './game';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

/** The deployment a duel-metadata call is about. Lowercased: the backend stores it that way. */
function duelQuery(chainId: number, contractAddress: `0x${string}`): string {
  return `chainId=${chainId}&contractAddress=${contractAddress.toLowerCase()}`;
}

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

/**
 * Every duel-metadata call carries the contract the duel lives in, because the duel id alone does
 * not identify one: ids come from `duelCount` and restart at zero on a redeploy, so the same
 * {duelId, chainId} names a different duel under a different deployment. Callers take the address
 * from `DUELME_ADDRESSES` in `constants.ts` — never a literal.
 */
export async function attachGameToDuel(
  token: string,
  duelId: number,
  chainId: number,
  contractAddress: `0x${string}`,
  gameName: string,
  category?: GameCategory,
): Promise<DuelMeta> {
  const res = await fetch(`${API_BASE}/duels/${duelId}/meta?${duelQuery(chainId, contractAddress)}`, {
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

export async function fetchDuelsByGame(
  gameSlug: string,
  chainId: number,
  contractAddress: `0x${string}`,
): Promise<DuelMeta[]> {
  const res = await fetch(
    `${API_BASE}/duels/meta?gameSlug=${encodeURIComponent(gameSlug)}&${duelQuery(chainId, contractAddress)}`,
  );
  if (!res.ok) throw new Error('Failed to fetch duels by game');
  return res.json();
}

export async function fetchDuelMeta(
  duelId: number,
  chainId: number,
  contractAddress: `0x${string}`,
): Promise<DuelMeta | null> {
  const res = await fetch(`${API_BASE}/duels/${duelId}/meta?${duelQuery(chainId, contractAddress)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch duel metadata');
  return res.json();
}

export async function fetchDuelMetaBatch(
  chainId: number,
  contractAddress: `0x${string}`,
  duelIds: number[],
): Promise<DuelMeta[]> {
  if (duelIds.length === 0) return [];
  const ids = duelIds.join(',');
  const res = await fetch(
    `${API_BASE}/duels/meta/batch?${duelQuery(chainId, contractAddress)}&duelIds=${ids}`,
  );
  if (!res.ok) throw new Error('Failed to fetch duel metadata batch');
  return res.json();
}
