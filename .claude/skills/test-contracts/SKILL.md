---
name: test-contracts
description: Run Foundry tests for DuelMe contracts with coverage report. Use when asked to test contracts or after contract changes.
allowed-tools: Bash, Read, Grep
---

Run smart contract tests and report results.

Arguments: $ARGUMENTS (optional: specific test name or "--coverage" for coverage report)

## Steps

1. `cd contracts/`
2. If $ARGUMENTS contains "--coverage":
   - Run `forge coverage --report summary`
   - Report coverage percentages per file. The target is ≥90% lines on `src/DuelMe.sol`,
     emergency and admin paths included.
3. If $ARGUMENTS contains a specific test name:
   - Run `forge test --match-test "$ARGUMENTS" -vvvv`
4. Otherwise:
   - Run `forge test -vv`
5. Parse output and report:
   - Total tests passed / failed / skipped
   - For failures: the failing test name, expected vs actual, and the relevant line in the test file
6. If all tests pass, say so concisely.

## Reading the result

- **Skipped is normal.** `test/UsdtPermitFork.t.sol` forks Arbitrum One and skips its 5 tests
  unless `ARBITRUM_RPC_URL` is set — `set -a && . ./.env && set +a` first if you want them. Do not
  report the skip as a failure, and do not report a run without them as full coverage of the
  permit path: mainnet USD₮0's EIP-712 domain is the thing Sepolia cannot reproduce.
- **`contracts/README.md` lists the expected test count per suite.** After a refactor, compare
  against it — a suite that lost tests silently is the failure this catches.
- The invariant suite runs with `fail_on_revert = true` (`foundry.toml`). Every handler action
  swallows its own revert, so anything that escapes to the runner is a real failure, not fuzz noise.
- A green `forge test` does not mean the frontend agrees with the contract. If the ABI or the
  `DuelState` enum changed, run the `sync-abi` skill and then `npm test` from `frontend/`.
