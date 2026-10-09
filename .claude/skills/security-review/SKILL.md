---
name: security-review
description: Security audit for DuelMe smart contracts. Use before deploying to mainnet or after significant contract changes.
allowed-tools: Bash, Read, Grep, Glob
---

Perform a security review of DuelMe smart contracts.

Arguments: $ARGUMENTS (optional: specific file path, default: all contracts in `contracts/src/`)

Read `CLAUDE.md` → "Smart Contract" under Architecture Decisions first. Several items below are
rules that already hold and exist for a reason; the job is to check nothing has drifted off them,
not to re-litigate them.

## Checklist

Read all Solidity files and check for:

### Critical
- [ ] Reentrancy: CEI order (state written before the token call)? `nonReentrant` on every
      **player-facing** state-mutating function? (`onlyOwner` entry points deliberately have no
      guard — that is not a finding.)
- [ ] Access control: `onlyOwner` where it belongs, and do every `onlyOwner` path (via the
      `_checkOwner` override) and the `acceptOwnership` override resolve their caller through
      `msg.sender`, not `_msgSender()`? A relayable admin path means one owner signature can be
      replayed through the forwarder by whoever picks it up.
- [ ] Pause policy: `whenNotPaused` only on entering a duel (create, join, decline) and declaring
      a new result (`claimVictory`, `admitDefeat`). Anything that hands a player money back —
      `confirmResult`, `disputeResult`, `refund`, `cancelDuel`, the mutual-cancellation flow,
      every claim — must stay callable while paused.
- [ ] `DuelState.Nonexistent` still holds the enum's zero value, and every entry point whose
      required state is `Created` still goes through `_requireWaitingDuel`.
- [ ] Payouts still derived by `_payoutOf`, never stored on the duel.
- [ ] Integer overflow/underflow (Solidity 0.8+ has built-in, but check `unchecked` blocks and
      every downcast into `uint96` / `uint64` / `uint40` / `uint16`).
- [ ] Token handling: `SafeERC20` for all transfers? No raw `.transfer()`? The wager token is
      vetted once, at deploy: do `contracts/script/Deploy.s.sol` and
      `contracts/script/DeployMainnet.s.sol` both still run
      `TokenFeeProbe.requireNoTransferFee`, and is `usdt` still `immutable`? `_pullWager` is a
      bare `safeTransferFrom` with no balance-delta check, and that is deliberate, not a finding —
      but new code must not rely on a fee-taking token being refused per wager. A fee switched on
      after deploy is `pause()`'s job (`testFeeSwitchedOnAfterDeployUnderCollateralisesTheDuel`).
- [ ] USDT-specific: blocklist risk covered by pull payouts plus the `*To` destinations? Permit
      path still tolerant of a front-run `permit` (the `try/catch` + allowance check)?
- [ ] State machine: can any transition be skipped, replayed, or reached from the wrong state?

### High
- [ ] Front-running: can tx ordering be exploited?
- [ ] Timestamp dependence: is `block.timestamp` used safely?
- [ ] DoS: can any function be griefed to always revert?
- [ ] Fund lock: can funds get permanently stuck? (Known and accepted: a `Funded` duel has no
      unilateral exit while paused.)
- [ ] Emergency: USDT reachable only through the timelock; `rescueToken` still refuses USDT.

### Medium
- [ ] Event emission: all state changes emit events, with the recipient the indexer needs?
- [ ] Input validation: all require() checks present?
- [ ] Gas: unbounded loops? Storage vs memory? Does a batch read still fit one call?
- [ ] Centralization: what can the owner do, is each power floored by a constant, is it documented?

### Low
- [ ] Naming: consistent, no shadowing?
- [ ] Dead code: unused functions or variables?
- [ ] Compiler version: sources carry `pragma solidity ^0.8.34` and `contracts/foundry.toml` pins
      `solc = "0.8.34"`. The pin is what makes the build reproducible — flag a change to it, not
      the caret.

## Output

Report findings grouped by severity (Critical / High / Medium / Low / Informational).
For each finding: title, description, location (file:line), recommendation.
End with a summary: "X critical, Y high, Z medium, W low findings."
