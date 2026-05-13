"use client";

import { useEffect, useState } from "react";
import { useTelegram } from "@/components/providers/TelegramProvider";
import { decodeInviteToken, type InvitePayload } from "@/lib/invite";

export interface InviteCarrier {
  /** Parsed payload, when the URL fragment / Telegram start_param carried one. */
  payload: InvitePayload | null;
  /** True after the carrier finished its hydration cycle. */
  hydrated: boolean;
}

/**
 * Look up an invite payload from any of the following sources, in order:
 *   1. URL fragment (`#invite=<token>`)
 *   2. Telegram start_param when launched via `t.me/<bot>/<short>?startapp=...`
 *   3. URL query string (`?invite=<token>`) — useful for testing
 *
 * Returns a stable payload so a navigation back to the page doesn't reset it.
 */
export function useInviteFromUrl(expectedDuelId: bigint | null): InviteCarrier {
  const { startParam } = useTelegram();
  const [payload, setPayload] = useState<InvitePayload | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let token: string | null = null;

    // 1) URL fragment
    const fragment = window.location.hash.replace(/^#/, "");
    const fragParams = new URLSearchParams(fragment);
    token = fragParams.get("invite");

    // 2) Telegram start_param
    if (!token && startParam) {
      token = startParam;
    }

    // 3) Query string
    if (!token) {
      const query = new URLSearchParams(window.location.search);
      token = query.get("invite");
    }

    if (token) {
      try {
        const parsed = decodeInviteToken(token);
        if (expectedDuelId === null || parsed.duelId === expectedDuelId) {
          setPayload(parsed);
        }
      } catch {
        /* malformed token — silently ignore */
      }
    }
    setHydrated(true);
  }, [startParam, expectedDuelId]);

  return { payload, hydrated };
}
