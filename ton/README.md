# DuelMe — Telegram Mini App on TON

> 1v1 TON duels with on-chain reputation. Stake TON, declare a winner, settle on-chain. Zero platform fees, pull-based payouts, honor-based resolution with timeouts and disputes.

This subproject is the **TON / Telegram** sibling of the existing Ethereum-L2 `contracts/` + `frontend/` stack at the repo root. It mirrors the Solidity duel lifecycle exactly so reputation / UX surfaces are shared mentally between the two ecosystems.

```
ton/
├── contracts/        — Tolk smart contracts (Acton toolchain)
└── miniapp/          — Next.js 15 Telegram Mini App (TON Connect + telegram-apps SDK)
```

## Current deployment

| Network | Contract address |
|---------|------------------|
| TON testnet | `kQB6_odDlmzdmRaFLozfFuPRzT5A2XsKtIzt67yduhhCpPLX` ([Tonviewer](https://testnet.tonviewer.com/kQB6_odDlmzdmRaFLozfFuPRzT5A2XsKtIzt67yduhhCpPLX)) |

## High-level architecture

```
        Telegram Mini App  ──► TON Connect  ──► User wallet (Tonkeeper, …)
              │                                       │
              │   reads via Toncenter RPC             │  signs txns
              ▼                                       ▼
        DuelMe Tolk contract on TON  ◄────────────────┘
              │
              └── on-chain duel state, claimable payouts, reputation
```

- **Smart contract** lives in `ton/contracts/contracts/duelme.tolk`. Native TON staking. Single master contract that maintains a `map<uint64, Duel>` registry plus per-player reputation counters.
- **Mini App** lives in `ton/miniapp/`. Next.js 15 + Tailwind 3 + Framer Motion + `@tonconnect/ui-react`. The Telegram `WebApp` bridge is loaded as a `beforeInteractive` script so theme params, init data, and haptics are available from the first render

## Duel lifecycle (mirrors EVM `DuelMe.sol`)

```
Created(0) → Funded(1) → WinnerClaimed(2) → Resolved(3)
                                           → Refunded(4)
                                           → Disputed(7)
Funded(1) → MutualCancelRequested(8) → Funded(1)
                                     → MutuallyCancelled(9)
Created(0) → Cancelled(5)
           → Declined(6)
```

Payouts are pull-based: a state transition that should pay a player writes their `creatorPayout` or `opponentPayout` slot. The player drains it with `claimPayout` / `claimPayouts` (batch).

## Smart contract — `ton/contracts/`

Tooling: [Acton](https://ton-blockchain.github.io/acton/) (Rust CLI, includes Tolk compiler, test runner, deploy script runner). All operations:

```bash
cd ton/contracts

# Install Acton (one-time)
curl -LsSf https://github.com/ton-blockchain/acton/releases/latest/download/acton-installer.sh | sh

# Build & test
acton build           # compiles .tolk → TVM bytecode + TS wrappers
acton test            # runs `tests/*.test.tolk`
acton test --coverage # line + mutation coverage

# Deploy
acton wallet new --name deployer --local --version v5r1
acton script scripts/deploy.tolk --net testnet
acton script scripts/deploy.tolk --net mainnet
```

### Files

| File | Purpose |
|------|---------|
| `contracts/duelme.tolk` | Master contract: entrypoint, message dispatch, getters |
| `contracts/handlers.tolk` | One handler per opcode (create, join, claim, refund, mutual cancel, admin) |
| `contracts/storage.tolk` | `Storage`, `Duel`, `PlayerStats`, `EmergencyRequest` |
| `contracts/messages.tolk` | Incoming opcodes + bodies + outgoing event opcodes |
| `contracts/constants.tolk` | `MIN_WAGER = 1 TON`, `CLAIM_TIMEOUT_SEC = 3600`, `EMERGENCY_DELAY_SEC = 30 days`, `MAX_MESSAGE_*` |
| `contracts/errors.tolk` | Numeric error codes (400-range) |
| `contracts/utils.tolk` | `hashInviteSecret`, snake-cell UTF-8 validator |
| `tests/duelme.test.tolk` | Coverage targets per [CLAUDE.md](../../CLAUDE.md#testing-standards) |
| `scripts/deploy.tolk` | Acton deploy script |
| `wrappers/DuelMe.ts` | Hand-mirrored TypeScript wrapper used by the Mini App |
| `acton.toml` | Project manifest pinning the Tolk compiler |

### Security posture

- All state-mutating handlers throw on bad inputs (`assertNotPaused`, role checks, state checks). The dispatch's `else` branch throws `0xFFFF`.
- Pull-based payouts isolate refunds from rogue receivers. `onBouncedMessage` resets the `claimed` flag if a payout bounces.
- Owner emergency rescue is 30-day timelocked.
- `MIN_WAGER` and on-chain UTF-8 validation prevent dust spam.
- SHA-256 invite hash → only the player who holds the off-chain secret can join or decline. Anyone with the duel id alone cannot.

## Mini App — `ton/miniapp/`

```bash
cd ton/miniapp
cp .env.example .env.local        # fill in NEXT_PUBLIC_DUELME_ADDRESS and TG vars
npm install
npm run dev                       # localhost:3015
npm run dev:https                 # for testing inside Telegram
npm run typecheck && npm run lint
npm run test                      # vitest
npm run build && npm start        # production preview
```

### Telegram setup

1. **Bot.** Talk to [@BotFather](https://t.me/BotFather), `/newbot`. Save the username; put it in `NEXT_PUBLIC_TG_BOT_USERNAME`.
2. **Mini App.** `/newapp` (or `/myapps` → Edit Mini App). Choose a short name; put it in `NEXT_PUBLIC_TG_APP_SHORT_NAME` (e.g. `play`).
3. **Web URL.** Point the Mini App at your deployed HTTPS origin (Vercel, Cloudflare, your own Caddy reverse proxy).
4. **TON Connect manifest.** Edit `public/tonconnect-manifest.json` to match your live origin (the `url` field). Set `NEXT_PUBLIC_TONCONNECT_MANIFEST_URL` to its public HTTPS URL.

### Deep links

| URL | Behavior |
|-----|----------|
| `https://t.me/<bot>/<short>?startapp=<token>` | Opens the Mini App with `initData.start_param = token`. Used by Share dialog. |
| `https://<origin>/duel/<id>#invite=<token>` | Fallback for non-Telegram clients. The fragment never reaches a server. |
| `https://<origin>/duel/<id>` | Spectator view — no invite secret, only public state. |

### File map

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout, Telegram WebApp bridge, Providers |
| `src/app/page.tsx` | Home — hero + active duels + recent results |
| `src/app/create/page.tsx` | Create-duel flow with invite generation, signing, share sheet |
| `src/app/duel/[id]/page.tsx` | Single-duel view: header, actions, timeline, result banner |
| `src/app/my-duels/page.tsx` | Player history + claim-all rewards / refund-and-claim |
| `src/components/providers/Providers.tsx` | TON Connect + React Query + Telegram + i18n + Toaster |
| `src/components/duel/DuelActions.tsx` | State-aware action panel (join, claim, dispute, mutual cancel, claim payout) |
| `src/components/duel/ShareDialog.tsx` | Bottom-sheet share dialog with Telegram deep link |
| `src/components/duel/DuelTimeline.tsx` | Animated, colored timeline of state transitions |
| `src/components/duel/ClaimTimer.tsx` | 1-hour countdown for confirm/dispute window |
| `src/components/duel/ResultBanner.tsx` | Win / lose / neutral banner with confetti on victory |
| `src/lib/invite.ts` | Secure secret generation, SHA-256 invite hash, base64-url payload |
| `src/lib/ton/client.ts` | Toncenter HTTP client singleton |
| `src/lib/ton/contract.ts` | Hand-mirrored TS wrapper (opcodes, message builders, struct parsers) |
| `src/lib/ton/duelme.ts` | High-level reads + TON Connect message envelopes for every opcode |
| `src/lib/share.ts` | Telegram deep-link + fragment URL builder |
| `src/lib/duelMessage.ts` | Frontend mirror of the on-chain UTF-8 validator |
| `src/components/ui/ErrorBanner.tsx` | RPC error surface with retry button |

## Testing

```bash
# Contract — Tolk-native, hermetic, runs the TVM emulator in-process
cd ton/contracts
acton test --coverage

# Mini App — Vitest for lib/, Playwright for routing smoke tests
cd ton/miniapp
npm run test           # vitest
npm run build          # next build sanity check
npx playwright install chromium     # first time only
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3015 npx playwright test e2e/home.spec.ts
```

## Deployment

### Backend / contract

1. Generate a deployer wallet and fund it on TON testnet (or mainnet for prod).
2. Run `acton script scripts/deploy.tolk --net testnet` (or `--net mainnet`).
3. Copy the printed contract address into `ton/miniapp/.env.local` → `NEXT_PUBLIC_DUELME_ADDRESS`.

### Mini App

The Mini App is a vanilla Next.js 15 app. Two deployment shapes:

- **Vercel / Cloudflare Pages** — point `vercel deploy` at `ton/miniapp/`, set env vars in the dashboard.
- **Self-hosted Docker** — same `Dockerfile` recipe as the main `frontend/`. Bind to port 3015 behind a Caddy site that handles TLS.

Make sure the deployment URL matches `tonconnect-manifest.json` *exactly* (scheme + host). TON Connect rejects mismatches.

## Compatibility notes

- The Tolk syntax targets Acton's pinned Tolk compiler (see `Acton.toml`'s `[toolchain]` block). If a future release renames any builtin, surface it in `errors.tolk` / `utils.tolk` first — those files concentrate every primitive call.
- The on-chain `Duel` struct is split across three sibling cells (`Duel` essentials + `Cell<DuelClaim>` + `Cell<DuelMeta>`) to stay under TVM's 1023-bit budget. Any change to `storage.tolk` MUST be mirrored in `miniapp/src/lib/ton/contract.ts` (`parseDuelTuple`, `parseDuelClaim`, `parseDuelMeta`).
- Acton emits a Tolk wrapper for tests at `contracts/wrappers/Duelme.gen.tolk`; the Mini App ships a hand-mirrored TypeScript wrapper at `miniapp/src/lib/ton/contract.ts`. Both must stay in lockstep with `messages.tolk` opcodes.
- Native TON has no token allowance step; the wager flows in the same message as the action. The contract reserves `STORAGE_RESERVE = 0.05 TON` from the create-duel value to cover its own storage rent.

## See also

- [TON Tolk language docs](https://docs.ton.org/tolk/overview)
- [Acton toolchain](https://ton-blockchain.github.io/acton/)
- [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/overview)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Project root CLAUDE.md](../CLAUDE.md) — coding conventions, testing standards, security expectations
