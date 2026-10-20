'use client';

import { useState } from 'react';
import { useActionFlow } from '@/hooks/useActionFlow';
import { useTranslation } from '@/i18n/useTranslation';
import { refundAndClaimAllConfig } from '@/lib/actionFlowConfigs';
import { summarizeOwed, type Owed } from '@/lib/owed';
import { formatUSDT } from '@/lib/utils';

/** One Take: the duels it emptied and what it brought in, in USDT's smallest unit. */
interface Take {
  duelIds: number[];
  raw: bigint;
}

/**
 * The safe's one Take: `refundAndClaimPayouts` over every duel that holds money for the reader. The
 * contract closes the timed-out ones and pays out the rest in the same call, so a win, a stake coming
 * back and a timed-out stake all leave in one signature. What was taken stays out of the safe from
 * the moment the chain confirms, even before the history is read again; `takenRaw` is the last Take,
 * for the line that says it arrived.
 */
export function useDashboardTake(owed: Owed | null, refetch: () => void) {
  const { language } = useTranslation();
  const actionFlow = useActionFlow({ duelId: 0, refetchDuel: refetch });
  const [asked, setAsked] = useState<Take | null>(null);
  const [taken, setTaken] = useState<{ duelIds: ReadonlySet<number>; raw: bigint } | null>(null);

  if (actionFlow.flow?.stage === 'success' && asked) {
    setTaken({ duelIds: new Set([...(taken?.duelIds ?? []), ...asked.duelIds]), raw: asked.raw });
    setAsked(null);
  }

  const left = owed && summarizeOwed(owed.items.filter((item) => !taken?.duelIds.has(item.duelId)));

  function take() {
    if (!left || actionFlow.flow) return;
    const duelIds = left.items.map((item) => item.duelId);
    setAsked({ duelIds, raw: left.totalRaw });
    actionFlow.openFlow(
      refundAndClaimAllConfig(
        () => actionFlow.duelActions.refundAndClaimPayouts(duelIds.map(BigInt)),
        `${formatUSDT(left.totalRaw, language)} USDT`,
        duelIds.length,
        left.items.some((item) => item.kind === 'late')
      )
    );
  }

  return { owed: left, takenRaw: taken?.raw ?? null, take, actionFlow };
}
