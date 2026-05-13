"use client";

import { motion } from "framer-motion";
import { Crown, Skull, Undo2 } from "lucide-react";
import { useMemo } from "react";
import { Address } from "@ton/core";
import { Confetti } from "@/components/animations/Confetti";
import { TonAmount } from "@/components/ui/TonAmount";
import { useTranslation } from "@/components/providers/I18nProvider";
import { addressEquals } from "@/lib/format";
import { DuelState, type DuelView } from "@/lib/ton/duelme";
import { cn } from "@/lib/utils";

type Outcome = "win" | "lose" | "neutral" | null;

function outcomeFor(d: DuelView, viewer: Address | null): Outcome {
  if (!viewer) return null;
  if (d.state === DuelState.Resolved) {
    if (d.claimedWinner && addressEquals(d.claimedWinner, viewer)) return "win";
    return "lose";
  }
  if (
    d.state === DuelState.Refunded ||
    d.state === DuelState.MutuallyCancelled ||
    d.state === DuelState.Disputed ||
    d.state === DuelState.Cancelled ||
    d.state === DuelState.Declined
  ) {
    return "neutral";
  }
  return null;
}

export function ResultBanner({ duel, viewer }: { duel: DuelView; viewer: Address | null }) {
  const { t } = useTranslation();
  const outcome = useMemo(() => outcomeFor(duel, viewer), [duel, viewer]);
  if (!outcome) return null;

  const totalPrize = duel.opponent ? duel.wagerAmount * 2n : duel.wagerAmount;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-4",
        outcome === "win" && "border-success/40",
        outcome === "lose" && "border-danger/40",
      )}
    >
      {outcome === "win" && <Confetti />}
      <div className="relative flex items-center gap-3">
        {outcome === "win" && <Crown className="size-7 text-success" aria-hidden />}
        {outcome === "lose" && <Skull className="size-7 text-danger" aria-hidden />}
        {outcome === "neutral" && <Undo2 className="size-7 text-muted" aria-hidden />}
        <div>
          {outcome === "win" && (
            <>
              <p className="text-xs uppercase tracking-wider text-success">Victory</p>
              <TonAmount nano={totalPrize} tone="success" size="lg" />
            </>
          )}
          {outcome === "lose" && (
            <>
              <p className="text-xs uppercase tracking-wider text-danger">Defeat</p>
              <TonAmount nano={duel.wagerAmount} tone="danger" size="lg" />
            </>
          )}
          {outcome === "neutral" && (
            <>
              <p className="text-xs uppercase tracking-wider text-muted">{t("duel.youTie")}</p>
              <TonAmount nano={duel.wagerAmount} size="md" />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
