---
name: review-pr
description: Review a pull request or current branch changes. Checks code quality, security, and consistency.
allowed-tools: Bash, Read, Grep, Glob
---

Review code changes in the current branch or a specified PR.

Arguments: $ARGUMENTS (optional: PR number or branch name. Default: current uncommitted changes)

Read `CLAUDE.md` first, then the `CLAUDE.md` of every area the diff touches (`contracts/`,
`frontend/`, `backend/`, `ops/`; `ops/` also covers `.github/`) — the standards below are theirs, abbreviated. Where this file and
a CLAUDE.md disagree, the CLAUDE.md wins and this file is the bug.

## Steps

1. Get the diff:
   - If PR number given: `gh pr diff $ARGUMENTS`
   - If branch name given: `git fetch --prune origin` (stop if it fails), then
     `git diff origin/dev...origin/$ARGUMENTS` — the pushed branch against `dev`, which feature
     PRs target. If the branch was never pushed, diff `origin/dev...$ARGUMENTS`; if you also
     have it locally with commits the remote lacks (`git log origin/$ARGUMENTS..$ARGUMENTS`),
     name them in the output as not reviewed. For a PR into another base, pass its number instead.
   - Otherwise: `git diff HEAD` (staged **and** unstaged; plain `git diff` misses staged changes)

   An empty diff means the wrong range: report that instead of a verdict.

2. For each changed file, check:

### Solidity (`contracts/`)
- Reentrancy: CEI order, and `nonReentrant` on every new **player-facing** state-mutating
  function. `onlyOwner` entry points deliberately carry no guard — not a finding.
- Every admin path — `_checkOwner` (behind every `onlyOwner`), the `acceptOwnership` override,
  any new owner check — reads `msg.sender`, never `_msgSender()`.
- `whenNotPaused` only on entering a duel or declaring a result — today `_createDuel` and
  `_joinDuel` (every create and join entry point must reach them; the external ones carry none),
  `declineDuel`, `claimVictory`, `admitDefeat` — never on a path that returns a player's money.
  `declineDuel` refunds the creator yet is pausable on purpose: the creator's own exit,
  `cancelDuel`, stays open.
- `SafeERC20` everywhere; no raw `.transfer()` / `.transferFrom()`.
- Both `contracts/script/Deploy*.s.sol` still run `TokenFeeProbe`, and no new code assumes
  `_pullWager` refuses a fee-taking token: it has no check, by design, because the token is
  vetted once, at deploy.
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
  `ops/docker-compose.*.yml` and the Environment list in the area's `CLAUDE.md` all updated.
- No debug logs, `console.log`, commented-out blocks, or `TODO` comments.
- Files ≤300 lines; no constant, type or helper duplicated instead of imported.
- The area's `CLAUDE.md` kept in sync: Key Files entries for new or moved files, new gotchas in
  Common Pitfalls.

## Output

Summarize as: Approve / Request Changes / Comment
List specific issues with file:line references.
