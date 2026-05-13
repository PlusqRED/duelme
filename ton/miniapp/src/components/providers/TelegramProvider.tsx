"use client";

// Minimal Telegram WebApp adapter.
//
// We avoid importing the full `@telegram-apps/sdk-react` initialization here
// because:
//   * The SDK requires the Mini App to be served via Telegram's iframe
//     bootstrap and crashes in plain browsers.
//   * We only need a handful of features (theme params, init data, haptics,
//     main button, share helpers). Reading them directly off `window.Telegram`
//     keeps the desktop dev experience friendly and trims the bundle.
//
// When the app is opened outside Telegram, this provider yields a safe inert
// snapshot so all consumers stay null-safe.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    start_param?: string;
    auth_date?: number;
    hash?: string;
  };
  themeParams: Record<string, string>;
  colorScheme: "light" | "dark";
  platform: string;
  version: string;
  isExpanded: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  MainButton: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  openLink: (url: string, opts?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  shareToStory?: (mediaUrl: string, opts?: { text?: string }) => void;
  showAlert: (msg: string, cb?: () => void) => void;
  showPopup: (
    params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: "default" | "ok" | "close" | "cancel" | "destructive"; text?: string }> },
    cb?: (buttonId: string) => void,
  ) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

interface TelegramContextValue {
  webApp: TelegramWebApp | null;
  user: TelegramUser | null;
  startParam: string | null;
  isInsideTelegram: boolean;
  haptic: (
    kind: "selection" | "light" | "medium" | "heavy" | "success" | "error" | "warning",
  ) => void;
  share: (url: string, text?: string) => void;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const w = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    if (!w) return;
    w.ready();
    w.expand();
    // Apply Telegram theme to CSS variables so Tailwind picks them up.
    const tp = w.themeParams ?? {};
    const root = document.documentElement;
    for (const [k, v] of Object.entries(tp)) {
      root.style.setProperty(`--tg-theme-${k.replace(/_/g, "-")}`, v);
    }
    setWebApp(w);
  }, []);

  const haptic = useCallback<TelegramContextValue["haptic"]>(
    (kind) => {
      const h = webApp?.HapticFeedback;
      if (!h) return;
      switch (kind) {
        case "selection":
          h.selectionChanged();
          break;
        case "light":
        case "medium":
        case "heavy":
          h.impactOccurred(kind);
          break;
        case "success":
        case "error":
        case "warning":
          h.notificationOccurred(kind);
          break;
      }
    },
    [webApp],
  );

  const share = useCallback<TelegramContextValue["share"]>(
    (url, text) => {
      if (!webApp) {
        if (navigator.share) {
          void navigator.share({ url, text });
          return;
        }
        void navigator.clipboard?.writeText(url);
        return;
      }
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}${
        text ? `&text=${encodeURIComponent(text)}` : ""
      }`;
      webApp.openTelegramLink(tgUrl);
    },
    [webApp],
  );

  const value = useMemo<TelegramContextValue>(
    () => ({
      webApp,
      user: webApp?.initDataUnsafe.user ?? null,
      startParam: webApp?.initDataUnsafe.start_param ?? null,
      isInsideTelegram: webApp != null,
      haptic,
      share,
    }),
    [webApp, haptic, share],
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export function useTelegram(): TelegramContextValue {
  const ctx = useContext(TelegramContext);
  if (!ctx) {
    throw new Error("useTelegram must be used inside <TelegramProvider>");
  }
  return ctx;
}
