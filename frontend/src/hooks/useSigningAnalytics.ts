'use client';

import { useEffect, useRef } from 'react';
import { formatUnits } from 'viem';
import type { SigningModel } from '@/components/sign/signingModel';
import { trackEvent, type SigningProps, type WalletKind } from '@/lib/analytics';
import { USDT_DECIMALS } from '@/lib/constants';
import { signingEvents, type SigningSnapshot } from '@/lib/signingAnalytics';

/**
 * Reports how a signing window goes (`lib/signingAnalytics.ts`): every duel write passes through
 * one, so this one place sees each action opened, failed, done or left, with its duel and contract.
 * The window's wallet comes from the window, none while signed out.
 */
export function useSigningAnalytics(model: SigningModel, walletKind: WalletKind | undefined) {
  const last = useRef<SigningSnapshot | null>(null);

  const props: SigningProps = {
    action: model.facts.functionName,
    chain_id: model.chainId,
    contract: model.facts.contract.toLowerCase(),
    route: model.route,
    duel_id: model.duelId ?? undefined,
    duels: model.duelCount,
    stake: model.stake ? formatUnits(model.stake.needRaw, USDT_DECIMALS) : undefined,
    wallet_kind: walletKind,
  };
  const snapshot: SigningSnapshot = { open: model.open, place: model.place, error: model.error, props };

  // Every render: the events are the difference between this one and the one before.
  useEffect(() => {
    for (const event of signingEvents(last.current, snapshot)) {
      trackEvent(event.name, event.props);
    }
    last.current = snapshot;
  });
}
