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
   - Report coverage percentages per file
3. If $ARGUMENTS contains a specific test name:
   - Run `forge test --match-test "$ARGUMENTS" -vvvv`
4. Otherwise:
   - Run `forge test -vv`
5. Parse output and report:
   - Total tests passed / failed / skipped
   - For failures: show the failing test name, expected vs actual, and the relevant line in the test file
6. If all tests pass, say so concisely
