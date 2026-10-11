# DuelMe

P2P gaming duel platform — players wager USDT in 1v1 duels via smart contracts on Ethereum L2s. Zero fees, honor-based result reporting with on-chain reputation.

## Monorepo Structure

```
contracts/   — Solidity smart contracts (Foundry)
frontend/    — Next.js web app (App Router)
backend/     — Java 25 + Spring Boot 4 API (Gradle)
ops/         — Docker Compose, Caddy config
```

## Where the rules live

This file holds what every change needs. Each area keeps its own rules, Key Files table,
Environment variables and Common Pitfalls in a `CLAUDE.md` of its own:

| Working in | Read |
|---|---|
| `contracts/` | `contracts/CLAUDE.md` — contract design decisions, Solidity standards, Foundry helpers, ABI sync |
| `frontend/` | `frontend/CLAUDE.md` — wallet, write flows, data fetching, the gas relayer (`/api/relay`), UI standards, CSP hosts |
| `backend/` | `backend/CLAUDE.md` — layering, MongoDB indexes, native-image details, OpenAPI |
| `ops/`, `.github/` | `ops/CLAUDE.md` — environments, CI jobs, deploy, Caddy |

A directory's `CLAUDE.md` is attached to the session when a file in it is read or edited with the
file tools, not when it is read through the shell (`cat`, `grep`, `sed`): open the area's file
yourself before you change code there. A change that crosses areas — the ABI, contract addresses, the
relayer and permits — needs the file of every area it touches.

## Commands

**Frontend (`frontend/`):** `npm run dev` (localhost:3000) · `npm run build` · `npm run lint` · `npx tsc --noEmit` · `npm test` (Vitest) · `npm run test:watch`

**Backend (`backend/`):** `./gradlew build` (JDK 25 via toolchain) · `./gradlew bootRun` (localhost:8080, needs MongoDB) · `./gradlew test` (embedded MongoDB via Flapdoodle) · `./gradlew bootJar` · `./gradlew nativeCompile` (~5–10 min, ~50ms startup, ~60MB RSS) · `./gradlew nativeTest` · `docker compose up -d` (local MongoDB)

**Contracts (`contracts/`):** `forge build` · `forge test` · `forge test -vvv` · `forge coverage --report summary`. The fork suite and when it skips: "Commands" in `contracts/CLAUDE.md`.

## Git Conventions

- **Never** run `git add` / `commit` / `push` (or any equivalent like `git commit -a`, `git push --force`, `gh pr create`) unless the user explicitly asks for THAT specific action in their current message. Permission is per-action and per-message; past authorization does not carry forward. Read-only git commands (`status`, `diff`, `log`, `show`) are fine. After changes, stop at the working tree and report the diff — wait before staging/committing/pushing.
- **Never** add `Co-Authored-By` or any Claude attribution to commits.
- Don't amend existing commits unless explicitly asked.
- Commit messages: in English, imperative mood ("Add X" not "Added X"); first line ≤72 chars; body for non-obvious context.
- **PRs** are written in English and open as drafts, and only QA marks one ready for review, after a PASS; a push after the PASS returns the PR to draft and to QA. Their description is the short, plain-language one `.github/pull_request_template.md` lays out — **Why**, **How** and a **Checks** table, readable in under a minute — and its Checks are kept true at the head commit, because the merge decision is made from them. Each review finding and its verdict go on the task in Paperclip, never into the PR. Dependabot's PRs (the bot rewrites their description) and `dev` → `main` releases are exempt from the Checks section and from the loop below, not from QA or CI: see "QA on Dependabot's PRs and releases" below, which also says where Dependabot's differ on drafts.
- **Review loop before the QA handoff**, in this order. `/review-pr <n>` and `/code-review <n>` read the pushed PR, so the draft PR is opened before step 2 and each round's fixes are pushed before the next round; a request to run the loop covers opening that draft PR and the commits and pushes to its branch that the loop needs. Snapshot the work before every auto-fix — a `git diff --binary HEAD` patch plus copies of untracked files is enough — and re-read what it changed against the spec: auto-fixes have rewritten explicit requirements before.
  1. `/simplify origin/<base>...HEAD` once on code changes; without the range it sees only uncommitted work.
  2. `/review-pr <n>` once, for this repo's conventions.
  3. `/security-review` when `contracts/src/` changes, and again whenever a later fix touches it.
  4. `/code-review xhigh <n>` once. No round — this one or any later — runs with `--comment`: findings are triaged before anything reaches the PR, and every finding gets a verdict: fixed, rejected with the reason, or deferred.
  5. Anything more is decided case by case, and the reason goes into the Checks section. Run another round when the last one found something serious — wrong behaviour, or a security, money or data risk — and it was fixed, or when something else changed the diff after it (a CI fix, a conflict resolution, a fix after QA). Minor findings are fixed or deferred without a new round. `max` is only for a diff that touches `contracts/`, the relayer, permits, payouts or auth, and runs separately from the other steps, still before the QA handoff — it is by far the slowest and costliest step. If a fourth round still finds serious bugs, stop before fixing them and ask the CEO.
- **QA on Dependabot's PRs and releases.** Neither kind is merged without QA's PASS on its current head and green CI there, `backend-native` included: a FAIL, red or unfinished CI, or missing evidence blocks ready-for-review and the merge, which stays the CEO's. QA posts its verdict as a comment on the PR: PASS or FAIL, the head SHA it covers (a release's also names its base SHA) and a link to the evidence. Dependabot opens its PRs ready for review rather than as drafts. Leave them so, even when the bot pushes a new head after a PASS, which sends the PR back to QA; for these PRs, ready for review is no clearance to merge. A `dev` → `main` release gets its own short verdict on its current head and base SHAs: what the release contains, a link to each included change's PASS, CI at the head, and a targeted check of whatever no earlier PASS covers — a change merged without one, commits made for the release or to integrate its changes, and resolved conflicts. It neither repeats each PR's checks nor runs the review loop. A release goes back to QA after new commits on `dev` or a moved `main`, and if it was opened as a draft, QA marks it ready for review after the PASS.

## Native Image Compatibility (CRITICAL)

**Production backend ships as a GraalVM native image.** Dev runs JVM, so a change can pass `./gradlew test`, deploy fine to dev, and still **silently break prod**. "Tests pass" ≠ "ready to merge".

The `backend-native` CI job (`./gradlew nativeCompile` on every push/PR to `dev`/`main`) is **the gate**. `build-prod` lists it in `needs:`, so a red `backend-native` blocks prod deploy. Do not add `if:` conditions — GitHub Actions treats skipped needs as success. If `backend-native` is red, do not merge to `main`.

What commonly breaks, and the local check before merging to `main`: "Native Image" in
`backend/CLAUDE.md`.

## Architecture

`contracts/` holds `DuelMe`, which escrows both USDT wagers and enforces every duel rule itself.
`frontend/` (Next.js) reads and writes the contract directly through wagmi/viem with Privy wallets,
and hosts the gas relayer behind `/api/relay` ("Gasless Duel Actions" in `frontend/CLAUDE.md`).
`backend/` (Spring Boot + MongoDB) keeps only off-chain data: profiles, social links, the game
catalogue and duel metadata, the testnet faucet. Environments and deploys: `ops/CLAUDE.md`.

## Duel States

```
Nonexistent(0)  — an id nobody issued; never a duel
Created(1) → Funded(2) → WinnerClaimed(3) → Resolved(4)      (confirmResult)
                                          → Refunded(5)      (refund, after the claim timeout)
                                          → Disputed(8)
Funded(2) → Resolved(4)                                      (admitDefeat, no confirmation)
Funded(2) → MutualCancelRequested(9) → Funded(2)
                                     → MutuallyCancelled(10)
Created(1) → Cancelled(6)
           → Declined(7)
```

The numbers are part of the contract's API — clients read `state` as a raw integer — and are
pinned on both sides (`testDuelStateNumbering`, `contractMirrors.test.ts`). `Nonexistent` holds
zero so a zeroed mapping slot cannot pass for a duel; see "Smart Contract" in `contracts/CLAUDE.md` for what that
cost the first time.

## Development Standards

### General Principles

- **File size:** ≤300 lines. Extract helpers/sub-components/composable hooks when approaching the limit. One file = one purpose (SRP). Three files are over it today — `frontend/src/lib/contracts.ts` (the ABI mirror, which must stay a literal copy of the artifact), `frontend/src/app/duel/[id]/page.tsx` and `frontend/src/components/layout/Header.tsx`. The last two are debt, not precedent: don't add to them.
- **DRY:** single source of truth for every constant/type/helper/ABI. See `constants.ts` / `contracts.ts`.
- **YAGNI:** build what the task requires. No abstractions for hypothetical futures. Three similar lines beats a premature abstraction.
- **Fail fast:** validate at system boundaries (user input, API, contract calls). Inside, trust the types. Never silently swallow errors.
- **Self-review before "done":** `npx tsc --noEmit` · `npm run lint` · relevant tests (`forge test`, `./gradlew test`, `npm run test`) · read the diff for debug code / missing error handling / inconsistent naming. A change that goes into a PR then also gets the review loop under Git Conventions.

### Testing

- **New feature:** tests alongside or immediately after.
- **Bug fix:** failing reproduction test first, then fix.
- **Refactor:** verify existing tests pass before+after, add coverage for uncovered paths.
- Every public surface (contract fn, REST endpoint, exported hook) must have tests.
- **AAA pattern:** Arrange → Act → Assert. One behavior per test. Name `test{Action}{ExpectedResult}`.

**Edge cases always:** zero/max inputs, unauthorized callers, double-execution, empty / boundary-length strings, reentrancy.

**Coverage:** Contracts ≥90%. Backend: all endpoints + service methods (focus auth/validation). Frontend: all `lib/` pure functions.

Each area's `CLAUDE.md` has its own test conventions: the Foundry helpers, Vitest, and JUnit with
embedded MongoDB.

### Documentation

- **CLAUDE.md:** keep this file and the area's `CLAUDE.md` synced with code in the same commit. The area's Key Files table: add new important files, remove deleted or moved ones. Add non-obvious gotchas to the area's Common Pitfalls, and here only when every area needs them. State each rule once — when a rule already lives in a section, point at it rather than restating it, because the copy is what goes stale.
- **Code comments:** explain "why", never "what". Use for non-obvious business rules, external-bug workarounds, performance-critical decisions. TODO comments banned in committed code — file an issue.
- **Commit messages:** see Git Conventions above.

### Subagent Quality Requirements

**Subagents do NOT receive CLAUDE.md automatically.** Every Agent prompt must begin with:

> "Read `CLAUDE.md` in the repository root first, then the `CLAUDE.md` of each area you will touch (`contracts/`, `frontend/`, `backend/`, `ops/`) — they contain project conventions, development standards, and quality requirements you must follow."

And must require:
- **Context loading:** read the root and area CLAUDE.md files and relevant source files before writing code.
- **Code quality:** follow existing patterns; no duplicated constants, oversized functions, or `any` types; must pass `npx tsc --noEmit`, `npm run lint`, `forge build`, `./gradlew build`; handle errors at boundaries.
- **Tests:** any subagent that writes implementation code also writes tests.
- **Self-review:** re-read modified files for inconsistencies / unused imports / dead code / debug statements; confirm naming matches conventions; run relevant tests.

## Environment

Runtime config source of truth: GitHub repository/environment secrets. Deploy workflow writes them into `~/apps/duelme-{dev,prod}/.env` over SSH before `docker compose up`. When adding a new runtime variable, update `.github/workflows/ci.yml`, the matching `ops/docker-compose.*.yml`, and the Environment list in the `CLAUDE.md` of the area that reads it.

- Chains: Arbitrum One (42161) prod, Arbitrum Sepolia (421614) dev. Build-time `NEXT_PUBLIC_DEFAULT_CHAIN_KEY` (`arbitrum` / `arbitrumSepolia`) selects.
- Contract addresses: `DUELME_ADDRESSES` map in `constants.ts`, mirrored for the backend by
  `duelme.contracts.duel-me` in `application.yml` (not an env var, same reasoning as the faucet
  token in `backend/CLAUDE.md`). A redeploy edits both in the commit that edits the broadcast artifact.

## Common Pitfalls

- USDT has a blocklist — keep payouts pull-based, no push transfers.
- **Contract addresses and chain ids have exactly one source.** `contracts/broadcast/*/run-latest.json` is what is deployed; `constants.ts` mirrors it by hand; everything else reads `constants.ts`. Never inline an address or a chain id anywhere else — `getUsdtAddress` once kept its own copy "to avoid a circular import" (`constants.ts` imports nothing, so there was no cycle), and after a MockUSDT redeploy the permit path read `nonces()` off the previous token, so duels failed with a revert that named no address. `deployedAddresses.test.ts` pins `constants.ts` and both of `application.yml`'s address copies (the faucet token and `duelme.contracts.duel-me`) to the broadcast artifact; `contractAddresses.test.ts` pins `getUsdtAddress`, `CHAIN_NAMES` and the forwarder map to `constants.ts`. Both run in the `frontend` CI job (`npm test`).
- **A duel id identifies a duel only together with the contract it came from.** Ids are handed out
  by `duelCount`, which restarts at zero on every redeploy, so after a same-chain redeploy duel 3
  is a different duel than yesterday's duel 3. Anything keyed on `{duelId, chainId}` silently
  matches the wrong duel — it has already bitten stored invite secrets (`lib/invite.ts`) and duel
  metadata (`DuelMeta`), and in both cases the symptom was a wrong answer, never an error. Key on
  the contract address too, and take it from `DUELME_ADDRESSES[chainId]`.

Source of truth for current deploys: `contracts/broadcast/Deploy.s.sol/421614/run-latest.json` (Arbitrum Sepolia / dev) and `contracts/broadcast/DeployMainnet.s.sol/42161/run-latest.json` (Arbitrum One / prod), mirrored into `README.md` and `frontend/src/lib/constants.ts`.
