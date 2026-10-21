// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCreateDuelDraftStorage } from '@/hooks/useCreateDuelDraftStorage';
import { CREATE_DUEL_DRAFT_KEY, type CreateDuelDraft } from '@/lib/createDuelDraft';

const EMPTY: CreateDuelDraft = { chainId: 421614, game: null, amount: '', message: '', isPublic: false };
const TYPED: CreateDuelDraft = { ...EMPTY, amount: '5', message: 'gg' };

const storedDraft = () => JSON.parse(window.sessionStorage.getItem(CREATE_DUEL_DRAFT_KEY) ?? 'null');

function storage(form: CreateDuelDraft, isClosed = false) {
  return renderHook(({ draft, closed }) => useCreateDuelDraftStorage(draft, closed), {
    initialProps: { draft: form, closed: isClosed },
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(cleanup);

describe('useCreateDuelDraftStorage', () => {
  it('hands back the draft kept in this tab', () => {
    window.sessionStorage.setItem(CREATE_DUEL_DRAFT_KEY, JSON.stringify(TYPED));

    const { result } = storage(EMPTY);

    expect(result.current.restoredDraft).toEqual(TYPED);
  });

  it('does not write the empty first form over the draft it hands back', () => {
    window.sessionStorage.setItem(CREATE_DUEL_DRAFT_KEY, JSON.stringify(TYPED));

    // A form that takes the draft in the render it arrives in, as the create page's does.
    renderHook(() => {
      const [form, setForm] = useState(EMPTY);
      const { restoredDraft } = useCreateDuelDraftStorage(form, false);
      if (restoredDraft && restoredDraft !== form) setForm(restoredDraft);
    });

    expect(storedDraft()).toEqual(TYPED);
  });

  it('keeps every edit made after the read', () => {
    const { rerender } = storage(EMPTY);

    rerender({ draft: TYPED, closed: false });

    expect(storedDraft()).toEqual(TYPED);
  });

  it('clears the draft and writes nothing while the create call is in flight', () => {
    const { rerender } = storage(TYPED);

    rerender({ draft: { ...TYPED, amount: '9' }, closed: true });

    expect(storedDraft()).toBeNull();
  });

  it('ignores a draft for another network', () => {
    window.sessionStorage.setItem(CREATE_DUEL_DRAFT_KEY, JSON.stringify({ ...TYPED, chainId: 42161 }));

    const { result } = storage(EMPTY);

    expect(result.current.restoredDraft).toBeNull();
  });
});
