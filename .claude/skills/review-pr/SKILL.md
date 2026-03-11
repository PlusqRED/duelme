---
name: review-pr
description: Review a pull request or current branch changes. Checks code quality, security, and consistency.
allowed-tools: Bash, Read, Grep, Glob
---

Review code changes in the current branch or a specified PR.

Arguments: $ARGUMENTS (optional: PR number or branch name. Default: current uncommitted changes)

## Steps

1. Get the diff:
   - If PR number given: `gh pr diff $ARGUMENTS`
   - If branch name given: `git diff main...$ARGUMENTS`
   - Otherwise: `git diff` (staged + unstaged)

2. For each changed file, check:

### Solidity (`contracts/`)
- Security: reentrancy, access control, input validation
- Gas efficiency: storage reads, loops, memory vs calldata
- Events emitted for state changes
- Tests cover the changes

### Frontend (`frontend/`)
- TypeScript: proper types, no `any`, no type assertions where avoidable
- React: proper hook dependencies, no stale closures
- Wallet: uses Privy wagmi adapter correctly, chain switching before tx
- i18n: both EN and RU translations added for new strings
- UI: loading states, error handling, responsive design

### General
- No secrets or env values committed
- No debug logs or console.logs left in
- No commented-out code blocks
- Consistent with existing code style

## Output

Summarize as: Approve / Request Changes / Comment
List specific issues with file:line references.
