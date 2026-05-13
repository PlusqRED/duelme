"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useMemo, useState, type ReactNode } from "react";
import { config } from "@/lib/constants";
import { I18nProvider, pickLocale } from "./I18nProvider";
import { TelegramProvider, useTelegram } from "./TelegramProvider";
import { ToastProvider } from "./ToastProvider";

function LocaleBridge({ children }: { children: ReactNode }) {
  const { user } = useTelegram();
  const locale = pickLocale(user?.language_code);
  return <I18nProvider initialLocale={locale}>{children}</I18nProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchInterval: 10_000,
            refetchOnWindowFocus: true,
            retry: 2,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  const manifestUrl = useMemo(() => config.tonconnectManifestUrl, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <TelegramProvider>
          <LocaleBridge>
            <ToastProvider>{children}</ToastProvider>
          </LocaleBridge>
        </TelegramProvider>
      </TonConnectUIProvider>
    </QueryClientProvider>
  );
}
