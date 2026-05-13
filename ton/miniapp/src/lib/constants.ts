// Runtime configuration read from `NEXT_PUBLIC_*` env vars.
//
// The env-derived `config` object is built lazily so vitest unit tests can
// import compile-time constants (e.g. `MAX_MESSAGE_BYTES`) without forcing
// every test setup to populate a full .env.local. Accessing any `config.*`
// property in a context without the required env vars throws — the call
// sites (TON client, share builder, contracts wrapper) all live behind such
// boundaries already.

export type TonNetwork = "mainnet" | "testnet";

// ─── Protocol-level constants (pure values, safe to import anywhere) ──────

export const MAX_MESSAGE_CODEPOINTS = 32;
export const MAX_MESSAGE_BYTES = 128;
export const CLAIM_TIMEOUT_SEC = 3600;
export const DEFAULT_WAGER_TON = "5";
export const MIN_WAGER_TON_DISPLAY = "1";

// ─── Lazy runtime config ──────────────────────────────────────────────────

interface RuntimeConfig {
  network: TonNetwork;
  duelMeAddress: string;
  toncenterUrl: string;
  toncenterApiKey: string;
  tonconnectManifestUrl: string;
  botUsername: string;
  appShortName: string;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env.local`);
  }
  return value;
}

function optional(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}

function readConfig(): RuntimeConfig {
  const network: TonNetwork =
    (process.env.NEXT_PUBLIC_TON_NETWORK as TonNetwork | undefined) ?? "testnet";

  return {
    network,
    duelMeAddress: required("NEXT_PUBLIC_DUELME_ADDRESS", process.env.NEXT_PUBLIC_DUELME_ADDRESS),
    toncenterUrl: optional(
      process.env.NEXT_PUBLIC_TONCENTER_URL,
      network === "mainnet"
        ? "https://toncenter.com/api/v2/jsonRPC"
        : "https://testnet.toncenter.com/api/v2/jsonRPC",
    ),
    toncenterApiKey: process.env.NEXT_PUBLIC_TONCENTER_API_KEY ?? "",
    tonconnectManifestUrl: optional(
      process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL,
      typeof window !== "undefined"
        ? `${window.location.origin}/tonconnect-manifest.json`
        : "/tonconnect-manifest.json",
    ),
    botUsername: optional(process.env.NEXT_PUBLIC_TG_BOT_USERNAME, "duelme_bot"),
    appShortName: optional(process.env.NEXT_PUBLIC_TG_APP_SHORT_NAME, "play"),
  };
}

// Proxy returns a fresh `RuntimeConfig` on first access but cached after.
let cached: RuntimeConfig | null = null;
export const config: RuntimeConfig = new Proxy({} as RuntimeConfig, {
  get(_target, key: string) {
    cached ??= readConfig();
    return cached[key as keyof RuntimeConfig];
  },
});

export function getTonviewerBase(): string {
  return config.network === "mainnet"
    ? "https://tonviewer.com"
    : "https://testnet.tonviewer.com";
}
