# Public Duels Design Spec

## Problem

All duels are currently private — they require a secret invite link to join or decline. There is no way for a player to browse open challenges and jump in. This limits discoverability and platform activity.

## Goal

Add public duels that anyone can find and join, without changing the deployed smart contract.

## Approach: Well-Known Secret

A hardcoded constant `PUBLIC_INVITE_SECRET` (32 bytes, e.g. `0x0000...0001`) is known to all frontend clients. Its keccak256 hash becomes `PUBLIC_INVITE_HASH`.

- **Create public duel**: call `createDuel(amount, PUBLIC_INVITE_HASH)` — contract stores the hash as usual
- **Join public duel**: call `joinDuel(duelId, PUBLIC_INVITE_SECRET)` — hash matches, contract accepts
- **Detect type**: `duel.inviteHash === PUBLIC_INVITE_HASH` → public, otherwise private
- **Zero contract changes** — works with the current deployed contract

### Utility (`frontend/src/lib/invite.ts`)

```typescript
export const PUBLIC_INVITE_SECRET: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000001';
export const PUBLIC_INVITE_HASH: `0x${string}` = keccak256(PUBLIC_INVITE_SECRET);

export function isPublicDuel(inviteHash: `0x${string}`): boolean {
  return inviteHash.toLowerCase() === PUBLIC_INVITE_HASH.toLowerCase();
}
```

---

## Feature: Create Duel Form

**File**: `frontend/src/components/duel/CreateDuelForm.tsx`

### Toggle

Add a **Private / Public** toggle above the Amount field. Default: **Private**.

Hints below the toggle:
- Private: "Only someone with the invite link can join or decline this duel"
- Public: "Anyone can find and join this duel from the open duels feed"

### Behavior by type

**Private (default)** — current behavior unchanged:
1. Generate random `inviteSecret`
2. Hash it → `inviteHash`
3. `createDuel(amount, inviteHash)`
4. Store secret in localStorage
5. Redirect to `/duel/{id}#{inviteSecret}`
6. ShareLink shows full invite URL

**Public:**
1. Use `PUBLIC_INVITE_HASH` constant
2. `createDuel(amount, PUBLIC_INVITE_HASH)`
3. No localStorage storage needed
4. Redirect to `/duel/{id}` (no fragment)
5. ShareLink shows `/duel/{id}` (clean URL, no secret)

---

## Feature: Duel Detail Page

**File**: `frontend/src/app/duel/[id]/page.tsx`

### Type detection

On page load, check `isPublicDuel(duel.inviteHash)`:
- If public → auto-set `inviteSecret = PUBLIC_INVITE_SECRET` (no URL fragment needed)
- If private → current logic (read from fragment or localStorage)

### Badge

Show a "Public" or "Private" badge next to the duel status badge. Subtle styling — not a primary visual element.

### Join / Decline visibility

| Type | State | Join | Decline |
|------|-------|------|---------|
| Public | Created | Visible to all authenticated users (except creator) | Hidden |
| Private | Created | Visible only with valid invite secret (except creator) | Visible with valid invite secret (except creator) |

### Share Link

ShareLink component works for both types:
- **Public**: copies `/duel/{id}` (no fragment)
- **Private**: copies `/duel/{id}#{inviteSecret}` (current behavior)

Same copy-button UX for both. Different hint text:
- Public: "Share this link — anyone can join"
- Private: "Share this private link — only someone with this link can join"

---

## Feature: Open Duels Page

**New file**: `frontend/src/app/duels/open/page.tsx`

A dedicated page listing all public duels in `Created` state (waiting for an opponent).

### Data flow

1. Read all duels from contract via multicall (reuse `useRecentDuels` pattern or `usePlatformStats` duel-reading pattern)
2. Filter: `state === Created` AND `isPublicDuel(inviteHash)`
3. Sort by `createdAt` descending (newest first)

### UI

- Page title: "Open Duels"
- Subtitle: "Public challenges waiting for opponents"
- Search bar (filter by wager, creator address, nickname, game name, message)
- DuelCard for each duel — with a prominent **Join** button
- Pagination (20 per page)
- Empty state: "No open duels right now. Create one!"

### Join from list

Each DuelCard on this page includes a Join action. Clicking Join:
1. Check wallet connected + authenticated
2. Check correct chain
3. Check USDT allowance → approve if needed
4. Call `joinDuel(duelId, PUBLIC_INVITE_SECRET)`

This is a convenience — the full join flow still works from `/duel/{id}`.

### Navigation

Add "Open Duels" link in the header, between "Games" and "Dashboard". Icon: `Swords` from lucide-react.

---

## Feature: Landing Page Section

**File**: `frontend/src/app/page.tsx` (new section component)

New section **"Open Duels"** between HeroSection and RecentDuels.

- Show up to 6 public duels in Created state
- Each as a compact card: creator (nickname if available), wager amount, game badge, message preview, "Join" link (goes to `/duel/{id}`)
- "View all open duels →" link to `/duels/open`
- If no open duels → section hidden (same pattern as PopularGamesSection)

---

## Feature: Game Catalog Integration

**File**: `frontend/src/app/games/[slug]/page.tsx`

The Active tab already shows duels in Created/Funded/WinnerClaimed/MutualCancelRequested states. Public duels in Created state will naturally appear there.

Enhancement: for public Created duels, show a "Public" badge and make the DuelCard link actionable (clicking leads to `/duel/{id}` where they can join).

No new data fetching needed — `useGameDuels` already returns these duels.

---

## Translations

New keys (EN / RU):

```
create.duelType          "Duel Type"              / "Тип дуэли"
create.private           "Private"                / "Приватная"
create.public            "Public"                 / "Публичная"
create.privateHint       "Only someone with the invite link can join or decline" / "Присоединиться или отклонить может только тот, у кого есть ссылка-приглашение"
create.publicHint        "Anyone can find and join this duel" / "Любой может найти и принять эту дуэль"
duel.public              "Public"                 / "Публичная"
duel.private             "Private"                / "Приватная"
duel.sharePublic         "Share this link — anyone can join" / "Поделитесь ссылкой — присоединиться может любой"
duel.sharePrivate        "Share this private link — only someone with this link can join" / "Поделитесь приватной ссылкой — присоединиться сможет только тот, у кого она есть"
openDuels.title          "Open Duels"             / "Открытые дуэли"
openDuels.subtitle       "Public challenges waiting for opponents" / "Публичные вызовы, ожидающие соперников"
openDuels.empty          "No open duels right now. Create one!" / "Открытых дуэлей пока нет. Создайте первую!"
openDuels.viewAll        "View all open duels"    / "Все открытые дуэли"
nav.openDuels            "Open Duels"             / "Открытые дуэли"
```

---

## Scope Boundaries

**In scope:**
- Well-known secret constant and `isPublicDuel()` utility
- Private/Public toggle in CreateDuelForm with hints
- Duel detail page: auto-detect public, show Join to all, hide Decline for public, type badge, share link
- `/duels/open` page with full listing, search, pagination, join action
- Landing page Open Duels preview section
- Header navigation link
- Game catalog: public badge on DuelCards in Active tab
- EN + RU translations

**Out of scope:**
- Contract changes (no redeployment)
- Backend changes (duel type is purely a frontend convention based on inviteHash)
- Notification system for new public duels
- Filtering open duels by game on the /duels/open page (can add later)

Wait — filtering by game IS in scope if we want it useful. Let me include it:

**Revised**: The /duels/open page reads DuelMeta from backend to resolve game names for display and filtering. Filter by game dropdown uses the same `useGames` hook.

---

## Edge Cases

1. **Creator views own public duel**: sees the duel detail as now, but no Join/Decline buttons (they're the creator). Cancel button works as before.
2. **User without wallet views public duel**: sees the duel info but Join button prompts to connect wallet.
3. **Public duel gets joined while user is on page**: React Query poll (10s) updates the state to Funded, Join button disappears.
4. **Race condition — two users try to join**: only the first transaction succeeds on-chain. The second gets a revert ("Invalid state"). Frontend shows transaction error toast.
5. **Existing private duels**: unchanged — `inviteHash` won't match `PUBLIC_INVITE_HASH`, so they stay private.
