---
name: review-pr
description: Review a pull request or current branch changes. Checks code quality, security, and consistency.
allowed-tools: Bash, Read, Grep, Glob
---

Review code changes in the current branch or a specified PR.

Arguments: $ARGUMENTS (optional: PR number or branch name. Default: current uncommitted changes)

Read `CLAUDE.md` first — the standards below are its standards, abbreviated. Where this file and
CLAUDE.md disagree, CLAUDE.md wins and this file is the bug.

## Steps

1. Get the diff:
   - If PR number given: `gh pr diff $ARGUMENTS`
   - If branch name given: `git fetch origin`, then `git diff origin/dev...$ARGUMENTS` (feature
     PRs here target `dev`; use `origin/$ARGUMENTS` for a branch not checked out locally)
   - Otherwise: `git diff HEAD` (staged **and** unstaged; plain `git diff` misses staged changes)

2. For each changed file, check:

### Solidity (`contracts/`)
- Reentrancy: CEI order, and `nonReentrant` on every new **player-facing** state-mutating
  function. `onlyOwner` entry points deliberately carry no guard — not a finding.
- `onlyOwner` paths (via `_checkOwner`) and the `acceptOwnership` override resolve their caller
  through `msg.sender`, never `_msgSender()`.
- `whenNotPaused` only on entering a duel (create, join, decline) and declaring a result
  (`claimVictory`, `admitDefeat`), never on a path that returns a player's money.
- `SafeERC20` everywhere; no raw `.transfer()` / `.transferFrom()`.
- Events emitted for every state change; payouts still derived by `_payoutOf`, never stored.
- Tests cover the change, including every new revert condition.
- Contract changed ⇒ `duelMeAbi` in `frontend/src/lib/contracts.ts` updated in the same PR.

### Frontend (`frontend/`)
- TypeScript: proper types, no `any`, no unchecked `as`.
- React: correct hook dependencies, no stale closures, no async directly in `useEffect`.
- Wallet: `createConfig` from `@privy-io/wagmi`; chain check before a write; writes go through
  `useDuelActions` / `useWriteWithGas`, never a bare `writeContract` (Privy signs with all-zero
  gas otherwise).
- Addresses and chain ids read from `constants.ts` — never inlined.
- i18n: every new visible string has an `en` **and** `ru` key in the matching
  `frontend/src/i18n/translations/<section>.ts`.
- **Mobile-first**: 360–640px is the primary target, tap targets ≥44×44px, no horizontal scroll at
  360px, multi-column layouts have an explicit stacked fallback. Check this on every UI diff.
- Loading and error states present; errors surfaced through `useAppToast()`, never swallowed.

### Backend (`backend/`)
- Layering: controller → service → repository, no repository call from a controller, no business
  logic in a controller.
- Records for DTOs and documents; constructor injection; no Lombok; no Mongo document returned
  from an endpoint.
- New or changed endpoint ⇒ OpenAPI annotations updated **and** registered in `SecurityConfig`.
- Authorization checked in the service layer, wallet addresses lower-cased at the boundary.
- **Native image**: new reflection, a new static initializer touching I/O, or a new dependency
  means `backend-native` may go red and block the prod deploy. Flag it; hints live in
  `NativeImageHints.java` and `backend/build.gradle.kts`.

### General
- No secrets or env values committed. New runtime var ⇒ `.github/workflows/ci.yml`,
  `ops/docker-compose.*.yml` and `CLAUDE.md` all updated.
- No debug logs, `console.log`, commented-out blocks, or `TODO` comments.
- Files ≤300 lines; no constant, type or helper duplicated instead of imported.
- CLAUDE.md kept in sync: Key Files entries for new or moved files, new gotchas in Common Pitfalls.

## Output

Summarize as: Approve / Request Changes / Comment
List specific issues with file:line references.
