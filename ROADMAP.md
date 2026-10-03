# DuelMe Platform Roadmap

**Date:** 2026-03-30
**Status:** Approved — this document is the plan as it was approved, kept as written. What has
actually shipped since is below.

## Shipped since (as of 2026-09-20)

| Phase | State |
|---|---|
| 1 — Game catalog + duel metadata | **Done.** `games` and `duelMeta` collections, `/games` and `/games/[slug]`, duels tagged by game |
| 2 — Leaderboard + search | **Partly.** Search shipped across the dashboard, the open lobby and the recent feed. No event indexer and no leaderboard: listing screens read the contract directly, in pages |
| 3 — Boss Fight | Not started. No `BossFight.sol` |
| 4 — Design refresh | **Partly.** The landing, duel and dashboard screens were reworked; not tracked against the item list below |
| 5 — Social + bridge + languages | **Partly.** Steam, Telegram and Instagram links shipped; EN/RU shipped. No bridge/swap widget |
| 6 — NFT badges + mainnet | **Partly.** Deployed to Arbitrum One. No `DuelMeBadges.sol` |

Two things arrived that this plan did not anticipate: gasless play (ERC-2771 relayer plus
EIP-2612 permits, so a player needs no ETH), and open and address-bound duels beside private
invite links. A TON/Telegram sibling app was also prototyped under `ton/` and removed in
October 2026.

## Context

DuelMe is a P2P gaming duel platform where players wager USDT in 1v1 duels on Arbitrum. The core duel mechanic works (smart contract, frontend, backend profiles), but the platform lacks game discovery, social features, and a streamer-focused mode that would differentiate it from competitors.

The goal: make the platform useful for two audiences simultaneously — casual gamers who want to find opponents and duel for money, and streamers who want interactive audience engagement through "Boss Fight" duels.

## Current State

_As of 2026-03-30, when this plan was written. See "Shipped since" above for where things stand now._

- Smart contract: full duel lifecycle, reputation (Wilson Score), pull-based payouts, mutual cancellation
- Frontend: landing, duel creation, duel detail, dashboard, profiles with game tags
- Backend: profiles in MongoDB, Privy JWT auth
- Deployed on Arbitrum Sepolia (testnet only)
- Games are free-form tags in profiles (no structure, no catalog)
- No leaderboard, no streamer features, no bridge, no social connections

---

## Phase 1: Game Catalog + Duel Metadata

**Goal:** Players see what games people duel in and can find their game.

### Backend

New MongoDB collections:

**`games`** collection:
- `slug` (string, unique) — URL-friendly identifier (e.g., "cs2", "valorant")
- `name` (string) — display name
- `iconUrl` (string, optional) — game icon
- `category` (enum: FPS, MOBA, Sport, Strategy, Fighting, Racing, Card, Other)
- `duelCount` (int) — cached count of duels in this game
- `totalVolume` (bigint) — cached total USDT volume
- `createdAt`, `updatedAt` — timestamps

**`duelMeta`** collection:
- `duelId` (uint256) — on-chain duel ID
- `chainId` (int) — chain where the duel was created
- `gameSlug` (string) — reference to games collection
- `creatorAddress` (string) — wallet of duel creator
- `createdAt` — timestamp

New API endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/games` | Public | List games, filter by category, search by name |
| GET | `/api/v1/games/{slug}` | Public | Game details with stats |
| POST | `/api/v1/duels/{duelId}/meta?chainId=&contractAddress=` | Auth | Attach game to a duel (called during duel creation) |
| GET | `/api/v1/duels/{duelId}/meta?chainId=&contractAddress=` | Public | Get duel metadata |
| GET | `/api/v1/duels/meta?gameSlug=cs2&chainId=&contractAddress=` | Public | List duels by game |
| GET | `/api/v1/duels/meta/batch?chainId=&contractAddress=&duelIds=` | Public | Batch duel metadata (max 200 ids) |

Every duel-metadata route takes `contractAddress` as well as `chainId`: duel ids restart at zero
on a redeploy, so the pair alone names a different duel under a different deployment.

Games are auto-created when a user types a new game name during duel creation. The `duelCount` and `totalVolume` fields are 0 until the indexer (Phase 2) is built — this is acceptable for Phase 1 since catalog is primarily for discovery and navigation.

### Frontend

- **Create Duel form:** new "Game" field — autocomplete searching the games API. If no match, creates new game on submit.
- **`/games` page:** grid of game cards (icon, name, duel count, volume). Filter by category. Search.
- **`/games/{slug}` page:** game detail — recent duels in this game, top players for this game.
- **Recent Duels feed + Dashboard:** game badge on each duel card.
- **Landing:** "Popular Games" section showing top 5 games by activity.

### Smart Contract

No changes. Game is off-chain metadata linked to on-chain `duelId`.

---

## Phase 2: Leaderboard + Search

**Goal:** Players see rankings, find opponents, newcomers understand the scale of activity.

### Backend: Event Indexer

A new backend component that listens to on-chain events and stores statistics in MongoDB.

**`playerStats`** collection (indexed):
- `walletAddress` (string, unique)
- `chainId` (int)
- `wins` (int) — from `DuelResolved` events
- `losses` (int) — from `DuelResolved` events
- `draws` (int) — from `DuelDisputed` / `DuelRefunded`
- `totalWagered` (bigint) — sum of all wager amounts
- `totalWon` (bigint) — sum of all payouts
- `duelsHonored` (int) — from on-chain `getPlayerStats`
- `duelsAbandoned` (int) — from on-chain `getPlayerStats`
- `gameStats` (map: gameSlug -> {wins, losses, wagered})
- `lastActive` (timestamp)
- `updatedAt` (timestamp)

**Indexer implementation:**
- Java service using web3j to subscribe to contract events
- Processes DuelMe events: `DuelCreated`, `DuelJoined`, `DuelResolved`, `DuelRefunded`, `DuelDisputed`, `DuelCancelled`, `DuelDeclined`, `DuelMutuallyCancelled`
- After Phase 3: also indexes BossFight events for leaderboard inclusion
- Stores last processed block number for crash recovery
- Backfills historical events on first run

New API endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/leaderboard/players` | Public | Player rankings. Query params: `game`, `sort` (winrate/wins/volume/reputation), `limit`, `offset` |
| GET | `/api/v1/leaderboard/games` | Public | Game rankings. Query params: `sort` (duels/volume), `limit` |
| GET | `/api/v1/search` | Public | Full-text search across games, players (nicknames), duels |

Leaderboards are cached and refreshed every 5 minutes.

### Frontend

- **`/leaderboard` page:** two tabs:
  - **Players:** table with avatar, nickname, winrate, duel count, volume, reputation. Filter by game.
  - **Games:** cards with icon, name, duel count, volume, weekly growth.
- **Global search in header** — searches games, players, duels. Dropdown with categorized results.
- **Landing:** "Top Players" section with mini-leaderboard (top 5).

---

## Phase 3: Boss Fight

**Goal:** Streamers create "Boss Fight" duels where viewers pay USDT to enter a weighted lottery. The wheel picks one challenger. If the challenger wins, they get a percentage of the pool.

### Smart Contract (BossFight.sol)

Separate contract from DuelMe.sol.

**BossFight struct:**
```
struct BossFight {
    address boss;                // streamer
    uint256 minEntry;            // minimum USDT to enter
    uint16 winnerRewardBps;      // % of pool to winner (basis points, 0-10000)
    uint256 deadline;            // timestamp when entries close (0 = manual)
    BossFightState state;        // Open, SpinReady, Active, BossWon, ChallengerWon, Cancelled
    address selectedChallenger;  // chosen by backend random
    uint256 totalPool;           // sum of all entries
    uint256 bossPayoutAmount;    // calculated payout for boss
    uint256 challengerPayoutAmount; // calculated payout for challenger
    bool bossClaimed;
    bool challengerClaimed;
    uint256 createdAt;
    uint256 resolvedAt;
}
```

**Entry tracking:** `mapping(uint256 => Entry[]) entries` where `Entry = {address player, uint256 amount}`

**State machine:**
```
Open → SpinReady → Active → BossWon / ChallengerWon
Open → Cancelled
SpinReady → Cancelled
```

**Key functions:**
- `createBossFight(minEntry, winnerRewardBps, deadline)` — streamer creates
- `enter(uint256 bossFightId, uint256 amount)` — viewer enters with USDT
- `closeBetting(uint256 bossFightId)` — boss manually closes (or auto at deadline). State → SpinReady
- `selectChallenger(uint256 bossFightId, address challenger)` — called by operator (backend) after random selection. State → Active
- `resolveAsBossWin(uint256 bossFightId)` — boss won. 100% pool to boss
- `resolveAsChallengerWin(uint256 bossFightId)` — challenger won. `winnerRewardBps%` to challenger, rest to boss
- `cancel(uint256 bossFightId)` — cancel, refund all entries
- `claimPayout(uint256 bossFightId)` — pull-based claim for boss or challenger
- `claimRefund(uint256 bossFightId)` — non-selected entries can claim refund after resolution (BossWon/ChallengerWon/Cancelled)

**Operator role:** address authorized to call `selectChallenger`. Set by contract owner. This is the backend's signing wallet.

**Minimum participants:** Boss Fight requires at least 2 entries before betting can close. If deadline passes with <2 entries, boss or anyone can cancel for full refunds.

**Timeout safety:** If boss doesn't report result within 24 hours after `selectChallenger`, anyone can call `refundAll()` — returns all entries (including challenger's) and cancels the fight.

**Payout distribution (on resolution):**
- Boss wins: `bossPayoutAmount = totalPool`, `challengerPayoutAmount = 0`
- Challenger wins: `challengerPayoutAmount = totalPool * winnerRewardBps / 10000`, `bossPayoutAmount = totalPool - challengerPayoutAmount`
- Non-selected entries: full refund (claimable after resolution — BossWon or ChallengerWon state)

### Backend

New endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/boss-fights` | Auth | Create boss fight (+ game metadata) |
| GET | `/api/v1/boss-fights` | Public | List active boss fights |
| GET | `/api/v1/boss-fights/{id}` | Public | Boss fight details |
| POST | `/api/v1/boss-fights/{id}/spin` | Auth (boss only) | Trigger random selection |
| POST | `/api/v1/boss-fights/{id}/resolve` | Auth (boss only) | Report result |

**Random selection (`/spin`):**
- Java `SecureRandom` with weighted probability
- Weight of each entry = their USDT amount / totalPool
- Result: selected address
- Backend calls `selectChallenger()` on-chain via operator wallet
- Response includes the selected address for UI animation

**Operator wallet:**
- Backend holds a private key for the operator role
- Used only for `selectChallenger()` calls
- Funded with minimal ETH for gas

### Frontend

- **`/boss-fight/create`** — form: minimum entry, winner reward %, timer duration (optional), game
- **`/boss-fight/{id}`** — Boss Fight page:
  - Boss profile card (streamer info)
  - Live pool total with animation
  - Entry list (address/nickname, amount, % chance)
  - Timer countdown (if set)
  - "Enter" button with amount input
  - **Spin wheel** — animated wheel with sectors proportional to entry amounts
  - Post-spin: VS screen (boss vs challenger)
  - Result screen: who won, payout breakdown
  - Claim buttons for boss, challenger, and non-selected entries
- **Landing:** "Live Boss Fights" section
- **Header:** Boss Fight navigation link

---

## Phase 4: Design Refresh

**Goal:** Unique visual identity — minimalism with interesting typography and geometric shapes.

### Typography
- Display font for headings: geometric sans-serif with character (e.g., Space Grotesk, Clash Display, Cabinet Grotesk)
- Body font: Inter or Plus Jakarta Sans
- Large headline sizes (hero h1: 80-120px), strong size contrast between hierarchy levels

### Shapes & Geometry
- Cards with non-standard shapes: clipped corners (CSS `clip-path`), asymmetric border-radius
- Decorative background elements: diagonal lines, geometric shapes
- Buttons: beveled edges, gradient accents, micro-animations on hover

### Color
- Dark theme (already in place, refine)
- Bold accent color — bright, recognizable
- More whitespace between sections

### Pages to Redesign
- Landing: hero with large typography, new sections for Boss Fight and game catalog
- Duel cards: new shape, game badge display
- Dashboard: updated stat grid
- Header: simplified navigation
- Profiles: visual refresh
- Boss Fight pages (already built in new style in Phase 3)

### Micro-interactions
- Page transitions (smooth)
- Data loading animations (skeleton screens)
- Card hover effects
- Number count-up animations for statistics

---

## Phase 5: Social Connections + Bridge + Languages

**Goal:** Easy player communication, smooth on-ramp, wider audience.

### OAuth Social Connections

**Steam:**
- Steam Web API (OpenID 2.0 → redirects to Steam login)
- Backend stores `steamId` + `steamDisplayName` in Profile
- Links to Steam profile from DuelMe profile

**Telegram:**
- Telegram Login Widget — button on profile page
- Validates via HMAC with bot token on backend
- Stores `telegramId` + `telegramUsername` in Profile

**Instagram:**
- Instagram Basic Display API (Meta OAuth)
- Stores `instagramUsername` in Profile
- Requires Meta app review (longer process)

**Profile model additions:**
```java
// Added to Profile record
String steamId,
String steamDisplayName,
String telegramId,
String telegramUsername,
String instagramUsername,
// Each has verified: true (set by OAuth flow)
```

**Backend endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/profiles/me/connections/steam` | Auth | Link Steam account (receives OAuth callback data) |
| DELETE | `/api/v1/profiles/me/connections/steam` | Auth | Unlink Steam |
| POST | `/api/v1/profiles/me/connections/telegram` | Auth | Link Telegram (receives widget data) |
| DELETE | `/api/v1/profiles/me/connections/telegram` | Auth | Unlink Telegram |
| POST | `/api/v1/profiles/me/connections/instagram` | Auth | Link Instagram (receives OAuth code) |
| DELETE | `/api/v1/profiles/me/connections/instagram` | Auth | Unlink Instagram |

**Frontend:**
- Profile edit: "Connections" section with Steam/Telegram/Instagram buttons
- Each shows "Connect" or "Connected: @username" with verified badge
- Public profile: social icons with links, verified badges

### Bridge/Swap Widget

- Integrate **LI.FI Widget** (React component) or **Squid Router Widget**
- Configuration: destination chain = Arbitrum, destination token = USDT
- Placed in a modal accessible from:
  - Wallet dropdown: "Get USDT" button
  - Separate `/swap` page
- User sends any token from any chain → receives USDT on Arbitrum

### Languages

Add translations for:
- ES (Spanish)
- ZH (Chinese)
- DE (German)
- BY (Belarusian)

Update language selector in header. All Phase 1-4 features already have translation keys.

---

## Phase 6: NFT Badges + Mainnet

**Goal:** On-chain achievements for Boss Fight winners + launch with real money.

### NFT Contract (DuelMeBadges.sol)

ERC-721 with on-chain or IPFS metadata.

**Minted automatically** when a challenger wins a Boss Fight. BossFight.sol calls `DuelMeBadges.mint()` during `resolveAsChallengerWin()`.

**Metadata per badge:**
- `boss` — streamer wallet address
- `bossName` — streamer display name
- `game` — game played
- `pool` — total pool size (USDT)
- `date` — timestamp
- `image` — generated SVG or IPFS image

**Frontend:**
- Profile: "Achievements" section showing NFT badges
- Boss Fight page: badge preview for potential winners
- Badge detail page with full metadata

### Mainnet Deployment

1. **Security audit** of all contracts (DuelMe.sol, BossFight.sol, DuelMeBadges.sol)
2. **Deploy to Arbitrum One** — update `constants.ts` with real addresses
3. **Smoke test** with small real USDT amounts
4. **UI update:** remove testnet badge, add mainnet indicator
5. **Monitoring:** alerts for anomalous transactions, contract balance tracking

### Polish
- E2E testing of all flows
- Performance: lazy loading, code splitting, image optimization
- SEO: meta tags for games, profiles, Boss Fights
- Mobile responsive polish

---

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Game catalog storage | MongoDB (off-chain) | No contract change needed, flexible schema, easy search |
| Leaderboard data | Backend indexer + MongoDB | Multicall doesn't scale for sorting all players |
| Boss Fight contract | Separate from DuelMe.sol | Different mechanics (pool, multiple participants, percentages) |
| Boss Fight random | Backend (Java SecureRandom) | Simpler than VRF, no Chainlink dependency/cost |
| Boss Fight payout model | % set by streamer, full pool if boss wins | Streamer controls economics, viewers accept terms |
| NFT badges | ERC-721 (transferable) | Tradeable achievements have more perceived value |
| Bridge | LI.FI Widget embed | Ready-made React component, multi-chain, no backend needed |
| Social verification | OAuth (Steam, Telegram, Instagram) | Verified connections build trust between players |
| Monetization | Flexible architecture, decide later | 0% commission is current USP, can add fees to Boss Fight later |

## File Impact Summary

### New Files
- `contracts/src/BossFight.sol` — Boss Fight contract
- `contracts/src/DuelMeBadges.sol` — NFT badge contract
- `contracts/test/BossFight.t.sol` — Boss Fight tests
- `contracts/test/DuelMeBadges.t.sol` — Badge tests
- `backend/src/.../model/Game.java` — Game document
- `backend/src/.../model/DuelMeta.java` — Duel metadata document
- `backend/src/.../model/PlayerStatsDoc.java` — Indexed player stats
- `backend/src/.../controller/GameController.java` — Game API
- `backend/src/.../controller/DuelMetaController.java` — Duel metadata API
- `backend/src/.../controller/LeaderboardController.java` — Leaderboard API
- `backend/src/.../controller/BossFightController.java` — Boss Fight API
- `backend/src/.../controller/ConnectionController.java` — Social connections API
- `backend/src/.../service/EventIndexerService.java` — On-chain event indexer
- `backend/src/.../service/BossFightService.java` — Boss Fight random + operator logic
- `frontend/src/app/games/page.tsx` — Games catalog page
- `frontend/src/app/games/[slug]/page.tsx` — Game detail page
- `frontend/src/app/leaderboard/page.tsx` — Leaderboard page
- `frontend/src/app/boss-fight/create/page.tsx` — Create Boss Fight
- `frontend/src/app/boss-fight/[id]/page.tsx` — Boss Fight detail
- `frontend/src/app/swap/page.tsx` — Bridge/swap page
- `frontend/src/components/boss-fight/SpinWheel.tsx` — Animated wheel
- `frontend/src/hooks/useBossFight.ts` — Boss Fight hook

### Modified Files
- `backend/src/.../model/Profile.java` — add social connection fields
- `backend/src/.../security/SecurityConfig.java` — new endpoint permissions
- `frontend/src/components/duel/CreateDuelForm.tsx` — add game field
- `frontend/src/components/duel/DuelCard.tsx` — add game badge
- `frontend/src/components/layout/Header.tsx` — add search, Boss Fight link
- `frontend/src/app/page.tsx` — add Popular Games, Top Players, Live Boss Fights sections
- `frontend/src/app/profile/page.tsx` — add connections, achievements
- `frontend/src/i18n/translations.ts` — all new keys + ES, ZH, DE, BY
- `frontend/src/lib/constants.ts` — mainnet contract addresses
- `frontend/src/lib/contracts.ts` — BossFight ABI + DuelMeBadges ABI
