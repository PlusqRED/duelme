import { GAME_CATEGORIES, type GameCategory } from '@/lib/game';

/** Versioned, so a later change of shape reads an old entry as nothing rather than as garbage. */
export const CREATE_DUEL_DRAFT_KEY = 'duelme:create-duel-draft:v1';

export interface CreateDuelDraftGame {
  slug: string;
  name: string;
  category: GameCategory;
}

/**
 * The create-duel form, as typed — what a player gets back after leaving to top up. Only form
 * fields: the invite secret and its hash are not part of it, and a fresh secret is generated on the
 * next "Create", the same as for a form filled in from scratch.
 */
export interface CreateDuelDraft {
  chainId: number;
  game: CreateDuelDraftGame | null;
  amount: string;
  message: string;
  isPublic: boolean;
}

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function serializeCreateDuelDraft(draft: CreateDuelDraft): string {
  // Spelled out field by field, so whatever else the caller's object carries stays out of storage.
  const game = draft.game
    ? { slug: draft.game.slug, name: draft.game.name, category: draft.game.category }
    : null;
  return JSON.stringify({
    chainId: draft.chainId,
    game,
    amount: draft.amount,
    message: draft.message,
    isPublic: draft.isPublic,
  });
}

export function parseCreateDuelDraft(raw: string | null): CreateDuelDraft | null {
  if (!raw) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isCreateDuelDraft(value) ? value : null;
  } catch {
    return null;
  }
}

/** `false` when storage refused the write (quota, disabled storage); the form keeps its state. */
export function saveCreateDuelDraft(storage: DraftStorage, draft: CreateDuelDraft): boolean {
  try {
    storage.setItem(CREATE_DUEL_DRAFT_KEY, serializeCreateDuelDraft(draft));
    return true;
  } catch {
    return false;
  }
}

/** The stored draft for `chainId`, or `null` — a draft for another network is not this form's. */
export function loadCreateDuelDraft(storage: DraftStorage, chainId: number): CreateDuelDraft | null {
  try {
    const draft = parseCreateDuelDraft(storage.getItem(CREATE_DUEL_DRAFT_KEY));
    return draft?.chainId === chainId ? draft : null;
  } catch {
    return null;
  }
}

export function clearCreateDuelDraft(storage: DraftStorage): void {
  try {
    storage.removeItem(CREATE_DUEL_DRAFT_KEY);
  } catch {
    // Storage that cannot be read cannot hand the draft back either.
  }
}

function isCreateDuelDraft(value: unknown): value is CreateDuelDraft {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.chainId === 'number' &&
    Number.isInteger(value.chainId) &&
    (value.game === null || isDraftGame(value.game)) &&
    typeof value.amount === 'string' &&
    typeof value.message === 'string' &&
    typeof value.isPublic === 'boolean'
  );
}

function isDraftGame(value: unknown): value is CreateDuelDraftGame {
  return (
    isRecord(value) &&
    typeof value.slug === 'string' &&
    value.slug.length > 0 &&
    typeof value.name === 'string' &&
    GAME_CATEGORIES.some((category) => category === value.category)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
