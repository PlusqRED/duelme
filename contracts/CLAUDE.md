# Contracts (`contracts/`)

Rules for the Solidity side. The root `CLAUDE.md` applies here too.

## Commands

`test/UsdtPermitFork.t.sol` skips unless `ARBITRUM_RPC_URL` is set — `set -a && . ./.env && set +a` first to include it. Skipped tests there are expected locally, not a failure. CI runs that suite separately, in `.github/workflows/usdt-fork.yml` against the public Arbitrum One RPC (a repository secret `ARBITRUM_RPC_URL` overrides it), on contract changes and weekly — there a skip or an empty run fails the job.

## Smart Contract

- Solidity 0.8.34, OpenZeppelin (SafeERC20, ReentrancyGuard, Pausable, Ownable2Step, ERC2771Context)
- **Every player-facing state-mutating function is `nonReentrant`** — `createDuel*`, `joinDuel*`,
  `declineDuel`, `claimVictory`, `admitDefeat`, the four mutual-cancellation calls,
  `confirmResult`, `disputeResult`, `refund`, `cancelDuel`, and every `claimPayout*` /
  `refundAndClaimPayouts*`. The `onlyOwner` entry points are the deliberate exception and carry no
  guard: `rescueToken`, `rescueETH`, the three emergency-withdraw calls, the five `set*` setters,
  `setDuelCreationPaused`, `pause`, `unpause`, and the `acceptOwnership` override. Their only
  caller is the owner key, so the guard would buy nothing. A new *player-facing* entry point
  without `nonReentrant` is a bug; a new `onlyOwner` one does not need it.
- **Administrative authority is deliberately not relayable.** `_checkOwner` and the
  `acceptOwnership` override both read `msg.sender`, not `_msgSender()`. Otherwise one off-chain
  signature from the owner key could be pushed through the forwarder — by an attacker, paying the
  gas, at a moment of their choosing — to transfer ownership, pause every duel or start an
  emergency withdrawal. Players need the forwarder because they have no ETH; the owner has ETH.
  Keep every new `onlyOwner` path on `msg.sender`.
- `whenNotPaused` is deliberately NOT universal:
  `pause()` blocks entering a duel (create, join, decline) and declaring a new result
  (`claimVictory`, `admitDefeat`); it never blocks withdrawing. Everything that only distributes the two wagers already held —
  `confirmResult`, `disputeResult`, `refund`, `cancelDuel`, the mutual-cancellation flow and every
  claim — stays open. An emergency brake that can hold a won payout indefinitely is a freeze on
  user funds, and a pausable `confirmResult` beside an unpausable `refund` is worse than either:
  the claim window runs out during the pause, the win becomes a refund, and the player who was
  prevented from confirming is the one stamped `duelsAbandoned`.
- **Known limit of that policy:** a `Funded` duel has no *unilateral* exit while paused. Both
  unilateral exits from `Funded` — `claimVictory` and `admitDefeat` — are pausable, so the
  unpausable `refund` is out of reach (it needs `WinnerClaimed`), and the
  mutual-cancellation path needs both players. Two wagers stay escrowed until the pause lifts.
  That is the price of a brake that can actually stop a claim; the alternative — unpausable
  `claimVictory` — means a pause cannot stop an exploit in the claim path at all. Worth revisiting
  only together with what `pause()` is for.
- `setDuelCreationPaused(bool)` is the separate migration switch: creation stops, existing duels
  keep playing and paying out, so moving to a successor address never strands money here.
- USDT 6 decimals — `wagerAmount` stored raw as `uint96` (`5_000_000` = 5 USDT)
- Pull-based payouts/refunds via `claimPayout` / `claimPayouts` / `refundAndClaimPayouts`, each with
  a `*To(…, address to)` sibling. The destination matters because USDT can blacklist an address,
  which would otherwise strand a payout in the contract forever.
- Duel storage is packed into 5 slots (from 16): participant roles are bits (`winnerIsCreator`,
  `claimedByCreator`, …) because every recorded address is either the creator or the opponent, and
  timestamps are `uint40`. External readers still get the flat shape through `DuelView` / `getDuel`.
- **Payouts are derived, never stored.** `_payoutOf` computes them from the terminal state and the
  winner — for `DuelView`, for the claim paths, and for the amount in `DuelResolved`. Do not
  reintroduce a stored payout field: it is the one way a duel's state and its payout can disagree,
  and it would need every writer to remember to keep it true.
- **`DuelState.Nonexistent` holds the enum's zero value**, and `_createDuel` writes
  `state = Created` explicitly (into a slot it already touches, so it is free). Duels live in a
  mapping, so an id nobody issued reads back as a zeroed struct. While `Created` held zero, such a
  slot was a legitimate fully open duel to every reader (`creator == 0`, `inviteHash == 0`,
  `invitedOpponent == 0`): `joinDuel` admitted anyone on it, pulled a zero wager, and left
  `state == Funded` for the real duel that later took the id — which `_createDuel` writes assuming
  a virgin entry. One wager then backed a two-wager payout out of other duels' escrow, and
  `admitDefeat` on that free `Funded` duel minted reputation. Two rules keep it shut:
  **never give `Created` the zero value again**, and route every entry point whose required state
  is `Created` through `_requireWaitingDuel`. The invariant handler draws ids past `duelCount` so
  the suite reaches this (`invariant_nothingExistsPastDuelCount`).
- `PlayerStats.duelsWon` / `duelsLost` / `volume` are written but not yet read — only
  `duelsHonored` and `duelsAbandoned` reach the UI, through the reputation score. Same reasoning
  as `createDuelFor` below: the contract is immutable, the screens are not, and all five counters
  share one storage slot so the unread three cost a few hundred gas per resolution rather than a
  slot. Pending work, not dead state.
- The address-bound half of duels is deliberately **read-only in the app**: `createDuelFor` /
  `createDuelForWithPermit` have no UI, while `usePublicDuels` and the duel page already gate on
  `invitedOpponent`. The entry points shipped now because the contract is immutable; the "challenge
  a specific player" control is the follow-up. Treat the gap as pending work, not a bug.
- `inviteHash == bytes32(0)` marks an open duel — anyone may join. `declineDuel` is refused only
  when the duel is open in *both* senses (no hash **and** no `invitedOpponent`): its invite is
  public, so declining would be a free way to empty the lobby. A non-zero `invitedOpponent`
  (set via `createDuelFor` / `createDuelForWithPermit`) restricts a duel to one address, which may
  decline it with or without a secret. While the duel is still waiting `DuelView.invitedOpponent`
  names that player and `opponent` is zero; once someone joins or declines the roles swap, so
  `opponent` always means "the second player".
  A client must gate its Join/Decline buttons on `invitedOpponent`, not on `inviteHash` alone —
  `isPublicDuel` (in `frontend/src/lib/invite.ts`, not on the contract) only answers "no secret
  needed"; `canPresentInvite` beside it mirrors the contract's `_requireAdmitted`.
- **The wager token is vetted once, at deploy, not on every wager.** `script/TokenFeeProbe.sol`
  moves a probe amount from the deployer to itself and requires the balance back whole; both
  deploy scripts run it. `usdt` is `immutable`, so this is one question about one address — the
  old per-wager balance-delta check asked it twice per create and twice per join, on the path the
  relayer pays for, and only in one direction: payouts leave through a bare `safeTransfer`, so a
  fee switched on later would have reverted intake while still short-paying every outstanding
  claim. That case is now `pause()`'s job, and `testFeeSwitchedOnAfterDeployUnderCollateralisesTheDuel`
  pins what happens without it. Never add a token whose transfer can take a cut.
- `admitDefeat` resolves the duel outright — no confirmation window, one relayed transaction less.
- Batch reads: `getDuels(offset, limit)` and `getDuelsByIds(ids)`; the frontend reads through
  `useDuelReads.ts` in pages of 200 instead of one call per duel.
- Mutual cancellation is four calls — `requestMutualCancellation`, then the counterparty's
  `acceptMutualCancellation` / `declineMutualCancellation`, or the requester's
  `withdrawMutualCancellationRequest`. A decline or a withdrawal returns the duel to `Funded`.
- Duel messages on-chain as UTF-8 `string`, default max 32 code points / 128 bytes
- Two owner exits, and USDT only gets one of them: `rescueToken` moves a stray token out
  instantly but reverts on USDT, `rescueETH` sweeps ETH. USDT can leave only through the
  timelocked `requestEmergencyWithdraw` → `executeEmergencyWithdraw` pair (`emergencyDelay`,
  default and floor 30 days), which accepts any token. So escrowed wagers are never one owner
  transaction away.
- Owner-settable params with hardcoded floors: `minWager` (≥ `MIN_WAGER_FLOOR` 0.1 USDT, set at deploy — 0.3 USDT in scripts), `claimTimeout` (≥ 1h), `emergencyDelay` (≥ 30d), `maxMessageCodepoints` (≥ 32), `maxMessageBytes` (≥ 128). The five are packed into one storage slot (`uint96`/`uint64`/`uint64`/`uint16`/`uint16`). Frontend reads the live values via `useContractConfig` (see Key Files in `frontend/CLAUDE.md`); `MIN_WAGER`/`CLAIM_TIMEOUT`/`MAX_DUEL_MESSAGE_CHARACTERS`/`MAX_DUEL_MESSAGE_BYTES` in `frontend/src/lib/constants.ts` are only pre-fetch fallbacks — keep them equal to deploy-time defaults.

## Standards (Solidity / Foundry)

**Security-first:**
- Every player-facing state-mutating function: `nonReentrant`. `onlyOwner` entry points are the
  exception, and new `onlyOwner` paths check `msg.sender`, not `_msgSender()`. `whenNotPaused` only
  where a pause should bite — never on a path that hands a player money back. All three rules and
  the reasoning behind them: "Smart Contract" above.
- `SafeERC20` for all token ops — never raw `.transfer()` / `.transferFrom()`.
- CEI pattern: checks → effects → interactions.
- `onlyOwner` for admin; verify authorization before state changes.
- Never trust `msg.value` arithmetic — use explicit amount params.
- Pull-over-push for payouts.

**Gas:**
- Don't initialize storage to defaults (0, `address(0)`, false). `_createDuel` writing `state = Created` is not a violation — `Created` is not the default; `Nonexistent` is, deliberately.
- `calldata` (not `memory`) for read-only params.
- Pack struct storage variables by size.
- `uint256` for loop counters.
- Events for non-on-chain data.
- `immutable` for constructor-set, `constant` for compile-time literals (eliminates SLOAD).
- Cache repeated storage reads in locals (each SLOAD = 100 gas).
- Short-circuit `require`: cheapest check first.

**Testing:** unit test every public/external function (happy + all revert conditions). Access control, state transitions, boundaries (0 / threshold / max), full lifecycle integration. Fuzz arithmetic-heavy fns. Target ≥90% line coverage including emergency/admin.

**Docs:** NatSpec `@notice` on all public functions. `@param` / `@return` for non-obvious. Emit events for every state change.

**ABI sync:** after contract changes, `forge build`, then copy the artifact's `abi` array into `duelMeAbi` in `frontend/src/lib/contracts.ts` **entry for entry, constructor included** — `contractMirrors.test.ts` compares the two canonicalised and fails on anything dropped. Type-checking proves nothing here; run `npm test` from `frontend/`. Update `DuelState` and the `Duel` interface if the enum or `DuelView` changed.

## Testing

**Contracts (Foundry):** one file per area, `vm.expectRevert` / `vm.expectEmit` / `vm.warp` /
`vm.prank`. `test/helpers/` holds the shared scaffolding — never re-create it inside a suite:
- `DuelMeTestConstants` — `WAGER`, `MIN_WAGER`, `STARTING_BALANCE`, `DEFAULT_INVITE_SECRET`. A new
  shared constant goes here, and nowhere else.
- `DuelMeFixture` — the starting position for every suite that duels: `PlainUsdt` + a forwarder
  named from `ForwarderConfig.NAME` + `DuelMe`, alice and bob funded and approved,
  `DEFAULT_INVITE_HASH` read back off the contract, plus `_createAndFundDuel`,
  `_createFundAndClaim` and `_assertPayouts`. Call `_deployFixture()` from `setUp`. Extra players
  get `_fund(player)`; a suite needing a different token overrides `_deployToken()`, as
  `DuelMeTokenSafety` does for fee-on-transfer.
- `MetaTxSigner` — EIP-712 signing for the ERC-2771 and EIP-2612 suites, which build on it
  instead of `DuelMeFixture` because they need signer keys rather than plain addresses. It
  re-exports the same constants and `ForwarderConfig.NAME`.
- `PlainUsdt` — the wager token for suites that only need a balance. `src/MockUSDT.sol` is the
  testnet deployment and carries mainnet USD₮0's permit quirks; use it only when testing permits.

Re-declaring `WAGER`, `MIN_WAGER`, `DEFAULT_INVITE_SECRET` or a forwarder name in a suite means
that suite is testing a different world than its neighbours — which is the drift the helpers were
extracted to stop. The per-suite test counts in `contracts/README.md` are what to check a refactor
against.

## Key Files

| File | Purpose |
|------|---------|
| `contracts/src/DuelMe.sol` | Core duel contract |
| `contracts/script/ForwarderConfig.sol` | Forwarder EIP-712 domain name shared by both deploy scripts |
| `contracts/script/TokenFeeProbe.sol` | Deploy-time check that the wager token delivers transfers in full |
| `contracts/test/helpers/DuelMeFixture.sol` | Shared `setUp` for the duel suites (token + forwarder + contract + funded alice/bob) |
| `contracts/test/helpers/DuelMeTestConstants.sol` | The one home for `WAGER`, `MIN_WAGER`, `DEFAULT_INVITE_SECRET`, `STARTING_BALANCE` |
| `scripts/sync_readme_contract_addresses.py` | Sync README contract block from `run-latest.json` |

## Common Pitfalls

- Only `contracts/broadcast/{Deploy,DeployMainnet}.s.sol/<chainId>/run-latest.json` is tracked; timestamped `run-*.json` ignored via top-level `.gitignore`.
- Manual deploys here: source `contracts/.env` first (`set -a && . ./.env && set +a`).
- **Do not enable `via_ir`, and leave `optimizer_runs` at 200.** Measured on this contract:
  `runs = 1000` changes runtime gas by under 0.1% while growing the deployed bytecode from 21.4 KB
  to 23.8 KB — 97% of the 24 KB limit. `via_ir` does shrink it (19.2 KB) and shaves ~7% off
  `getDuel`, but the IR pipeline caches `block.timestamp` across cheatcode calls inside a test
  function, so a second `vm.warp(block.timestamp + …)` silently warps from the stale value and
  time-based tests pass or fail for the wrong reason. Probe before reconsidering:
  two warps in one test must add up.
- **`abi.encodeCall` cannot name an overloaded function.** Only `createDuel` still has arity
  variants (with and without a message); everything added since got its own name (`createDuelFor`,
  `claimPayoutTo`, …) precisely so Solidity callers keep `abi.encodeCall`. Where an overload is
  unavoidable, use `abi.encodeWithSignature("createDuel(uint256,bytes32)", …)`. viem resolves
  overloads from the argument list, so the frontend is unaffected either way.
- **`duelMeAbi` and `DuelState` in `contracts.ts` are hand-made mirrors of the contract**, and a
  wrong entry does not fail to compile — it encodes a selector that does not exist, or reads
  `Resolved` as `Refunded`. `frontend/src/lib/__tests__/contractMirrors.test.ts` pins both: the ABI
  against `contracts/out/DuelMe.sol/DuelMe.json` entry for entry, and the enum numbering against
  the same table as `testDuelStateNumbering` in `DuelMe.t.sol`. `contracts/out/` is build output
  and is not committed, so the ABI half **skips** when it is missing — run `forge build` before
  trusting a green local frontend suite. CI cannot skip it: the `frontend` job builds the contracts
  first, and a second assertion fails whenever `CI` is set and the artifact is absent.
- **The invite hash formula is the contract's**: `DuelMe.hashInviteSecret` is public, so the tests
  read it off the contract instead of mirroring it. `frontend/src/lib/invite.ts` still reproduces it
  (`keccak256(abi.encode(address(this), chainid, secret))`) because it has to hash before the duel
  exists; both sides are pinned to one golden vector — `testInviteHashGoldenVector` in
  `DuelMeInvites.t.sol` and "matches the vector the contract produces" in `invite.test.ts`. A
  divergence fails as `"Invalid invite"` on a duel nobody can join.
- **Every new entry point whose required state is `Created` goes through `_requireWaitingDuel`,
  and `Created` never gets the enum's zero value.** Why, and what it cost the first time: see the
  `DuelState.Nonexistent` bullet under "Smart Contract".
- **Add an action to `DuelMeHandler` and you must also add it to `testHandlerDrivesAFullLifecycle`.**
  The invariant suite (`contracts/test/DuelMeInvariant.t.sol`) asserts the contract never owes more
  USDT than it holds, but every handler action swallows its own revert — so without that lifecycle
  test the whole run can go green over duels that never got past `Created`. Payouts stay derived
  (see "Smart Contract"); a stored payout field would give the invariant something new to catch.
- Three contract-side rules live in `frontend/CLAUDE.md`, beside the code that depends on them:
  `ForwarderConfig.NAME` has a copy there (the `FORWARDER_NAME` pitfall); `MockUSDT` keeps USD₮0's
  permit quirks so dev catches mainnet permit bugs (the USD₮0 pitfalls); a new player-facing
  function is relayed only once it is in `RELAYABLE_DUEL_FUNCTIONS` ("Gasless Duel Actions").

Source of truth for current deploys: `contracts/broadcast/Deploy.s.sol/421614/run-latest.json` (Arbitrum Sepolia / dev) and `contracts/broadcast/DeployMainnet.s.sol/42161/run-latest.json` (Arbitrum One / prod), mirrored into `README.md` and `frontend/src/lib/constants.ts`.
