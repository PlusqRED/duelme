# Refund & Claim Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-transaction `refundAndClaimPayouts` contract function and wire it into the dashboard so players can claim refunds from timed-out duels in one click.

**Architecture:** New Solidity function composes existing refund + claim logic atomically. Frontend reuses the existing `ActionFlowDialog` (single-tx flow) with two new configs — one for per-duel refund-claim and one for batch refund-claim-all. Dashboard shows a new "Claim All Refunds" card and per-duel "Claim Refund" buttons.

**Tech Stack:** Solidity 0.8.34 / Foundry, Next.js / TypeScript / wagmi / Tailwind

**Spec:** `docs/superpowers/specs/2026-04-14-refund-claim-flow-design.md`

---

### Task 1: Smart Contract — `refundAndClaimPayouts`

**Files:**
- Modify: `contracts/src/DuelMe.sol` (insert after `claimPayouts` at line 387)

- [ ] **Step 1: Write the contract function**

Add after `claimPayouts` (line 387) in `DuelMe.sol`:

```solidity
/// @notice Refund all timed-out duels and claim the caller's payouts in one transaction.
///         Duels that are not in WinnerClaimed state or have not timed out are silently skipped.
/// @param duelIds The duel IDs to refund and claim from
function refundAndClaimPayouts(uint256[] calldata duelIds) external whenNotPaused nonReentrant {
    for (uint256 i = 0; i < duelIds.length; i++) {
        Duel storage duel = duels[duelIds[i]];
        if (duel.state == DuelState.WinnerClaimed && block.timestamp >= duel.claimTimestamp + CLAIM_TIMEOUT) {
            duel.finalizedAt = block.timestamp;
            duel.state = DuelState.Refunded;
            playerStats[duel.claimedBy].duelsHonored += 1;
            address nonResponder = duel.claimedBy == duel.creator ? duel.opponent : duel.creator;
            playerStats[nonResponder].duelsAbandoned += 1;
            _setPayouts(duel, duel.wagerAmount, duel.wagerAmount);
            emit DuelRefunded(duelIds[i]);
        }
    }

    uint256 totalAmount;
    for (uint256 i = 0; i < duelIds.length; i++) {
        totalAmount += _claimSinglePayout(duels[duelIds[i]], duelIds[i], msg.sender);
    }
    require(totalAmount > 0, "Nothing to claim");
    usdt.safeTransfer(msg.sender, totalAmount);
}
```

- [ ] **Step 2: Compile**

Run: `cd contracts && forge build`
Expected: compiles without errors.

- [ ] **Step 3: Commit**

```
feat: add refundAndClaimPayouts batch function
```

---

### Task 2: Contract Tests

**Files:**
- Modify: `contracts/test/DuelMe.t.sol`

- [ ] **Step 1: Write tests**

Add these tests at the end of the `DuelMeTest` contract (before the closing `}`):

```solidity
// =====================================================================
// refundAndClaimPayouts
// =====================================================================

function testRefundAndClaimPayoutsSingleDuel() public {
    uint256 duelId = _createFundAndClaim();
    vm.warp(block.timestamp + 3601);

    uint256 aliceBalBefore = usdt.balanceOf(alice);

    vm.prank(alice);
    uint256[] memory ids = new uint256[](1);
    ids[0] = duelId;
    duelMe.refundAndClaimPayouts(ids);

    DuelMe.Duel memory d = duelMe.getDuel(duelId);
    assertEq(uint256(d.state), uint256(DuelMe.DuelState.Refunded));
    assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER);
    _assertPayouts(duelId, WAGER, WAGER, true, false);
    _assertStats(alice, 1, 0, "Alice (claimer)");
    _assertStats(bob, 0, 1, "Bob (non-responder)");
}

function testRefundAndClaimPayoutsMultipleDuels() public {
    uint256 id1 = _createFundAndClaim();

    // Create second duel: bob creates, alice joins, bob claims
    vm.prank(bob);
    uint256 id2 = duelMe.createDuel(WAGER, OTHER_INVITE_SECRET);
    vm.prank(alice);
    duelMe.joinDuel(id2, bytes32(uint256(2)));
    vm.prank(bob);
    duelMe.claimVictory(id2);

    vm.warp(block.timestamp + 3601);

    uint256 aliceBalBefore = usdt.balanceOf(alice);

    vm.prank(alice);
    uint256[] memory ids = new uint256[](2);
    ids[0] = id1;
    ids[1] = id2;
    duelMe.refundAndClaimPayouts(ids);

    assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER * 2);
    _assertPayouts(id1, WAGER, WAGER, true, false);
    _assertPayouts(id2, WAGER, WAGER, false, true);
}

function testRefundAndClaimPayoutsSkipsAlreadyRefunded() public {
    uint256 id1 = _createFundAndClaim();
    vm.warp(block.timestamp + 3601);

    // Refund id1 separately first
    duelMe.refund(id1);

    uint256 aliceBalBefore = usdt.balanceOf(alice);

    // Call refundAndClaimPayouts — should skip refund step but still claim
    vm.prank(alice);
    uint256[] memory ids = new uint256[](1);
    ids[0] = id1;
    duelMe.refundAndClaimPayouts(ids);

    assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER);
    _assertPayouts(id1, WAGER, WAGER, true, false);
}

function testRefundAndClaimPayoutsSkipsNotTimedOut() public {
    uint256 duelId = _createFundAndClaim();
    // Only 30 minutes passed — not timed out yet
    vm.warp(block.timestamp + 1800);

    vm.prank(alice);
    uint256[] memory ids = new uint256[](1);
    ids[0] = duelId;

    vm.expectRevert("Nothing to claim");
    duelMe.refundAndClaimPayouts(ids);
}

function testRefundAndClaimPayoutsNonParticipantGetsNothing() public {
    uint256 duelId = _createFundAndClaim();
    vm.warp(block.timestamp + 3601);

    vm.prank(charlie);
    uint256[] memory ids = new uint256[](1);
    ids[0] = duelId;

    // Charlie triggers refund but has nothing to claim
    vm.expectRevert("Nothing to claim");
    duelMe.refundAndClaimPayouts(ids);

    // But the duel IS refunded now (side effect)
    DuelMe.Duel memory d = duelMe.getDuel(duelId);
    assertEq(uint256(d.state), uint256(DuelMe.DuelState.Refunded));
}

function testRefundAndClaimPayoutsEmptyArrayReverts() public {
    uint256[] memory ids = new uint256[](0);
    vm.expectRevert("Nothing to claim");
    duelMe.refundAndClaimPayouts(ids);
}

function testRefundAndClaimPayoutsWhenPausedReverts() public {
    uint256 duelId = _createFundAndClaim();
    vm.warp(block.timestamp + 3601);

    duelMe.pause();

    vm.prank(alice);
    uint256[] memory ids = new uint256[](1);
    ids[0] = duelId;
    vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
    duelMe.refundAndClaimPayouts(ids);
}

function testRefundAndClaimPayoutsMixedStates() public {
    // Duel 1: timed-out WinnerClaimed (will be refunded + claimed)
    uint256 id1 = _createFundAndClaim();

    // Duel 2: already resolved (only claim, no refund needed)
    uint256 id2 = _createFundClaimAndResolve();

    vm.warp(block.timestamp + 3601);

    uint256 aliceBalBefore = usdt.balanceOf(alice);

    vm.prank(alice);
    uint256[] memory ids = new uint256[](2);
    ids[0] = id1;
    ids[1] = id2;
    duelMe.refundAndClaimPayouts(ids);

    // id1: alice was claimer → gets wager back
    // id2: alice was claimer, bob confirmed → alice won → gets 2*WAGER
    assertEq(usdt.balanceOf(alice), aliceBalBefore + WAGER + WAGER * 2);
}
```

- [ ] **Step 2: Run tests**

Run: `cd contracts && forge test --match-contract DuelMeTest --match-test testRefundAndClaim -vvv`
Expected: all 8 tests pass.

- [ ] **Step 3: Run full test suite + coverage**

Run: `cd contracts && forge test -vvv`
Expected: all tests pass including the new ones.

Run: `cd contracts && forge coverage --report summary`
Expected: `refundAndClaimPayouts` has line coverage.

- [ ] **Step 4: Commit**

```
test: add refundAndClaimPayouts tests
```

---

### Task 3: Sync ABI to Frontend

**Files:**
- Modify: `frontend/src/lib/contracts.ts` (ABI array)

- [ ] **Step 1: Build contract and extract ABI**

Run: `cd contracts && forge build`
Then copy the `refundAndClaimPayouts` ABI entry from `contracts/out/DuelMe.sol/DuelMe.json` and add it to the `duelMeAbi` array in `frontend/src/lib/contracts.ts`.

The ABI entry to add:

```typescript
{
  type: 'function',
  name: 'refundAndClaimPayouts',
  inputs: [{ name: 'duelIds', type: 'uint256[]', internalType: 'uint256[]' }],
  outputs: [],
  stateMutability: 'nonpayable',
},
```

Add this after the existing `claimPayouts` entry in the ABI array.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```
feat: add refundAndClaimPayouts to frontend ABI
```

---

### Task 4: Frontend Action + Flow Configs

**Files:**
- Modify: `frontend/src/hooks/useDuelActions.ts` (add action)
- Modify: `frontend/src/lib/actionFlow.ts` (add types)
- Modify: `frontend/src/lib/actionFlowConfigs.ts` (add configs)

- [ ] **Step 1: Add action type to `actionFlow.ts`**

In `frontend/src/lib/actionFlow.ts`, add `'refundAndClaim'` and `'refundAndClaimAll'` to the `ActionFlowType` union (line 9-17):

```typescript
export type ActionFlowType =
  | 'claimVictory'
  | 'admitDefeat'
  | 'confirmResult'
  | 'disputeResult'
  | 'requestMutualCancellation'
  | 'claimPayout'
  | 'refund'
  | 'claimAll'
  | 'refundAndClaim'
  | 'refundAndClaimAll';
```

- [ ] **Step 2: Add `refundAndClaimPayouts` action to `useDuelActions.ts`**

Add after the `refund` function (line 231):

```typescript
function refundAndClaimPayouts(duelIds: bigint[]) {
  writeContract({
    address: contractAddress,
    abi: duelMeAbi,
    functionName: 'refundAndClaimPayouts',
    args: [duelIds],
    chainId,
  });
}
```

Add `refundAndClaimPayouts` to the return object (after `refund`).

- [ ] **Step 3: Add flow configs to `actionFlowConfigs.ts`**

Add two new config functions at the end of the file:

```typescript
export function refundAndClaimConfig(execute: () => void): ActionFlowConfig {
  return {
    type: 'refundAndClaim',
    execute,
    onSuccess: emitBalanceRefresh,
    icon: RotateCcw,
    labels: {
      dialogTitle: 'actionFlow.refundAndClaim.title',
      dialogDescription: 'actionFlow.refundAndClaim.description',
      reviewTitle: 'actionFlow.refundAndClaim.review.title',
      reviewDescription: 'actionFlow.refundAndClaim.review.description',
      reviewHint: 'actionFlow.refundAndClaim.review.hint',
      reviewHintSwitch: 'actionFlow.refundAndClaim.review.hintSwitch',
      executeTitle: 'actionFlow.refundAndClaim.execute.title',
      executeDescription: 'actionFlow.refundAndClaim.execute.description',
      executeHint: 'actionFlow.refundAndClaim.execute.hint',
      executeButton: 'actionFlow.refundAndClaim.execute.button',
      successTitle: 'actionFlow.refundAndClaim.success.title',
      successDescription: 'actionFlow.refundAndClaim.success.description',
      successHint: 'actionFlow.refundAndClaim.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.duel'), value: `#${ctx.duelId}` },
      { label: ctx.t('actionFlow.summary.claimable'), value: ctx.claimableDisplay, emphasize: true },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}

export function refundAndClaimAllConfig(execute: () => void, totalDisplay: string, duelCount: number): ActionFlowConfig {
  return {
    type: 'refundAndClaimAll',
    execute,
    onSuccess: emitBalanceRefresh,
    icon: RotateCcw,
    labels: {
      dialogTitle: 'actionFlow.refundAndClaimAll.title',
      dialogDescription: 'actionFlow.refundAndClaimAll.description',
      reviewTitle: 'actionFlow.refundAndClaimAll.review.title',
      reviewDescription: 'actionFlow.refundAndClaimAll.review.description',
      reviewHint: 'actionFlow.refundAndClaimAll.review.hint',
      reviewHintSwitch: 'actionFlow.refundAndClaimAll.review.hintSwitch',
      executeTitle: 'actionFlow.refundAndClaimAll.execute.title',
      executeDescription: 'actionFlow.refundAndClaimAll.execute.description',
      executeHint: 'actionFlow.refundAndClaimAll.execute.hint',
      executeButton: 'actionFlow.refundAndClaimAll.execute.button',
      successTitle: 'actionFlow.refundAndClaimAll.success.title',
      successDescription: 'actionFlow.refundAndClaimAll.success.description',
      successHint: 'actionFlow.refundAndClaimAll.success.hint',
    },
    summaryItems: (ctx) => [
      { label: ctx.t('actionFlow.summary.totalClaimable'), value: totalDisplay, emphasize: true },
      { label: ctx.t('actionFlow.summary.duelCount'), value: String(duelCount) },
      { label: ctx.t('actionFlow.summary.chain'), value: ctx.chainName },
    ],
  };
}
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: fails — translation keys don't exist yet. That's expected, we'll add them in Task 5.

- [ ] **Step 5: Commit**

```
feat: add refundAndClaimPayouts action and flow configs
```

---

### Task 5: Translations

**Files:**
- Modify: `frontend/src/i18n/translations.ts`

- [ ] **Step 1: Add EN translations**

Add after the `actionFlow.claimAll.success.hint` block (line 354):

```typescript
// Refund and Claim (single duel)
'actionFlow.refundAndClaim.title': 'Claim timeout refund',
'actionFlow.refundAndClaim.description': 'Unlock and claim your refund.',
'actionFlow.refundAndClaim.review.title': 'Claim timeout refund',
'actionFlow.refundAndClaim.review.description': 'This duel timed out without a response. This transaction unlocks and claims your refund in one step.',
'actionFlow.refundAndClaim.review.hint': 'Next: claim on-chain.',
'actionFlow.refundAndClaim.review.hintSwitch': 'Next: switch to {chain}, then claim.',
'actionFlow.refundAndClaim.execute.title': 'Claim refund',
'actionFlow.refundAndClaim.execute.description': 'Confirm in your wallet to unlock and claim your refund.',
'actionFlow.refundAndClaim.execute.hint': 'Funds will appear in your wallet after confirmation.',
'actionFlow.refundAndClaim.execute.button': 'Claim Refund',
'actionFlow.refundAndClaim.success.title': 'Refund claimed',
'actionFlow.refundAndClaim.success.description': 'Your refund has been sent to your wallet.',
'actionFlow.refundAndClaim.success.hint': 'Check your wallet balance.',

// Refund and Claim All (batch)
'actionFlow.refundAndClaimAll.title': 'Claim all timeout refunds',
'actionFlow.refundAndClaimAll.description': 'Unlock and claim all timed-out refunds.',
'actionFlow.refundAndClaimAll.review.title': 'Claim all timeout refunds',
'actionFlow.refundAndClaimAll.review.description': 'These duels timed out without a response. This transaction unlocks and claims all your refunds in one step.',
'actionFlow.refundAndClaimAll.review.hint': 'Next: claim on-chain.',
'actionFlow.refundAndClaimAll.review.hintSwitch': 'Next: switch to {chain}, then claim.',
'actionFlow.refundAndClaimAll.execute.title': 'Claim all refunds',
'actionFlow.refundAndClaimAll.execute.description': 'Confirm in your wallet to unlock and claim all refunds.',
'actionFlow.refundAndClaimAll.execute.hint': 'Funds will appear in your wallet after confirmation.',
'actionFlow.refundAndClaimAll.execute.button': 'Claim All Refunds',
'actionFlow.refundAndClaimAll.success.title': 'Refunds claimed',
'actionFlow.refundAndClaimAll.success.description': 'All refunds have been sent to your wallet.',
'actionFlow.refundAndClaimAll.success.hint': 'Check your wallet balance.',

// Dashboard refund hints
'dashboard.refundAllHint': 'Claim refunds from duels that timed out without a response.',
'dashboard.refundAvailable': 'Refund available',
'action.claimRefund': 'Claim Refund',
'action.claimAllRefunds': 'Claim All Refunds',
```

- [ ] **Step 2: Add RU translations**

Add after the RU `actionFlow.claimAll.success.hint` block (line ~1003):

```typescript
// Refund and Claim (single duel)
'actionFlow.refundAndClaim.title': 'Забрать возврат по таймауту',
'actionFlow.refundAndClaim.description': 'Разблокировать и забрать возврат.',
'actionFlow.refundAndClaim.review.title': 'Забрать возврат по таймауту',
'actionFlow.refundAndClaim.review.description': 'В этой дуэли истекло время ответа. Эта транзакция разблокирует и заберёт ваш возврат за один шаг.',
'actionFlow.refundAndClaim.review.hint': 'Дальше: забрать в блокчейне.',
'actionFlow.refundAndClaim.review.hintSwitch': 'Дальше: переключиться на {chain}, затем забрать.',
'actionFlow.refundAndClaim.execute.title': 'Забрать возврат',
'actionFlow.refundAndClaim.execute.description': 'Подтвердите в кошельке, чтобы разблокировать и забрать возврат.',
'actionFlow.refundAndClaim.execute.hint': 'Средства появятся в кошельке после подтверждения.',
'actionFlow.refundAndClaim.execute.button': 'Забрать возврат',
'actionFlow.refundAndClaim.success.title': 'Возврат получен',
'actionFlow.refundAndClaim.success.description': 'Возврат отправлен в ваш кошелёк.',
'actionFlow.refundAndClaim.success.hint': 'Проверьте баланс кошелька.',

// Refund and Claim All (batch)
'actionFlow.refundAndClaimAll.title': 'Забрать все возвраты по таймауту',
'actionFlow.refundAndClaimAll.description': 'Разблокировать и забрать все возвраты.',
'actionFlow.refundAndClaimAll.review.title': 'Забрать все возвраты по таймауту',
'actionFlow.refundAndClaimAll.review.description': 'В этих дуэлях истекло время ответа. Эта транзакция разблокирует и заберёт все возвраты за один шаг.',
'actionFlow.refundAndClaimAll.review.hint': 'Дальше: забрать в блокчейне.',
'actionFlow.refundAndClaimAll.review.hintSwitch': 'Дальше: переключиться на {chain}, затем забрать.',
'actionFlow.refundAndClaimAll.execute.title': 'Забрать все возвраты',
'actionFlow.refundAndClaimAll.execute.description': 'Подтвердите в кошельке, чтобы разблокировать и забрать все возвраты.',
'actionFlow.refundAndClaimAll.execute.hint': 'Средства появятся в кошельке после подтверждения.',
'actionFlow.refundAndClaimAll.execute.button': 'Забрать все возвраты',
'actionFlow.refundAndClaimAll.success.title': 'Возвраты получены',
'actionFlow.refundAndClaimAll.success.description': 'Все возвраты отправлены в ваш кошелёк.',
'actionFlow.refundAndClaimAll.success.hint': 'Проверьте баланс кошелька.',

// Dashboard refund hints
'dashboard.refundAllHint': 'Заберите возвраты из дуэлей, в которых истекло время ответа.',
'dashboard.refundAvailable': 'Возврат доступен',
'action.claimRefund': 'Забрать возврат',
'action.claimAllRefunds': 'Забрать все возвраты',
```

- [ ] **Step 3: Type-check + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```
feat: add refund-and-claim flow translations (EN/RU)
```

---

### Task 6: Dashboard — Refundable Duels + "Claim All Refunds" Card

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`
- Modify: `frontend/src/lib/duel.ts` (add helper)

- [ ] **Step 1: Add `getRefundableAmountForAddress` helper to `lib/duel.ts`**

Add after `isDuelClaimTimedOut` (line ~99):

```typescript
export function getRefundableAmountForAddress(
  duel: Pick<ClaimableDuel, 'creator' | 'opponent' | 'state' | 'claimTimestamp'> & { wagerAmount: bigint },
  address?: string | null
): bigint {
  if (!address) return 0n;
  const normalized = address.toLowerCase();
  if (normalized !== duel.creator.toLowerCase() && normalized !== duel.opponent.toLowerCase()) return 0n;
  if (duel.state !== DuelState.WinnerClaimed) return 0n;
  if (!isDuelClaimTimedOut(duel.claimTimestamp)) return 0n;
  return duel.wagerAmount;
}
```

Note: `ClaimableDuel` already includes `claimTimestamp` and `state`. We need `wagerAmount` from the full `Duel` type. The `PlayerDuel` type from `usePlayerDuels` has `wager` (number) and `state`, `claimTimestamp` (bigint), but not `wagerAmount` as bigint. In `PlayerDuel`, the wager is stored as `wager: number` (already parsed). For the refundable amount, we can compute it from `wager * 1e6` or add `wagerAmount` to `PlayerDuel`. Simplest: use the parsed `wager` and multiply back.

Actually, simpler approach — since refundable amount always equals the original wager, and `PlayerDuel.wager` is a number in USDT units:

```typescript
export function isRefundableDuel(
  duel: { state: DuelState; claimTimestamp: bigint }
): boolean {
  return duel.state === DuelState.WinnerClaimed && isDuelClaimTimedOut(duel.claimTimestamp);
}
```

- [ ] **Step 2: Update dashboard page**

In `frontend/src/app/dashboard/page.tsx`:

Add imports:

```typescript
import { getClaimableAmountForAddress, isRefundableDuel } from '@/lib/duel';
import { refundAndClaimConfig, refundAndClaimAllConfig } from '@/lib/actionFlowConfigs';
import { USDT_DECIMALS } from '@/lib/constants';
import { RotateCcw } from 'lucide-react';
```

After the `claimableDuels` / `totalClaimable` computation (lines 44-50), add:

```typescript
const refundableDuels = authenticated
  ? historyDuels.filter((duel) => isRefundableDuel(duel))
  : [];
const totalRefundable = refundableDuels.reduce(
  (sum, duel) => sum + BigInt(Math.round(duel.wager * 10 ** USDT_DECIMALS)),
  0n
);
```

Add handler after `handleClaimSingle` (line ~105):

```typescript
function handleRefundAndClaimAll() {
  if (!refundableDuels.length) return;
  const duelIds = refundableDuels.map((duel) => BigInt(duel.id));
  setClaimSummary({ duelId: 0, claimableDisplay: `${formatUSDT(totalRefundable)} USDT` });
  actionFlow.openFlow(
    refundAndClaimAllConfig(
      () => actionFlow.duelActions.refundAndClaimPayouts(duelIds),
      `${formatUSDT(totalRefundable)} USDT`,
      refundableDuels.length,
    )
  );
}

function handleRefundAndClaimSingle(duelId: number) {
  const duel = historyDuels.find((d) => d.id === duelId);
  if (!duel) return;
  const amount = BigInt(Math.round(duel.wager * 10 ** USDT_DECIMALS));
  setClaimSummary({ duelId, claimableDisplay: `${formatUSDT(amount)} USDT` });
  actionFlow.openFlow(
    refundAndClaimConfig(() => actionFlow.duelActions.refundAndClaimPayouts([BigInt(duelId)]))
  );
}
```

Add the "Claim All Refunds" card after the existing "Claim All" card (after line ~213):

```tsx
{totalRefundable > 0n && (
  <Card className="mt-4 border-red-200 bg-red-50 shadow-sm">
    <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-2xl font-bold text-red-950 sm:text-3xl">
          {formatUSDT(totalRefundable)} USDT
        </p>
        <p className="text-sm text-red-800">{t('dashboard.refundAllHint')}</p>
      </div>

      <Button
        size="lg"
        className="w-full bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white shadow-sm shadow-red-200 hover:from-red-600 hover:via-red-700 hover:to-rose-700 sm:w-auto"
        onClick={handleRefundAndClaimAll}
        disabled={actionFlow.flow !== null}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        {t('action.claimAllRefunds')}
      </Button>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 3: Type-check + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```
feat: add "Claim All Refunds" card to dashboard
```

---

### Task 7: DuelCard — "Claim Refund" Button + Badge

**Files:**
- Modify: `frontend/src/components/duel/DuelCard.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx` (pass callback)

- [ ] **Step 1: Add `onRefundClaim` prop to DuelCard**

In `frontend/src/components/duel/DuelCard.tsx`, add to the `DuelCardProps` interface:

```typescript
onRefundClaim?: () => void;
isRefundClaiming?: boolean;
```

Add to destructured props. Add import of `isRefundableDuel` from `@/lib/duel` and `RotateCcw` from `lucide-react`.

Inside the component, after `hasClaimableAmount` computation:

```typescript
const isRefundable = isRefundableDuel(duel);
```

In the badges area (around line 178-184), after the "Claim Ready" badge, add:

```tsx
{isRefundable && !hasClaimableAmount && (
  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
    <RotateCcw className="h-3.5 w-3.5" />
    {t('dashboard.refundAvailable')}
  </span>
)}
```

In the action area (around line 188-221), after the existing claim button block, add the refund-claim button:

```tsx
{isRefundable && onRefundClaim && (
  <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-red-100 px-4 py-3 text-left lg:text-right">
    <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">
      <RotateCcw className="h-3.5 w-3.5" />
      {t('dashboard.refundAvailable')}
    </div>
    <div className="mt-1 text-lg font-bold text-red-900">
      {duel.wager} USDT
    </div>
  </div>
)}

{isRefundable && onRefundClaim && (
  <Button
    size="lg"
    className="w-full bg-gradient-to-r from-red-500 via-red-600 to-rose-600 text-white shadow-sm shadow-red-200 hover:from-red-600 hover:via-red-700 hover:to-rose-700 lg:w-auto"
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      onRefundClaim();
    }}
    disabled={isRefundClaiming}
  >
    {!isRefundClaiming && <RotateCcw className="mr-2 h-4 w-4" />}
    {isRefundClaiming
      ? t('status.claiming')
      : t('action.claimRefund')}
  </Button>
)}
```

- [ ] **Step 2: Pass `onRefundClaim` from dashboard**

In `frontend/src/app/dashboard/page.tsx`, update the `DuelCard` render (line ~276-288):

```tsx
<DuelCard
  key={duel.id}
  duel={duel}
  viewerAddress={walletAddress}
  resolveDisplay={resolveDisplay}
  onClaim={
    authenticated && getClaimableAmountForAddress(duel, walletAddress) > 0n
      ? () => handleClaimSingle(duel.id)
      : undefined
  }
  onRefundClaim={
    authenticated && isRefundableDuel(duel)
      ? () => handleRefundAndClaimSingle(duel.id)
      : undefined
  }
  isClaiming={actionFlow.flow !== null && (actionFlow.flow.actionType === 'claimAll' || actionFlow.flow.actionType === 'claimPayout')}
  isRefundClaiming={actionFlow.flow !== null && (actionFlow.flow.actionType === 'refundAndClaim' || actionFlow.flow.actionType === 'refundAndClaimAll')}
/>
```

Add `isRefundableDuel` to the import from `@/lib/duel`.

- [ ] **Step 3: Type-check + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```
feat: add per-duel "Claim Refund" button to DuelCard
```

---

### Task 8: Verification

- [ ] **Step 1: Run full contract test suite**

Run: `cd contracts && forge test -vvv`
Expected: all tests pass.

- [ ] **Step 2: Run frontend checks**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: both pass.

- [ ] **Step 3: Manual testing on dev**

Start dev server: `cd frontend && npm run dev`

Test scenarios:
1. Dashboard History tab — timed-out duel shows "Refund available" badge + "Claim Refund" button
2. Click "Claim Refund" on a single duel — ActionFlowDialog opens with correct summary
3. If multiple timed-out duels exist — "Claim All Refunds" red card appears above history
4. Click "Claim All Refunds" — ActionFlowDialog opens with total amount and duel count
5. Regular "Claim All" green card still works for already-refunded duels
6. Both cards coexist when player has both types

- [ ] **Step 4: Final commit if any fixes needed**

---

### Task 9: Deploy Contract (after testing)

This task runs after manual testing confirms everything works.

- [ ] **Step 1: Deploy updated contract to Arbitrum Sepolia**

Use the `/deploy` skill to deploy the updated DuelMe contract with the new `refundAndClaimPayouts` function.

- [ ] **Step 2: Update contract addresses**

Update `frontend/src/lib/constants.ts` with the new contract address if it changed.

- [ ] **Step 3: Sync ABI if needed**

Use the `/sync-abi` skill to ensure the ABI is in sync.

- [ ] **Step 4: Test on dev.duelme.pro**

Verify the flow works end-to-end on the deployed dev environment.
