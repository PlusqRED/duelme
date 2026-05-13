"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { useTelegram } from "@/components/providers/TelegramProvider";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { webApp } = useTelegram();

  // Surface a Telegram back button on every non-home route. Tapping it goes
  // history.back() so deep links still work as expected.
  useEffect(() => {
    if (!webApp) return;
    if (pathname && pathname !== "/") {
      webApp.BackButton.show();
      const handler = () => window.history.back();
      webApp.BackButton.onClick(handler);
      return () => {
        webApp.BackButton.offClick(handler);
        webApp.BackButton.hide();
      };
    }
    webApp.BackButton.hide();
  }, [pathname, webApp]);

  return (
    <div className="duel-grid-bg min-h-screen pb-28">
      <Header />
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-md px-4 py-3"
      >
        {children}
      </motion.main>
      <BottomNav />
    </div>
  );
}
