"use client";

import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { useMemo } from "react";
import { Address } from "@ton/core";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { TonAmount } from "@/components/ui/TonAmount";
import { DuelCard, DuelCardSkeleton } from "@/components/duel/DuelCard";
import { useDuelActions } from "@/hooks/useDuelActions";
import { useDuelList, pendingPayoutFor } from "@/hooks/useDuelList";
import { useWallet } from "@/hooks/useWallet";
import { useTranslation } from "@/components/providers/I18nProvider";
import { DuelState, type DuelView } from "@/lib/ton/duelme";
import { CLAIM_TIMEOUT_SEC } from "@/lib/constants";

interface ClaimablePartition {
  ready: DuelView[];
  refundable: DuelView[];
  total: bigint;
}

function partition(duels: DuelView[] | undefined, player: Address | null): ClaimablePartition {
  if (!duels || !player) return { ready: [], refundable: [], total: 0n };
  const ready: DuelView[] = [];
  const refundable: DuelView[] = [];
  let total = 0n;
  const now = Math.floor(Date.now() / 1000);

  for (const d of duels) {
    if (
      d.state === DuelState.WinnerClaimed &&
      now >= d.claimTimestamp + CLAIM_TIMEOUT_SEC &&
      (d.creator.toRawString() === player.toRawString() ||
        d.opponent?.toRawString() === player.toRawString())
    ) {
      refundable.push(d);
      // Refund payout: wager once each, but the refund handler sets both
      // creatorPayout/opponentPayout to wager — the viewer is one of the two,
      // so credit them with `wagerAmount`.
      total += d.wagerAmount;
      continue;
    }
    const amount = pendingPayoutFor(d, player);
    if (amount && amount > 0n) {
      ready.push(d);
      total += amount;
    }
  }
  return { ready, refundable, total };
}

export default function MyDuelsPage() {
  const { t } = useTranslation();
  const { address, isConnected, openWallet } = useWallet();
  const actions = useDuelActions();

  const duelsQuery = useDuelList({ player: address ?? null, scanLimit: 80 });
  const { data: myDuels, isLoading, isError, error } = duelsQuery;

  const active = useMemo(
    () =>
      (myDuels ?? []).filter(
        (d) =>
          d.state === DuelState.Created ||
          d.state === DuelState.Funded ||
          d.state === DuelState.WinnerClaimed ||
          d.state === DuelState.MutualCancelRequested,
      ),
    [myDuels],
  );

  const history = useMemo(
    () =>
      (myDuels ?? []).filter(
        (d) =>
          d.state === DuelState.Resolved ||
          d.state === DuelState.Refunded ||
          d.state === DuelState.Cancelled ||
          d.state === DuelState.Declined ||
          d.state === DuelState.Disputed ||
          d.state === DuelState.MutuallyCancelled,
      ),
    [myDuels],
  );

  const { ready, refundable, total } = useMemo(() => partition(myDuels, address ?? null), [myDuels, address]);
  const hasClaimable = ready.length > 0 || refundable.length > 0;

  if (!isConnected) {
    return (
      <Card className="space-y-3 text-center">
        <Wallet className="mx-auto size-8 text-link" aria-hidden />
        <p className="text-sm text-muted">{t("errors.walletNotConnected")}</p>
        <Button onClick={openWallet} size="lg">
          {t("home.ctaConnect")}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <ErrorBanner error={isError ? error : null} onRetry={() => duelsQuery.refetch()} />
      {hasClaimable && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="glass relative overflow-hidden rounded-2xl p-5"
        >
          <div className="pointer-events-none absolute -left-6 -bottom-6 size-32 rounded-full bg-gradient-to-tr from-success/30 to-link/20 blur-3xl" />
          <div className="relative space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-success">
              Ready to claim
            </p>
            <TonAmount nano={total} tone="success" size="lg" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ready.length > 0 && (
                <Button
                  size="block"
                  variant="success"
                  onClick={() => actions.claimPayouts(ready.map((d) => d.id))}
                >
                  Claim all rewards · {ready.length}
                </Button>
              )}
              {refundable.length > 0 && (
                <Button
                  size="block"
                  variant="secondary"
                  onClick={() => actions.refundAndClaim(refundable.map((d) => d.id))}
                >
                  Refund & claim · {refundable.length}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-text">Active</h2>
        {isLoading && (
          <div className="space-y-3">
            <DuelCardSkeleton />
            <DuelCardSkeleton />
          </div>
        )}
        {!isLoading && active.length === 0 && (
          <EmptyState message="No active duels. Start one from the Create tab." />
        )}
        <div className="space-y-3">
          {active.map((d) => <DuelCard key={d.id.toString()} duel={d} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-text">History</h2>
        {isLoading && <Skeleton className="h-24" />}
        {!isLoading && history.length === 0 && (
          <EmptyState message="No completed duels yet." />
        )}
        <div className="space-y-3">
          {history.map((d) => <DuelCard key={d.id.toString()} duel={d} />)}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-8 text-center text-sm text-muted">{message}</div>
  );
}
