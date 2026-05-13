import type { NextConfig } from "next";

// Allowed origins for outbound traffic from the Mini App. Tighter than `https:`
// to limit the blast radius of an XSS while still allowing the wallet bridges
// and Toncenter RPC.
const CONNECT_SRC = [
  "'self'",
  "https://*.toncenter.com",
  "https://testnet.toncenter.com",
  "https://toncenter.com",
  "https://bridge.tonapi.io",
  "https://*.tonapi.io",
  "wss://bridge.tonapi.io",
  "wss://*.tonapi.io",
  "https://*.tonconnect.org",
  "wss://*.tonconnect.org",
  "https://api.telegram.org",
  "https://oauth.telegram.org",
].join(" ");

const IMG_SRC = [
  "'self'",
  "data:",
  "blob:",
  "https://wallet.tg",
  "https://ton.org",
  "https://*.tonconnect.org",
  "https://*.telegram.org",
  "https://t.me",
].join(" ");

// Next.js App Router uses inline scripts for hydration; `unsafe-inline` is
// unavoidable without nonces (which the App Router doesn't expose yet).
// `unsafe-eval` is required by `@ton/core` BoC parsing and some lazy chunks.
const SCRIPT_SRC = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "https://telegram.org",
  "https://*.telegram.org",
].join(" ");

const config: NextConfig = {
  output: "standalone",
  // Telegram Mini Apps render inside an iframe under the Telegram client,
  // so `frame-ancestors` rather than `X-Frame-Options` does the gatekeeping.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `img-src ${IMG_SRC}`,
              `script-src ${SCRIPT_SRC}`,
              `connect-src ${CONNECT_SRC}`,
              "style-src 'self' 'unsafe-inline'",
              "frame-ancestors https://web.telegram.org https://*.telegram.org",
              "font-src 'self' data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  reactStrictMode: true,
  // Telegram tries to scrape og:image and similar; standalone output already
  // doesn't ship next/image optimization. Reduce bundle size noise.
  poweredByHeader: false,
};

export default config;
