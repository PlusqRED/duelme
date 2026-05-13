# Security Model

## Wallets and signatures

- All write operations flow through TON Connect → the user's wallet. The Mini App never holds private keys.
- TON Connect manifest URL must be served from a public HTTPS origin (see `public/tonconnect-manifest.json` and `NEXT_PUBLIC_TONCONNECT_MANIFEST_URL`). The `url` field MUST match the live origin exactly — wallets reject mismatches.
- The Mini App never auto-confirms a transaction — every send opens the wallet UI.
- TON Connect `validUntil` is set to 10 minutes after build time — long enough for cold-cache wallets, short enough that stale payloads can't be replayed.

## Invite secrets

- `generateInvite()` uses `crypto.getRandomValues` to produce a 256-bit secret.
- Only `sha256(secret)` is published on-chain (as the duel's `inviteHash`, stored in `Cell<DuelMeta>`). The raw secret never leaves the client.
- The secret travels off-chain only via:
  - Telegram deep-link `startapp` parameter (delivered through Telegram's bridge).
  - URL fragment (`#invite=...`) — fragments never reach servers / referrers.
- The Share dialog warns the user not to publish the link.
- The Created → Cancelled path is exposed in the UI so the creator can invalidate a leaked link by cancelling the duel and getting their wager refunded.

## Smart contract guarantees

- Native TON staking — no token approval flow, no jetton dependencies.
- Pull-based payouts (`claimPayout`) keep terminal flows immune to misbehaving wallets. Refunds and prize payouts both flow through the player explicitly draining their `creatorPayout` / `opponentPayout` slot.
- All state-mutating handlers gate on `assertNotPaused`. Owner can pause but funds cannot move outside the duel lifecycle without a 30-day emergency timelock.
- Duel state transitions are exhaustively validated; the catch-all branch in `onInternalMessage` throws `0xFFFF` on unknown opcodes.
- The contract uses bounceable outbound messages so failed payouts roll back the `claimed` flag on receipt of the bounce.
- `Duel` storage is split across three sibling cells (`Duel`, `Cell<DuelClaim>`, `Cell<DuelMeta>`) to remain under TVM's 1023-bit budget and keep auto-serialization sound for every state.

## Frontend hardening

- TypeScript strict mode — `noImplicitAny`, `noUncheckedIndexedAccess`.
- ESLint blocks raw `any`.
- All user-provided input is validated client-side (duel message length / UTF-8 codepoints, wager amount) before being forwarded to the wallet.
- The TON Connect manifest is loaded by URL, never inlined.
- The Mini App ships strict CSP with explicit allow-lists for `script-src`, `connect-src`, `img-src`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors` limited to `web.telegram.org` / `*.telegram.org`.
- Additional security headers: HSTS (via Caddy), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera / mic / geolocation.
- No third-party analytics or remote scripts beyond the Telegram WebApp bridge.
- `next.config.ts` disables `X-Powered-By` to reduce server fingerprinting.

## Container hardening

- Image runs as a non-root `app` user.
- Filesystem mounted `read_only`, `/tmp` as size-capped `tmpfs`.
- `cap_drop: ALL`, `security_opt: no-new-privileges:true`.
- Resource caps: 256 MB RAM, 0.5 CPU, 128 pids.
- Healthcheck on port 3015.

## Reporting

Open a confidential issue with the project maintainers. Do **not** post invite secrets or wallet seed phrases in public issues.
