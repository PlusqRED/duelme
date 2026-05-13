"use client";

import { Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { useTelegram } from "@/components/providers/TelegramProvider";
import { useTranslation } from "@/components/providers/I18nProvider";
import { shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Address } from "@ton/core";

interface AddressPillProps {
  address: Address | string;
  emphasis?: boolean;
  className?: string;
  prefix?: string;
}

export function AddressPill({ address, emphasis, className, prefix }: AddressPillProps) {
  const str = typeof address === "string" ? address : address.toString();
  const short = shortenAddress(str);
  const { toast } = useToast();
  const { haptic } = useTelegram();
  const { t } = useTranslation();
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pulseTimer.current !== null) {
        window.clearTimeout(pulseTimer.current);
      }
    };
  }, []);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(str);
          haptic("selection");
          toast(t("common.copied"), { tone: "info", durationMs: 1500 });
          setPulse(true);
          if (pulseTimer.current !== null) {
            window.clearTimeout(pulseTimer.current);
          }
          pulseTimer.current = window.setTimeout(() => setPulse(false), 420);
        } catch {
          /* clipboard rejected (denied permission, insecure context) — fail silently */
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 font-mono text-xs",
        emphasis ? "bg-primary/10 text-primary" : "bg-elevated/50 text-text/90",
        pulse && "ring-2 ring-primary/40",
        className,
      )}
      aria-label={`Copy address ${str}`}
    >
      {prefix && <span className="font-sans text-[10px] uppercase text-muted">{prefix}</span>}
      <span>{short}</span>
      <Copy className="size-3 text-muted" aria-hidden />
    </button>
  );
}
