import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Providers } from "@/components/providers/Providers";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "DuelMe — 1v1 TON Duels",
  description: "Stake TON, win or lose, no platform fees. Honor-based duels with on-chain reputation.",
  applicationName: "DuelMe",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg text-text antialiased">
        {/* Telegram WebApp bridge. Must load before any code reads window.Telegram. */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
