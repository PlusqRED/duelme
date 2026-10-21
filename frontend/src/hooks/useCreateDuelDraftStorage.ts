'use client';

import { useEffect, useState } from 'react';
import {
  type CreateDuelDraft,
  clearCreateDuelDraft,
  loadCreateDuelDraft,
  saveCreateDuelDraft,
} from '@/lib/createDuelDraft';

/** The stored draft, or that there is none: read either way. */
function readDraft(chainId: number): { draft: CreateDuelDraft | null } {
  return { draft: loadCreateDuelDraft(window.sessionStorage, chainId) };
}

/**
 * Keeps the create-duel form in this tab, so a reload, a trip to sign in or one to top up brings it
 * back as `restoredDraft` on the next mount. Every edit is kept once the stored copy has been read;
 * while `isClosed` (the create call is in flight, or the duel exists) the copy is cleared and not
 * written, so a reload then cannot offer the same terms for a second duel, and a refused call
 * resumes it. sessionStorage, so it never
 * outlives the tab and never reaches a server. The caller puts `restoredDraft` into its form in the
 * render it arrives in, before the form is written back.
 */
export function useCreateDuelDraftStorage(form: CreateDuelDraft, isClosed: boolean) {
  const { chainId } = form;
  const [restored, setRestored] = useState<{ draft: CreateDuelDraft | null } | null>(null);
  const hasRead = restored !== null;

  useEffect(() => {
    // sessionStorage only exists in the browser, so the read waits for the first client render.
    setRestored(readDraft(chainId));
  }, [chainId]);

  useEffect(() => {
    // Not before the read: the empty form of the first render would overwrite the draft to restore.
    // A refused write (quota, storage disabled) only loses the restore after a reload.
    if (hasRead && !isClosed) {
      saveCreateDuelDraft(window.sessionStorage, form);
    }
  }, [hasRead, isClosed, form]);

  useEffect(() => {
    if (isClosed) {
      clearCreateDuelDraft(window.sessionStorage);
    }
  }, [isClosed]);

  return { restoredDraft: restored?.draft ?? null };
}
