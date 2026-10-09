import { describe, expect, it } from 'vitest';
import {
  CREATE_DUEL_DRAFT_KEY,
  type CreateDuelDraft,
  clearCreateDuelDraft,
  loadCreateDuelDraft,
  parseCreateDuelDraft,
  saveCreateDuelDraft,
  serializeCreateDuelDraft,
} from '../createDuelDraft';

const CHAIN = 421614;
const SECRET = `0x${'ab'.repeat(32)}`;

const DRAFT: CreateDuelDraft = {
  chainId: CHAIN,
  game: { slug: 'cs2', name: 'Counter-Strike 2', category: 'FPS' },
  amount: '5.5',
  message: 'gg 🔥',
  isPublic: false,
};

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new DOMException('quota', 'QuotaExceededError');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

describe('create duel draft storage', () => {
  it('round-trips every form field', () => {
    const storage = memoryStorage();

    expect(saveCreateDuelDraft(storage, DRAFT)).toBe(true);
    expect(loadCreateDuelDraft(storage, CHAIN)).toEqual(DRAFT);
  });

  it('round-trips a draft with no game picked yet', () => {
    const storage = memoryStorage();
    saveCreateDuelDraft(storage, { ...DRAFT, game: null, isPublic: true });

    expect(loadCreateDuelDraft(storage, CHAIN)).toEqual({ ...DRAFT, game: null, isPublic: true });
  });

  it('keeps the invite secret and hash out of storage even when the caller carries them', () => {
    const withSecret = { ...DRAFT, inviteSecret: SECRET, inviteHash: SECRET, rawAmount: 5_500_000n };
    const serialized = serializeCreateDuelDraft(withSecret);

    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain('invite');
    expect(Object.keys(JSON.parse(serialized)).sort()).toEqual(['amount', 'chainId', 'game', 'isPublic', 'message']);
  });

  it('does not hand a draft for another network to this one', () => {
    const storage = memoryStorage();
    saveCreateDuelDraft(storage, DRAFT);

    expect(loadCreateDuelDraft(storage, 42161)).toBeNull();
  });

  it.each([
    ['nothing stored', null],
    ['not JSON', '{oops'],
    ['an array', '[]'],
    ['a string', '"draft"'],
    ['a missing field', JSON.stringify({ ...DRAFT, message: undefined })],
    ['a wrong field type', JSON.stringify({ ...DRAFT, amount: 5 })],
    ['a fractional chain id', JSON.stringify({ ...DRAFT, chainId: 1.5 })],
    ['an unknown game category', JSON.stringify({ ...DRAFT, game: { ...DRAFT.game, category: 'CHESS' } })],
    ['a game without a slug', JSON.stringify({ ...DRAFT, game: { ...DRAFT.game, slug: '' } })],
  ])('reads %s as no draft', (_label, raw) => {
    expect(parseCreateDuelDraft(raw)).toBeNull();
    expect(loadCreateDuelDraft(memoryStorage(raw === null ? {} : { [CREATE_DUEL_DRAFT_KEY]: raw }), CHAIN)).toBeNull();
  });

  it('clears the stored draft', () => {
    const storage = memoryStorage();
    saveCreateDuelDraft(storage, DRAFT);
    clearCreateDuelDraft(storage);

    expect(storage.items.has(CREATE_DUEL_DRAFT_KEY)).toBe(false);
    expect(loadCreateDuelDraft(storage, CHAIN)).toBeNull();
  });

  it('survives storage that refuses every call', () => {
    const storage = throwingStorage();

    expect(saveCreateDuelDraft(storage, DRAFT)).toBe(false);
    expect(loadCreateDuelDraft(storage, CHAIN)).toBeNull();
    expect(() => clearCreateDuelDraft(storage)).not.toThrow();
  });
});
