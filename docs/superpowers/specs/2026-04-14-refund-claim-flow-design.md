# Refund & Claim Flow for Timed-Out Duels

## Problem

When a duel times out (opponent doesn't confirm/dispute within 60 minutes), the player must:
1. Navigate to the duel detail page
2. Click "Refund" to call `refund(duelId)` on-chain (1 transaction)
3. Wait for confirmation
4. Then "Claim Funds" to call `claimPayout(duelId)` (another transaction)

There's no way to do this from the dashboard, and the 2-step process is confusing. Timed-out duels sit in History with no actionable button.

## Solution

### Contract: `refundAndClaimPayouts(uint256[] calldata duelIds)`

A single contract function that atomically refunds all timed-out duels and claims the caller's payouts in one transaction.

**Logic:**
1. Loop through `duelIds` — for each duel in `WinnerClaimed` state past timeout, execute the refund (state transition, reputation updates, payout setup). Silently skip duels that aren't eligible (already refunded, wrong state, timeout not reached).
2. Loop through the same `duelIds` — collect the caller's claimable payouts via `_claimSinglePayout`.
3. `require(totalAmount > 0)` — revert if nothing to claim.
4. Single `usdt.safeTransfer(msg.sender, totalAmount)` at the end.

**Safety:**
- CEI pattern: all storage writes (refund state changes, payout setup, claimed flags) happen before the single external call (`safeTransfer`).
- `nonReentrant` + `whenNotPaused` as per project convention.
- No new attack surface — the function composes existing `refund()` and `_claimSinglePayout()` logic. The only difference is that ineligible duels are silently skipped instead of reverting, which is necessary for batch UX (one already-refunded duel shouldn't block the whole batch).
- Gas: ~140k gas per refund iteration (7 SSTOREs) + claim overhead. On Arbitrum L2, even 20 duels is well within block gas limits.

**Why skip instead of revert for refund eligibility:**
Between the user clicking "Claim All Refunds" and the transaction being mined, another player (or a bot) could call `refund()` on one of the duels. If the batch reverted on already-refunded duels, the entire transaction would fail. Silently skipping means the remaining duels still get processed, and the claim step picks up payouts from both freshly-refunded and previously-refunded duels.

### Frontend: Dashboard Integration

**Per-duel button — "Claim Refund":**
- Appears on each `DuelCard` for timed-out `WinnerClaimed` duels (where `isDuelClaimTimedOut(claimTimestamp)` is true).
- Triggers the existing `ActionFlowDialog` with a new `refundAndClaimConfig` (single transaction = single-step flow).
- Calls `refundAndClaimPayouts([duelId])` with a single-element array.

**Batch button — "Claim All Refunds":**
- New card appears above history tab (red/amber theme) when there are timed-out unreturned duels.
- Shows count and total wager amount at stake.
- Triggers `ActionFlowDialog` with `refundAndClaimAllConfig`.
- Calls `refundAndClaimPayouts([id1, id2, ...])` with all timed-out duel IDs.

**Relationship to existing "Claim All":**
- Existing green "Claim All" card handles duels that already have payouts set (Resolved, Refunded, etc.).
- New "Claim All Refunds" card handles timed-out duels that need refund+claim.
- They are separate because they serve different pools of duels and use different contract functions.
- Both can coexist on the dashboard when the player has both types.

### Naming

| Context | EN | RU |
|---------|----|----|
| Per-duel button | Claim Refund | Забрать возврат |
| Batch button | Claim All Refunds | Забрать все возвраты |
| Flow dialog title (single) | Claim timeout refund | Возврат по таймауту |
| Flow dialog title (batch) | Claim all timeout refunds | Забрать все возвраты по таймауту |

Parallels existing vocabulary: "Claim Funds" / "Claim All" for resolved duels.

### Guided Flow Steps (ActionFlowDialog)

Single-transaction flow using existing `ActionFlowDialog` (no new multi-step component needed):

**Review stage:** Summary showing duel ID(s), total refund amount, chain. Explanation: "These duels timed out without a response. This transaction unlocks and claims your refund in one step."

**Execute stage:** "Confirm in your wallet to claim your refund."

**Success stage:** "Refund claimed successfully. Check your wallet balance."

### DuelCard Visual Treatment

For timed-out `WinnerClaimed` duels in the history tab:
- Show "Refund Available" badge (amber, with RotateCcw icon) — similar to existing "Claim Ready" badge.
- Show the refundable amount (equal to the original wager).
- "Claim Refund" button in the same position as the existing "Claim Funds" button.

## Files to Modify

### Contract
| File | Change |
|------|--------|
| `contracts/src/DuelMe.sol` | Add `refundAndClaimPayouts(uint256[])` function |
| `contracts/test/DuelMe.t.sol` or new `DuelMeRefundClaim.t.sol` | Tests for the new function |

### Frontend
| File | Change |
|------|--------|
| `frontend/src/lib/contracts.ts` | Update ABI with new function |
| `frontend/src/hooks/useDuelActions.ts` | Add `refundAndClaimPayouts()` action |
| `frontend/src/lib/actionFlowConfigs.ts` | Add `refundAndClaimConfig` + `refundAndClaimAllConfig` |
| `frontend/src/lib/actionFlow.ts` | Add `'refundAndClaim'` and `'refundAndClaimAll'` to `ActionFlowType` |
| `frontend/src/hooks/usePlayerDuels.ts` | Expose list of timed-out unreturned duels |
| `frontend/src/lib/duel.ts` | Add `getRefundableAmountForAddress()` helper |
| `frontend/src/app/dashboard/page.tsx` | Add "Claim All Refunds" card + per-duel refund handler |
| `frontend/src/components/duel/DuelCard.tsx` | Show "Claim Refund" button + "Refund Available" badge for timed-out duels |
| `frontend/src/i18n/translations.ts` | New EN/RU keys for refund flow labels, badges, hints |

## Out of Scope

- Batch `refund()` without claim (not needed — the combined function covers all use cases).
- Changes to the duel detail page refund flow (existing ConfirmResult + ActionFlowDialog refund still works for the detail page).
- ERC2612 permit integration (USDT doesn't support it).
