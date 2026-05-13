"use client";

import { motion } from "framer-motion";
import { Home, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/components/providers/I18nProvider";
import { useTelegram } from "@/components/providers/TelegramProvider";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { haptic } = useTelegram();

  const items = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/create", icon: Plus, label: t("nav.create"), highlight: true },
    { href: "/my-duels", icon: Trophy, label: t("nav.myDuels") },
  ];

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass pointer-events-auto mx-auto flex max-w-md items-stretch justify-around gap-1 rounded-2xl px-2 py-1.5 shadow-card">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => haptic("selection")}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors",
                active ? "text-text" : "text-muted",
                item.highlight && "text-primary",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active-bg"
                  className="absolute inset-0 -z-10 rounded-xl bg-elevated"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn("size-5", item.highlight && active && "text-primary-fg")} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}
