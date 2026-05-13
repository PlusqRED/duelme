# Reputation in Profile Header — Design

**Date:** 2026-05-02
**Scope:** Profile UX — Step 1 of an incremental profile cleanup sequence.
**Out of scope:** Steps 3 (remove `gender`) and 4 (remove `firstName` / `lastName`) follow in separate specs. Public-profile "Challenge" button is parked pending a contract decision.

## Problem

`ReputationBadge` is the only real trust signal a viewer has on a P2P duel platform, but it currently lives at the very bottom of both profile pages — below personal info, games, and account-metadata cards. On a duel platform, identity (name/avatar) without reputation is much weaker than reputation without name. The current ordering inverts that priority.

## Goal

Make reputation the first thing a viewer sees on any profile, without restructuring the rest of the page.

## Change

Move `<ReputationBadge showStats />` into the gradient header on both profile pages, sitting between the status line and the wallet-address line:

```
<avatar> | nickname           (h1, text-white)
         | status              (text-white/80, if present)
         | [Reputation pill] honored/total · score%
         | 0x1234...5678       (mono, text-white/60)
```

Same component, same data, same `showStats` mode — only the location changes.

## Files touched

- `frontend/src/components/duel/ReputationBadge.tsx`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/app/profile/[walletAddress]/page.tsx`

## Component change: `ReputationBadge`

Add an optional `tone?: 'light' | 'dark'` prop, default `'light'`.

The level pill itself (`bg-{level}-50 text-{level}-700 border-{level}-200`) reads cleanly on the indigo→violet gradient already, so it does not change.

The stats suffix is currently `text-[10px] text-slate-400`, which would disappear on the gradient. When `tone === 'dark'`, render the suffix as `text-[10px] text-white/80` instead. No other style changes.

The loading skeleton (`bg-slate-100 animate-pulse`) stays as-is for now; it remains visible enough on the gradient. If it looks wrong in the visual review, it gets adjusted in the same change.

## Page changes

### `app/profile/page.tsx` (own)
1. Inside the header column (currently nickname → status → truncated address), insert the badge as its own line above the address line. Pass `tone="dark"` and `showStats`.
2. Delete the bottom standalone reputation block (~lines 381–385: `walletAddress && <div className="flex justify-center"><ReputationBadge ... /></div>`).

### `app/profile/[walletAddress]/page.tsx` (public)
1. Same insertion in the header column.
2. From the existing "Wallet + Reputation" card (~lines 169–179), remove the `ReputationBadge` line. Keep `CopyableAddress` so the copy-button UX remains. The card stays as a wallet card.

## Mobile (≤360px)

The header right column gains a fourth line. With current sizes (`text-2xl` nickname, `text-sm` status, ~20px reputation pill, `text-xs` mono address) plus `gap-5` between avatar and column, the column fits within the avatar height (`h-24`) on 360px width without horizontal scroll. To be verified visually.

If the nickname overflows when reputation pushes content, downgrade nickname to `text-xl` at the default breakpoint and keep `sm:text-3xl` — local fix, no layout rework.

## Verification

Per CLAUDE.md UI workflow:

1. `npx tsc --noEmit` and `npm run lint` from `frontend/`.
2. Start dev server on a free port (e.g. `--port 3010`).
3. Capture full-page screenshots of `/profile` and `/profile/<sample-address>` at desktop and at viewport `390x844` (iPhone-class) and at `360x780` (small-Android-class).
4. Confirm: reputation pill visible, stats text legible (no slate-400-on-gradient), no overflow / clipped text, no hover-only interactions, address still copyable on public profile.
5. Clean up screenshots and stop the dev server.

## Translations

No new keys. All strings come from existing `rep.*` translations (`rep.new` / `rep.honorable` / `rep.fair` / `rep.unreliable`).

## Tests

No new unit tests required — this is a layout move, not a behavior change. `ReputationBadge` is presentation-only and the existing reputation hook tests remain valid.

## Risks

- **Visual:** the gradient + light-pastel pill might read as "low contrast" for the `new` and `honorable` levels. Mitigation: visual review is mandatory before completion; if a level reads poorly, bump pill border opacity for `tone="dark"` only.
- **Layout regression on mobile:** four lines next to a 96px avatar at 360px width is the tightest case. Mitigation: explicit verification at 360px; fallback is the `text-xl` nickname downgrade.
