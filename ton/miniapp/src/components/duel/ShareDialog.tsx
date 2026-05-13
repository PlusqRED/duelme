"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, Send, ShieldAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/components/providers/I18nProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useTelegram } from "@/components/providers/TelegramProvider";
import { buildShareLinks } from "@/lib/share";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duelId: bigint;
  inviteSecret: bigint;
}

export function ShareDialog({ open, onOpenChange, duelId, inviteSecret }: ShareDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { share, haptic } = useTelegram();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // Caption from the current i18n bundle so wallet share cards localize.
  const caption = t("share.caption");
  const links = buildShareLinks({ duelId, inviteSecret, caption });

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl bg-surface p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 id="share-title" className="text-base font-semibold">
                  {t("share.title")}
                </h2>
                <p className="text-xs text-muted">{t("share.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="grid size-8 place-items-center rounded-full bg-elevated text-muted hover:text-text"
                aria-label={t("common.close")}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-elevated/70 p-3">
              <p className="break-all font-mono text-xs text-text/80">{links.telegram}</p>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{t("share.warning")}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="block"
                icon={<Copy className="size-4" />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(links.telegram);
                    haptic("success");
                    toast(t("share.copied"), { tone: "success" });
                    setCopied(true);
                    if (copyTimer.current !== null) {
                      window.clearTimeout(copyTimer.current);
                    }
                    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
                  } catch {
                    toast(t("errors.generic"), { tone: "error" });
                  }
                }}
              >
                {copied ? t("share.copied") : t("share.copyLink")}
              </Button>
              <Button
                variant="primary"
                size="block"
                icon={<Send className="size-4" />}
                onClick={() => {
                  share(links.telegram, caption);
                  haptic("light");
                }}
              >
                {t("share.openTelegram")}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
