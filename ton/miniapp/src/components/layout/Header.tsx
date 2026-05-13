"use client";

import { TonConnectButton } from "@tonconnect/ui-react";
import { useTranslation } from "@/components/providers/I18nProvider";

export function Header() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 px-4 pb-2 pt-3">
      <div className="glass flex items-center justify-between rounded-2xl px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-fg">
            <span className="text-base font-extrabold">D</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{t("appName")}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">{t("tagline")}</p>
          </div>
        </div>
        <TonConnectButton />
      </div>
    </header>
  );
}
