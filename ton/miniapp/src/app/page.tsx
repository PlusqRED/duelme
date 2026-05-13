"use client";

import { motion } from "framer-motion";
import { Plus, Swords } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { DuelCard, DuelCardSkeleton } from "@/components/duel/DuelCard";
import { useTranslation } from "@/components/providers/I18nProvider";
import { useDuelList } from "@/hooks/useDuelList";
import { useWallet } from "@/hooks/useWallet";
import { DuelState } from "@/lib/ton/duelme";
import { DEFAULT_WAGER_TON } from "@/lib/constants";

export default function HomePage() {
  const { t } = useTranslation();
  const { isConnected, openWallet } = useWallet();

  const activeQuery = useDuelList({
    states: [DuelState.Created, DuelState.Funded, DuelState.WinnerClaimed, DuelState.MutualCancelRequested],
    scanLimit: 30,
  });
  const recentQuery = useDuelList({
    states: [DuelState.Resolved, DuelState.Refunded, DuelState.Disputed, DuelState.MutuallyCancelled],
    scanLimit: 20,
  });

  return (
    <div className="space-y-6">
      <Hero connected={isConnected} onConnect={openWallet} />

      <section>
        <header className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-text">{t("home.sectionActive")}</h2>
          <Link href="/create" className="text-xs text-link">
            {t("home.ctaCreate")} →
          </Link>
        </header>
        <ErrorBanner
          error={activeQuery.isError ? activeQuery.error : null}
          onRetry={() => activeQuery.refetch()}
          className="mb-3"
        />
        {activeQuery.isLoading && (
          <div className="space-y-3">
            <DuelCardSkeleton />
            <DuelCardSkeleton />
          </div>
        )}
        {!activeQuery.isLoading && !activeQuery.isError && activeQuery.data?.length === 0 && (
          <EmptyState message={t("home.emptyActive")} />
        )}
        <div className="space-y-3">
          {activeQuery.data?.map((d) => <DuelCard key={d.id.toString()} duel={d} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-text">{t("home.sectionRecent")}</h2>
        <ErrorBanner
          error={recentQuery.isError ? recentQuery.error : null}
          onRetry={() => recentQuery.refetch()}
          className="mb-3"
        />
        {recentQuery.isLoading && <DuelCardSkeleton />}
        {!recentQuery.isLoading && !recentQuery.isError && recentQuery.data?.length === 0 && (
          <EmptyState message={t("home.empty")} />
        )}
        <div className="space-y-3">
          {recentQuery.data?.map((d) => <DuelCard key={d.id.toString()} duel={d} />)}
        </div>
      </section>
    </div>
  );
}

function Hero({ connected, onConnect }: { connected: boolean; onConnect: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="glass relative overflow-hidden rounded-2xl p-5"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-gradient-to-br from-primary/40 to-accent/20 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-wider text-link">{t("appName")}</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">{t("home.hero")}</h1>
        <p className="mt-2 text-sm text-muted">{t("home.heroSub")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {connected ? (
            <Link href="/create" className="contents">
              <Button size="lg" icon={<Plus className="size-4" />}>
                {t("home.ctaCreate")}
              </Button>
            </Link>
          ) : (
            <Button size="lg" icon={<Swords className="size-4" />} onClick={onConnect}>
              {t("home.ctaConnect")}
            </Button>
          )}
          <p className="text-xs text-muted">
            min&nbsp;<span className="font-mono">{DEFAULT_WAGER_TON} TON</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-8 text-center">
      <Swords className="mx-auto mb-2 size-6 text-muted" aria-hidden />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
