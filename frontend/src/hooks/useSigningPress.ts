'use client';

import { useEffect, useEffectEvent, useRef } from 'react';
import type { WalletPlace } from '@/components/sign/signingModel';
import type { FlowActionState } from '@/lib/flowSession';
import type { FlowPlace } from '@/lib/signingSteps';

interface UseSigningPressOptions {
  /** Where the flow stands, or null while no flow is open. */
  place: FlowPlace | null;
  actionState: FlowActionState;
  run: Record<WalletPlace, () => void>;
}

/**
 * One press of the window's main button carries the flow through every wallet step it reaches — the
 * network switch, the approve, the write — the way the player meant it, without a button for each.
 * A press starts each step at most once, so a flow that comes back to a step (the wallet still on
 * another network after switching) waits for the player instead of asking again; a stop, Done or a
 * closed window ends the press.
 */
export function useSigningPress({ place, actionState, run }: UseSigningPressOptions) {
  const started = useRef<Set<WalletPlace> | null>(null);
  const start = useEffectEvent((step: WalletPlace) => run[step]());

  useEffect(() => {
    if (place === null || place === 'success' || actionState === 'error') {
      started.current = null;
      return;
    }
    const press = started.current;
    if (!press || place === 'review' || actionState !== 'idle' || press.has(place)) {
      return;
    }
    press.add(place);
    start(place);
  }, [place, actionState]);

  return {
    /** A new press; `already` is a step the caller starts itself, as Try again does. */
    press(already?: WalletPlace) {
      started.current = new Set(already ? [already] : []);
    },
  };
}
