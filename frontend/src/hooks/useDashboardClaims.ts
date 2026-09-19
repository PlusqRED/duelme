'use client';

import { useMemo, useState } from 'react';
import type { PlayerDuel } from '@/lib/duel';
import type { ActionFlowSummaryContext } from '@/lib/actionFlow';
import { getClaimableAmountForAddress, isRefundableDuel } from '@/lib/duel';
import { formatUSDT } from '@/lib/utils';
import {
  claimAllConfig,
  claimPayoutConfig,
  refundAndClaimConfig,
  refundAndClaimAllConfig,
} from '@/lib/actionFlowConfigs';
import type { useActionFlow } from '@/hooks/useActionFlow';

interface UseDashboardClaimsOptions {
  historyDuels: PlayerDuel[];
  walletAddress?: string;
  authenticated: boolean;
  actionFlow: ReturnType<typeof useActionFlow>;
}

export function useDashboardClaims({
  historyDuels,
  walletAddress,
  authenticated,
  actionFlow,
}: UseDashboardClaimsOptions) {
  const [claimSummary, setClaimSummary] = useState<
    Pick<ActionFlowSummaryContext, 'duelId' | 'claimableDisplay'>
  >({ duelId: 0, claimableDisplay: '' });

  const claimableDuels = useMemo(
    () => authenticated
      ? historyDuels.filter((duel) => getClaimableAmountForAddress(duel, walletAddress) > 0n)
      : [],
    [historyDuels, walletAddress, authenticated]
  );
  const totalClaimable = useMemo(
    () => claimableDuels.reduce(
      (sum, duel) => sum + getClaimableAmountForAddress(duel, walletAddress),
      0n
    ),
    [claimableDuels, walletAddress]
  );

  const refundableDuels = useMemo(
    () => authenticated
      ? historyDuels.filter((duel) => isRefundableDuel(duel))
      : [],
    [historyDuels, authenticated]
  );
  const totalRefundable = useMemo(
    () => refundableDuels.reduce(
      (sum, duel) => sum + duel.wagerAmount,
      0n
    ),
    [refundableDuels]
  );

  function handleClaimAll() {
    if (!claimableDuels.length) return;
    const duelIds = claimableDuels.map((duel) => BigInt(duel.id));
    setClaimSummary({ duelId: 0, claimableDisplay: `${formatUSDT(totalClaimable)} USDT` });
    actionFlow.openFlow(
      claimAllConfig(
        () => actionFlow.duelActions.claimPayouts(duelIds),
        `${formatUSDT(totalClaimable)} USDT`,
        claimableDuels.length,
      )
    );
  }

  function handleClaimSingle(duelId: number) {
    const duel = historyDuels.find((d) => d.id === duelId);
    const amount = duel ? getClaimableAmountForAddress(duel, walletAddress) : 0n;
    setClaimSummary({ duelId, claimableDisplay: `${formatUSDT(amount)} USDT` });
    actionFlow.openFlow(
      claimPayoutConfig(() => actionFlow.duelActions.claimPayout(BigInt(duelId)))
    );
  }

  function handleRefundAndClaimAll() {
    if (!refundableDuels.length) return;
    const duelIds = refundableDuels.map((duel) => BigInt(duel.id));
    setClaimSummary({ duelId: 0, claimableDisplay: `${formatUSDT(totalRefundable)} USDT` });
    actionFlow.openFlow(
      refundAndClaimAllConfig(
        () => actionFlow.duelActions.refundAndClaimPayouts(duelIds),
        `${formatUSDT(totalRefundable)} USDT`,
        refundableDuels.length,
      )
    );
  }

  function handleRefundAndClaimSingle(duelId: number) {
    const duel = historyDuels.find((d) => d.id === duelId);
    if (!duel) return;
    setClaimSummary({ duelId, claimableDisplay: `${formatUSDT(duel.wagerAmount)} USDT` });
    actionFlow.openFlow(
      refundAndClaimConfig(() => actionFlow.duelActions.refundAndClaimPayouts([BigInt(duelId)]))
    );
  }

  return {
    claimSummary,
    claimableDuels,
    totalClaimable,
    refundableDuels,
    totalRefundable,
    handleClaimAll,
    handleClaimSingle,
    handleRefundAndClaimAll,
    handleRefundAndClaimSingle,
  };
}
