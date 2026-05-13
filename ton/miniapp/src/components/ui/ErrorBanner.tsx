"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useTranslation } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  /** When falsy the banner is not rendered. */
  error: unknown;
  /** Optional retry hook, e.g. React Query's `refetch`. */
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({ error, onRetry, className }: ErrorBannerProps) {
  const { t } = useTranslation();
  if (!error) return null;
  const message = String((error as { message?: string })?.message ?? error);
  const rateLimited = /\b429\b|rate.?limit/i.test(message);
  return (
    <div
      role="status"
      className={cn(
        "glass flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs",
        className,
      )}
    >
      <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
      <span className="flex-1 text-warning/90">
        {rateLimited ? t("errors.rpcRateLimited") : t("errors.readFailed")}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-warning hover:bg-warning/25"
          aria-label={t("common.retry")}
        >
          <RotateCw className="size-3" aria-hidden />
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
