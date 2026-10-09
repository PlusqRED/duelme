'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type CreateDuelDraft,
  clearCreateDuelDraft,
  loadCreateDuelDraft,
  saveCreateDuelDraft,
} from '@/lib/createDuelDraft';

/**
 * Keeps the create-duel form across a trip to top up. `saveDraft` runs when the player opens the
 * top-up panel; on the next mount in this tab the draft comes back as `restoredDraft`, and a created
 * duel clears it. sessionStorage, so it never outlives the tab and never reaches a server.
 */
export function useCreateDuelDraftStorage(chainId: number, isCreated: boolean) {
  const [restoredDraft, setRestoredDraft] = useState<CreateDuelDraft | null>(null);

  useEffect(() => {
    // sessionStorage only exists in the browser, so the read waits for the first client render.
    setRestoredDraft(loadCreateDuelDraft(window.sessionStorage, chainId));
  }, [chainId]);

  useEffect(() => {
    if (isCreated) {
      clearCreateDuelDraft(window.sessionStorage);
    }
  }, [isCreated]);

  const saveDraft = useCallback((draft: CreateDuelDraft) => {
    // A refused write (quota, storage disabled) only loses the restore after a reload; the form
    // itself is still in memory, so there is nothing to tell the player.
    saveCreateDuelDraft(window.sessionStorage, draft);
  }, []);

  return { restoredDraft, saveDraft };
}
