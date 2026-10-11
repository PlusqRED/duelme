'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type CreateDuelDraft,
  clearCreateDuelDraft,
  loadCreateDuelDraft,
  saveCreateDuelDraft,
} from '@/lib/createDuelDraft';

/**
 * Keeps the create-duel form across a trip to top up. `keepDraft` runs when the player opens the
 * top-up panel; on the next mount in this tab the draft comes back as `restoredDraft`. While the
 * create call is in flight the stored copy is cleared and not written; a refused call resumes it. sessionStorage, so it never outlives the tab and never reaches
 * a server.
 */
export function useCreateDuelDraftStorage(form: CreateDuelDraft, isCreateInFlight: boolean) {
  const { chainId } = form;
  const [restoredDraft, setRestoredDraft] = useState<CreateDuelDraft | null>(null);
  const [isKeptByTopUp, setIsKeptByTopUp] = useState(false);
  // From Top up on — or from a draft brought back from one — the stored copy is kept.
  const isKept = isKeptByTopUp || restoredDraft !== null;

  useEffect(() => {
    // sessionStorage only exists in the browser, so the read waits for the first client render.
    setRestoredDraft(loadCreateDuelDraft(window.sessionStorage, chainId));
  }, [chainId]);

  useEffect(() => {
    // The stored copy follows every edit after Top up, so a reload brings back the form as last
    // typed rather than as it was when the panel opened. A refused write (quota, storage disabled)
    // only loses the restore after a reload; the form itself is still in memory.
    if (isKept && !isCreateInFlight) {
      saveCreateDuelDraft(window.sessionStorage, form);
    }
  }, [isKept, isCreateInFlight, form]);

  useEffect(() => {
    if (isCreateInFlight) {
      clearCreateDuelDraft(window.sessionStorage);
    }
  }, [isCreateInFlight]);

  const keepDraft = useCallback(() => setIsKeptByTopUp(true), []);

  return { restoredDraft, keepDraft };
}
