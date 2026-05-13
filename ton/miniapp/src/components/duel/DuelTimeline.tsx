"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/components/providers/I18nProvider";
import { DuelState, type DuelView } from "@/lib/ton/duelme";
import { cn } from "@/lib/utils";

interface TimelineStep {
  key: string;
  reached: boolean;
  unix?: number;
  tone?: "success" | "warning" | "danger" | "neutral";
}

export function DuelTimeline({ duel }: { duel: DuelView }) {
  const { t } = useTranslation();
  const steps = buildSteps(duel);

  return (
    <ol className="relative space-y-3 border-l border-border/60 pl-4">
      {steps.map((s, idx) => (
        <motion.li
          key={s.key}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 * idx, duration: 0.25 }}
          className="relative"
        >
          <span
            className={cn(
              "absolute -left-[21px] top-1.5 size-3.5 rounded-full border-2",
              s.reached ? toneClasses(s.tone) : "border-border bg-bg",
            )}
          />
          <p className={cn("text-sm font-medium", s.reached ? "text-text" : "text-muted")}>
            {t(s.key)}
          </p>
          {s.unix !== undefined && s.reached && (
            <p className="text-[11px] text-muted">{new Date(s.unix * 1000).toLocaleString()}</p>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

function toneClasses(tone?: TimelineStep["tone"]): string {
  switch (tone) {
    case "success":
      return "border-success bg-success/30";
    case "warning":
      return "border-warning bg-warning/30";
    case "danger":
      return "border-danger bg-danger/30";
    default:
      return "border-primary bg-primary/30";
  }
}

function buildSteps(d: DuelView): TimelineStep[] {
  const steps: TimelineStep[] = [
    { key: "duel.timelineCreated", reached: d.createdAt > 0, unix: d.createdAt },
  ];

  if (d.state === DuelState.Cancelled) {
    steps.push({ key: "duel.timelineCancelled", reached: true, unix: d.finalizedAt, tone: "danger" });
    return steps;
  }
  if (d.state === DuelState.Declined) {
    steps.push({ key: "duel.timelineDeclined", reached: true, unix: d.finalizedAt, tone: "danger" });
    return steps;
  }

  steps.push({ key: "duel.timelineFunded", reached: d.fundedAt > 0, unix: d.fundedAt });

  if (d.state === DuelState.MutualCancelRequested || d.state === DuelState.MutuallyCancelled) {
    steps.push({
      key: "duel.timelineMutualRequested",
      reached: d.cancelRequestedAt > 0,
      unix: d.cancelRequestedAt,
      tone: "warning",
    });
  }
  if (d.state === DuelState.MutuallyCancelled) {
    steps.push({ key: "duel.timelineMutuallyCancelled", reached: true, unix: d.finalizedAt, tone: "warning" });
    return steps;
  }

  if (d.claimTimestamp > 0) {
    steps.push({
      key: "duel.timelineClaimed",
      reached: true,
      unix: d.claimTimestamp,
      tone: "warning",
    });
  }
  if (d.state === DuelState.Resolved) {
    steps.push({ key: "duel.timelineResolved", reached: true, unix: d.finalizedAt, tone: "success" });
  } else if (d.state === DuelState.Refunded) {
    steps.push({ key: "duel.timelineRefunded", reached: true, unix: d.finalizedAt, tone: "warning" });
  } else if (d.state === DuelState.Disputed) {
    steps.push({ key: "duel.timelineDisputed", reached: true, unix: d.finalizedAt, tone: "danger" });
  }

  return steps;
}
