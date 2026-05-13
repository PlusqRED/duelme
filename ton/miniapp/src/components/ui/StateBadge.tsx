"use client";

import { useTranslation } from "@/components/providers/I18nProvider";
import { DuelState } from "@/lib/ton/duelme";
import { cn } from "@/lib/utils";

const stateInfo: Record<DuelState, { tone: string; key: string }> = {
  [DuelState.Created]: { tone: "bg-link/15 text-link border-link/30", key: "duel.stateCreated" },
  [DuelState.Funded]: { tone: "bg-warning/15 text-warning border-warning/30", key: "duel.stateFunded" },
  [DuelState.WinnerClaimed]: { tone: "bg-accent/15 text-accent border-accent/30", key: "duel.stateWinnerClaimed" },
  [DuelState.Resolved]: { tone: "bg-success/15 text-success border-success/30", key: "duel.stateResolved" },
  [DuelState.Refunded]: { tone: "bg-muted/15 text-muted border-muted/30", key: "duel.stateRefunded" },
  [DuelState.Cancelled]: { tone: "bg-muted/15 text-muted border-muted/30", key: "duel.stateCancelled" },
  [DuelState.Declined]: { tone: "bg-muted/15 text-muted border-muted/30", key: "duel.stateDeclined" },
  [DuelState.Disputed]: { tone: "bg-danger/15 text-danger border-danger/30", key: "duel.stateDisputed" },
  [DuelState.MutualCancelRequested]: {
    tone: "bg-warning/15 text-warning border-warning/30",
    key: "duel.stateMutualCancelRequested",
  },
  [DuelState.MutuallyCancelled]: {
    tone: "bg-muted/15 text-muted border-muted/30",
    key: "duel.stateMutuallyCancelled",
  },
};

export function StateBadge({ state, className }: { state: DuelState; className?: string }) {
  const { t } = useTranslation();
  const info = stateInfo[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        info.tone,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t(info.key)}
    </span>
  );
}
