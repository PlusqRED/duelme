"use client";

import { motion } from "framer-motion";
import { Hourglass } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "@/components/providers/I18nProvider";
import { CLAIM_TIMEOUT_SEC } from "@/lib/constants";
import { countdown } from "@/lib/format";

export function ClaimTimer({ claimTimestamp }: { claimTimestamp: number }) {
  const { t } = useTranslation();
  const target = claimTimestamp + CLAIM_TIMEOUT_SEC;
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = target - now;
  const expired = remaining <= 0;
  const total = CLAIM_TIMEOUT_SEC;
  const progress = Math.max(0, Math.min(1, remaining / total));

  return (
    <div className="glass space-y-2 rounded-2xl p-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Hourglass className="size-3" aria-hidden />
          {expired ? t("duel.claimTimerExpired") : t("duel.claimTimerLabel")}
        </span>
        <span className={`font-mono text-sm ${expired ? "text-danger" : "text-text"}`}>
          {countdown(target, now)}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-elevated">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${expired ? "bg-danger" : "bg-primary"}`}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
