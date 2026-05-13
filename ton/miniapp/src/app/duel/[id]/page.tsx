"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Card, CardRow } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateBadge } from "@/components/ui/StateBadge";
import { TonAmount } from "@/components/ui/TonAmount";
import { AddressPill } from "@/components/ui/AddressPill";
import { ClaimTimer } from "@/components/duel/ClaimTimer";
import { DuelActions } from "@/components/duel/DuelActions";
import { DuelTimeline } from "@/components/duel/DuelTimeline";
import { ResultBanner } from "@/components/duel/ResultBanner";
import { useInviteFromUrl } from "@/components/duel/InviteFromUrl";
import { useDuel } from "@/hooks/useDuel";
import { useWallet } from "@/hooks/useWallet";
import { useTranslation } from "@/components/providers/I18nProvider";
import { DuelState } from "@/lib/ton/duelme";

export default function DuelPage() {
  const params = useParams<{ id: string }>();
  const { t } = useTranslation();
  const duelId = useMemo(() => {
    try {
      return params.id ? BigInt(params.id) : null;
    } catch {
      return null;
    }
  }, [params.id]);

  const invite = useInviteFromUrl(duelId);
  const { address } = useWallet();
  const { data: duel, isLoading, error } = useDuel(duelId ?? undefined);

  if (duelId === null) {
    return (
      <Card className="text-center">
        <p className="text-sm text-danger">{t("errors.generic")}</p>
      </Card>
    );
  }

  if (isLoading || !duel) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center">
        <p className="text-sm text-danger">{t("errors.generic")}</p>
      </Card>
    );
  }

  const totalPrize = duel.opponent ? duel.wagerAmount * 2n : duel.wagerAmount;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="glass relative overflow-hidden rounded-2xl p-5"
      >
        <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted">DUEL #{duel.id.toString()}</p>
            <StateBadge state={duel.state} />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">{t("duel.labelPrize")}</p>
              <TonAmount nano={totalPrize} size="lg" />
            </div>
            <Swords className="size-7 text-primary/70" aria-hidden />
          </div>
          {duel.message && (
            <p className="mt-4 rounded-xl bg-elevated/60 p-3 text-sm italic text-text/90">
              &ldquo;{duel.message}&rdquo;
            </p>
          )}
        </div>
      </motion.div>

      <Card className="space-y-2">
        <CardRow
          label={t("duel.labelCreator")}
          value={<AddressPill address={duel.creator} />}
        />
        <CardRow
          label={t("duel.labelOpponent")}
          value={
            duel.opponent ? (
              <AddressPill address={duel.opponent} />
            ) : (
              <span className="text-xs text-muted">—</span>
            )
          }
        />
        <CardRow label={t("duel.labelWager")} value={<TonAmount nano={duel.wagerAmount} size="sm" />} />
      </Card>

      <ResultBanner duel={duel} viewer={address} />

      {duel.state === DuelState.WinnerClaimed && (
        <ClaimTimer claimTimestamp={duel.claimTimestamp} />
      )}

      <DuelActions duel={duel} invite={invite.payload} />

      <Card>
        <DuelTimeline duel={duel} />
      </Card>
    </div>
  );
}
