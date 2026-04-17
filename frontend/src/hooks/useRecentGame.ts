'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { GameCategory } from '@/lib/game';

const STORAGE_KEY = 'duelme.recentGame.v1';
const CHANGE_EVENT = 'duelme:recentGame:changed';

export interface RecentGame {
  slug: string;
  name: string;
  category: GameCategory;
}

const CACHE_UNINITIALIZED = Symbol('uninitialized');
let cachedRaw: string | null | typeof CACHE_UNINITIALIZED = CACHE_UNINITIALIZED;
let cachedSnapshot: RecentGame | null = null;

function readSnapshot(): RecentGame | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<RecentGame>;
    if (!parsed?.slug || !parsed?.name || !parsed?.category) {
      cachedSnapshot = null;
      return null;
    }
    cachedSnapshot = { slug: parsed.slug, name: parsed.name, category: parsed.category };
    return cachedSnapshot;
  } catch {
    cachedSnapshot = null;
    return null;
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getServerSnapshot(): RecentGame | null {
  return null;
}

export function useRecentGame() {
  const recentGame = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);

  const saveRecentGame = useCallback((game: RecentGame) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // ignore quota errors
    }
  }, []);

  return { recentGame, saveRecentGame };
}
