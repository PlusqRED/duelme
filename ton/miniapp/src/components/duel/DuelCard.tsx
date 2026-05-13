"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardRow } from "@/components/ui/Card";
import { AddressPill } from "@/components/ui/AddressPill";
import { StateBadge } from "@/components/ui/StateBadge";
import { TonAmount } from "@/components/ui/TonAmount";
import { useTranslation } from "@/components/providers/I18nProvider";
import { relativeTime } from "@/lib/format";
import { type DuelView } from "@/lib/ton/duelme";

export function DuelCard({ duel }: { duel: DuelView }) {
  const { t } = useTranslation();
  const prize = duel.opponent ? duel.wagerAmount * 2n : duel.wagerAmount;

  return (
    <Link href={`/duel/${duel.id}`} aria-label={`Duel #${duel.id}`} className="block">
      <Card interactive className="space-y-3">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted">#{duel.id.toString()}</span>
            <StateBadge state={duel.state} />
          </div>
          <ArrowRight className="size-4 text-muted" aria-hidden />
        </CardHeader>

        {duel.message && (
          <p className="line-clamp-2 italic text-text/80">&ldquo;{duel.message}&rdquo;</p>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {t("duel.labelCreator")}
            </span>
            <AddressPill address={duel.creator} />
          </div>
          {duel.opponent && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted">
                {t("duel.labelOpponent")}
              </span>
              <AddressPill address={duel.opponent} />
            </div>
          )}
        </div>

        <CardRow
          label={t("duel.labelPrize")}
          value={<TonAmount nano={prize} tone={duel.opponent ? "success" : "default"} />}
        />
        <CardRow
          label={t("duel.labelWager")}
          value={<TonAmount nano={duel.wagerAmount} size="sm" />}
        />
        <p className="text-right text-[10px] text-muted">{relativeTime(duel.createdAt)}</p>
      </Card>
    </Link>
  );
}

export function DuelCardSkeleton() {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-12 animate-pulse rounded bg-elevated" />
        <div className="h-3 w-16 animate-pulse rounded bg-elevated" />
      </div>
      <div className="h-4 w-3/4 animate-pulse rounded bg-elevated" />
      <div className="h-8 w-full animate-pulse rounded bg-elevated" />
    </Card>
  );
}
