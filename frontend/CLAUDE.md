# Frontend (`frontend/`)

Rules for the Next.js app, which also hosts the gas relayer. The root `CLAUDE.md` applies here
too. Next.js 16 differs from older releases; its
version-matched docs are in `node_modules/next/dist/docs/`. `next dev` would point at them from an
untracked `AGENTS.md` here; `agentRules: false` in `next.config.ts` turns that off, since the area's
rules live in this file.

## Architecture

### Wallet Integration
- `createConfig` must be imported from `@privy-io/wagmi`, NOT `wagmi`
- `setActiveWalletForWagmi` prop on `<WagmiProvider>` ensures Privy embedded wallet beats MetaMask
- Chain switching via wagmi's `useSwitchChain` (not Privy's `switchChain`)

### Transaction Pattern
Write ops, relayed: check chain → sign EIP-2612 permit (funding calls only) → sign
ForwardRequest → POST `/api/relay`. Self-paid: check chain → check allowance → approve if
needed → execute. `useDuelActions` binds each duel action on top of `useWriteWithGas`, picks
between the two paths from `useRelayerStatus` (which the server fills in with the page) and swaps
in the `*WithPermit` variant when the write is relayed (see "Gasless Duel Actions" below).
`createDuel` generates a private invite secret client-side and sends only its hash on-chain;
`joinDuel`/`declineDuel` use the secret. Payouts are pull-based — terminal duel flows expose
claimable balances, never push transfers.

Every duel write is signed in one window, `components/sign/SigningWindow.tsx`: Check (what each
signature or transaction does, what the wallet needs, the facts, the technical details folded
away), then the network switch, the signatures or transactions one by one, the chain confirming,
and Done or the error with its details. `ActionSigningWindow`, `JoinSigningWindow` and
`CreateSigningWindow` turn the flows' props (`useActionFlow`, `useJoinDuelFlow`,
`useCreateDuelFlow`) into its model; the one-transaction answers (cancel, decline, the call-off
answers) go through `useActionFlow` too, never a toast. One press of the main button carries the
flow through every wallet step it reaches (`useSigningPress`). The flows move by one reducer
(`lib/flowSession.ts`) and follow their write with one lifecycle (`useFlowLifecycle`); a failure
reaches the window as a `FlowError` (`lib/flowError.ts`) in `errorMessage`, and the write's
progress as `signing` (on the review gate for join and create, on the flow for actions).

### Data Fetching
- wagmi `useReadContract` / `useReadContracts` (multicall) for on-chain reads
- React Query with `refetchInterval: 10_000, staleTime: 0` for live data. The paged duel readers
  in `useDuelReads.ts` are the exception on both counts: one shared `DUEL_POLL_INTERVAL` of 15s,
  used as `staleTime` too. They read the contract's whole history, so they are the largest
  recurring cost the app has — and `staleTime: 0` made every screen that mounted one download all
  of it again. Player-initiated changes do not wait for the interval; every duel write calls
  `refetch()` on success.
- The wallet menu's safe and pip (`useOwed`) mount that same history read in the top bar, so a
  signed-in wallet reads it on every page — once, shared with any list on the page. If that cost
  grows, the pip moves to the pages that read the history anyway; it does not get a reader of its own.
- Always `refetch()` + `reset()` after successful write transactions
- Header / wallet balances use `frontend/src/lib/balanceRefresh.ts` event bus + 30s poll fallback

### Gasless Duel Actions (ERC-2771)
`DuelMe` trusts one immutable `ERC2771Forwarder`, set at deploy. The client signs an EIP-712
`ForwardRequest`. `/api/relay` caps POSTs per client IP, refuses anything outside
`RELAYABLE_DUEL_FUNCTIONS`, answers a repeat of a request it already sent with that
transaction's hash, holds back a signer whose last relayed transaction has no receipt yet,
and runs `forwarder.verify` and a simulation of `execute` *before* the request may queue for
the relayer lock, so a request that would revert never holds a place in the queue. Under the
lock it repeats the hold, `verify` and the simulation (a transaction sent meanwhile can
change them), meters a per-address daily gas budget under a relayer-wide daily ceiling, and
signs and sends `forwarder.execute`, one transaction at a time; receipts are awaited after
the lock, so several sent transactions can be waiting to be mined at once. Funding uses EIP-2612 —
`createDuelWithPermit` / `joinDuelWithPermit` — so no separate `approve` is needed. There is
no automatic fallback: once `useRelayerStatus` reports relaying on, `useDuelActions` routes
every relayable duel write through `/api/relay` and the signing flows pin `needsApproval` to
false, so a refusal (spent daily budget, `"Permit failed"` on a delegated EOA) surfaces as an
error rather than reverting to the self-paid approve path. Relaying being *off* — no forwarder
address, no relayer key — is the case the self-paid path still covers.

## Standards (Next.js / React / TS / Tailwind)

**Mobile-first — non-negotiable.** Treat mobile as primary, not afterthought. Design at 360–640px first; `sm:`/`md:`/`lg:` are enhancements.
- Tap targets ≥44×44px. No horizontal scroll at 360px. No hover-only affordances.
- Multi-column layouts need explicit mobile fallback (usually vertical stack).
- Fixed elements respect browser chrome / safe areas.
- Always check mobile rendering when reviewing UI diffs.

**UI verification (Playwright + screenshots)** for any layout / visual / responsive / interactive change:
1. `npm run lint && npm run build` from `frontend/`.
2. Start fresh dev server on a free port — don't trust an existing `3001`/`3002`. Example: `npm run dev -- --hostname 127.0.0.1 --port 3010`.
3. Install Chromium once if missing: `npx playwright install chromium`.
4. Run relevant e2e when present: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3010 npm run test:e2e -- e2e/<file>.spec.ts`. Report unrelated failures explicitly.
5. Screenshot desktop + mobile (`--viewport-size=390,844`) with `--wait-for-timeout=3000 --full-page` to avoid first-frame loading screenshots.
6. Inspect screenshots — check overlapping text, clipped buttons, horizontal scroll, broken spacing, primary action visibility.
7. Clean up: delete screenshots and stop temporary dev server unless user asked you to leave them.

**Components:**
- Functional + hooks only. `function` keyword (not arrow). Named exports only — the exception is the App Router files Next requires a default export from (`page.tsx`, `layout.tsx`, `sitemap.ts`, `robots.ts`, `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`, `twitter-image.tsx`), and those are the only default exports in `frontend/src`.
- TypeScript strict — no `any`, no unchecked `as`. Narrow unknown data with a hand-written type guard; there is no schema library in the frontend and adding one is a dependency decision, not a detail.
- Props interface `{ComponentName}Props` directly above component.
- One exported component per file (small internal helpers <30 lines are fine). Guard clauses first, happy path last.
- Extract reusable logic to `hooks/`, pure logic to `lib/`.
- `'use client'` only when browser APIs needed. Server components by default.
- No barrel files (`index.ts` re-exports) in component dirs — breaks tree-shaking.

**Hooks:**
- Named `use{Feature}`, one concern each. Return objects (not arrays) for >2 values.
- Contract reads via `useReadContract` / `useReadContracts` with explicit `query` config (`enabled`, `refetchInterval`, `staleTime`).
- Memoize expensive computations (`useMemo`) and child callbacks (`useCallback`).
- No async directly in `useEffect` — extract to a function or use React Query.

**State:** URL state for nav-relevant; `useState` for ephemeral UI; React Query for server/contract (never manually sync remote data into `useState`); Context only for cross-cutting concerns.

**Styling:** Tailwind utility classes only, through `cn()` from `lib/utils.ts`; no CSS modules. Colours, type and motion come from the theme — the rules, and the one exception for inline styles, are under "Design" below.

**Errors:** `try/catch` around wallet/API calls. Toast errors via `useAppToast()` — no silent failures. Parse contract reverts to human-readable. Check `res.ok` before parsing API responses.

**Performance:** `next/dynamic` + `{ ssr: false }` for wallet-dependent UI. `useMemo` for derived lists. Don't create objects/arrays in render. `next/image` with explicit width/height + `loading="lazy"` for below-fold.

**i18n:** All visible strings via `useTranslation()` in a client component, or `await getTranslation()` (`i18n/serverTranslation.ts`) in a server one. The language is the `duelme-lang` cookie: the root layout reads it, sets `<html lang>` and hands it to `LanguageProvider`, so the server renders the page in it. The switch (`components/header/LanguageSwitch.tsx`, in the top bar and in the phone menu) slides its pill at once, posts the choice as JSON to `/api/language`, which sets the cookie in its response (a cookie the server sets is one Safari keeps for the year; one written by `document.cookie` it drops after a week), and then reloads the page: a full load at the same address, so no part of the page is left in the old language, the hash with a private duel's invite secret never leaves the browser, and the history gains no entry. It was a Server Action with an optimistic switch first, then a form with a redirect back; five review rounds kept finding races and lost hashes, so keep it a post and a reload. The route takes only JSON, which another site's page cannot send without the browser asking first, so it needs no check of where a request came from beyond `Sec-Fetch-Site`. Until the page's script has loaded a press does nothing; a press while a post is still out cancels it, so the last press wins. Another open tab catches up from the cookie, once per language, when it is shown again or focused, comes back from the back/forward cache, or finished loading after the switch. A part that needs no browser API reads the language on the server and stays a server component. Add the key to the matching section file under `frontend/src/i18n/translations/` — with **both** `en` and `ru`; `defineSection` makes a missing `ru` a type error. `translations.ts` only merges the sections. Interpolation is `{token}` placeholders filled from the second argument (`t('dashboard.pageSummary', { current, total })`); there is no ICU, so an ICU `plural` block would render literally. A word that agrees with a number goes through `plural(key, count)` from `useTranslation()` (`i18n/translate.ts`): give the base key `.one`, `.few`, `.many` and `.other` in both languages: Russian picks among the first three for whole numbers, and `.other` is the fallback a key needs to count as a `PluralKey` at all. It returns the word alone and the caller places the number: `{game.duelCount} {plural('games.duelsCount', game.duelCount)}`.

**Naming:** Components `PascalCase.tsx`, hooks `camelCase.ts` prefixed `use`, utils `camelCase.ts`, primitive constants `UPPER_SNAKE_CASE`, object constants `camelCase`, types `PascalCase` (prefer `interface` for object shapes).

## Design

The app is being moved, screen by screen, onto one design. These are its rules. A screen the port
has not reached yet keeps its old layout and colours, though it already has the new type, corners
and controls; the guard tests below list it.

- **Calm, never a casino.** Light surfaces, no neon, no chips or coin piles, nothing that nudges
  toward a bigger stake, plain words.
- **Colour says who or what, and lives on objects, not backgrounds.** Red is the player who created
  the duel, blue the one who joined, navy (`ink`) the contract and every action button, sun the
  winner and the payout, green (`good`) what is good (honored, unlocked, copied, under your
  control), orange what needs attention (an error, a shortfall, a late answer) — never red, which
  is a player. Reputation levels: Reliable green, Mixed sun (its bars a deeper `sun-bar`), Risky
  orange, New grey (`level-new-soft`, `level-new-ink`).
- **Tokens only.** Every colour, easing and shadow, and every type size, weight or breakpoint
  Tailwind's own scale lacks, is a token in `src/styles/theme.css`, used by its role: `bg-canvas`,
  `text-ink-3`, `bg-red-soft`, `text-body-sm`, `ease-press`, `xs:` (560px, where a window stops
  being a sheet), `max-w-page px-gutter` (a page's column and the room beside it). Tailwind's
  own palette (`bg-slate-50`, `text-white`), a colour value in a component, and `dark:` (there is
  no dark theme) fail `styles/__tests__/designGuard.test.ts`. The files the port has not reached are
  listed in `styles/__tests__/notYetPorted.ts`; a screen's port takes its files off, and the list
  only shrinks. A place CSS cannot reach (the browser's theme colour, Privy's window) takes its hex
  from `lib/brandColors.ts`, and a move made in script its curve from `lib/easings.ts`; a test
  keeps each equal to the theme.
- **Tailwind only, with one exception.** A value that changes while the page runs (a timer's
  progress, a notch's position, a bar's fill) goes in as a CSS variable through `style` and the
  classes read it; a state with several looks is a data attribute with variants
  (`data-[tone=short]:bg-orange-wash`). Shared CSS lives only in `src/styles/`: the theme, element
  defaults with the `keycap`, `link` and `swipe-strip` utilities, motion, and `legacy.css` — classes of screens not ported yet,
  each of which the guard test drops once nothing uses it.
- **Type:** Geologica only; 800 for headings and amounts, `font-label` (650) and `font-strong`
  (750) for labels, 400 for text. Figures are `tabular-nums`; there is no monospace face.
- **Primitives** in `components/ui/`: keycap buttons (navy for every action, paper beside it, sun
  only to take a payout, ghost for what should not compete), `Chip`, `Icon` (the design's icons;
  `lucide-react` stays only on screens not ported yet), `Dialog` (a card on a wide screen, a sheet
  from the bottom of a phone), `Popover` (a menu: a panel under its button, a sheet on a phone),
  `Input`, `Note` (a line of small print after an icon), `Spinner`, `Toaster`. Who and what in `components/identity/`: `Avatar` (a player's identicon on
  their seat's colour; the pattern is `lib/identicon.ts`, the same for an address everywhere),
  `GameTile` (initials on the category's colour), `ReputationPill` (a level) and `ReputationBadge`
  (a player's level, read), `LevelBadge` (a level as the badge a player earns, or still locked) and
  `QuestLine` (the honored duels to the next level, from `levelQuest`), `BrandMark`, `BrandLink`.
- **Motion** either explains something once or answers a click, and moves only transform and
  opacity. The exceptions are the keycap's edge, a shadow that shortens as the button goes down,
  and two SVG rings whose dash offset moves: a player's clock (`arena/CountdownRing`), which
  drains, and the landing's test coverage (`landing/Guarantees`), which fills as its figure counts.
  The moves are `animate-*` utilities from the `@theme` in `styles/motion.css`, the landing's own
  in `styles/landingMotion.css`, the dashboard's in `styles/dashboardMotion.css`; a colour that should flash or a glow that should breathe is an
  overlay whose opacity moves (the green ring when money arrives, the safe's seal, an open seat, a
  payout in a receipt). With `prefers-reduced-motion` everything is in its final place at once (a
  delayed move too: `motion.css` zeroes delays as well as durations), and
  a figure that counts (`useCountUp`) shows its value, as it does when a screen is shown anew rather
  than moved to (a new `epoch`).
- **Russian says «ты» and is gender-neutral**: nothing about a person in a past tense or a gendered
  adjective, and no slashes («победил(а)»). What you do is a noun or the present tense («Победа за
  мной», «Ты заявляешь победу»); what happened is the thing, not who did it («Победа заявлена»);
  another player by name («Ответа от {other} не было»). Role nouns (игрок, соперник, создатель)
  keep their grammatical gender. `i18n/__tests__/translationsGuard.test.ts` fails on «вы» outside
  `stillFormalKeys.ts`, a list that only shrinks, and on a key nothing uses.
- **Amounts** show up to USDT's 6 decimals in the reader's number format (`formatUSDT(amount,
  language)`), and an amount never parts from its unit at a line break (`{amount} USDT`).
- **Anything a contract setting decides is read from it**: the time to answer a reported win is
  `claimTimeout` in words, never a fixed "1 hour".

## Testing

**Frontend (Vitest):** test `lib/` pure logic. Test complex hooks via `renderHook`. Test observable behavior, not implementation. Mock at boundaries. Vitest runs in `node`; a hook or component test opts into a DOM with `// @vitest-environment happy-dom` as its first line and renders through `@testing-library/react` (see `src/hooks/__tests__/`).

**e2e (Playwright, `npm run test:e2e`)** runs against a server you start (`PLAYWRIGHT_BASE_URL`) and is not part of CI. Specs find elements by role, name and text, never by a class: the look changes, and a test tied to `bg-indigo-600` breaks with it.

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/wagmi.ts` | wagmi config (Privy adapter); `resolveRpcUrl` validates the RPC env and picks the fallback chain (configured provider → Tenderly) |
| `frontend/src/lib/contracts.ts` | ABI, DuelState enum, ACTIVE_STATES, ERC20 ABIs, getUsdtAddress |
| `frontend/src/styles/theme.css` | The design's tokens as Tailwind's theme: colours by role, type, weights, easing, shadows |
| `frontend/src/styles/base.css` | Element defaults (font, headings, focus ring), the `keycap` utility every button's press comes from, `link` for a link that reads as one, and `swipe-strip` for a row of cards swiped sideways on a phone |
| `frontend/src/components/ui/button.tsx` | Keycap buttons (navy, paper, paper on the navy safe, sun, ghost); `buttonVariants` gives a link the same face |
| `frontend/src/components/ui/iconPaths.ts` | The design's icons as shapes, drawn by `ui/icon.tsx` |
| `frontend/src/components/ui/dialog.tsx` | The one window: a card from a fixed top on a wide screen, a sheet below 560px; `--dialog-width` widens it; `DialogFooter isPinned` keeps a long sheet's last action on screen on a phone |
| `frontend/src/components/ui/popover.tsx` | The menus: a panel under its button on a wide screen, a modal sheet below 560px, with a title the sheet shows and a panel only reads out |
| `frontend/src/components/header/Header.tsx` | The top bar on every page: the brand, the sections (`lib/navigation.ts`; on the landing its own, the one being read marked through `useSectionInView`) from 980px, the language, the wallet menu or Sign in, and the navigation menu below 980px |
| `frontend/src/components/header/WalletMenu.tsx` | The wallet button (the duel network's USDT, never a sum across networks, and a pip while money waits in the contract) and its menu: player card, the small safe (`SafeMini`), a balance tile per network, Top up, Send, the faucet flask, key export and sign out |
| `frontend/src/hooks/useWalletBalances.ts` | The wallet's USDT and ETH on each network the build lists, read apart (USDT on `useUsdtBalance`'s query): the button's balance polled always, the rest while the menu is open, all again on the balance bus |
| `frontend/src/hooks/useSendUsdt.ts` | Sends USDT on the network picked: moves the wallet there, then `writeWithGas` |
| `frontend/src/lib/sendUsdt.ts` | The send form's rules: the typed amount, the transfer it asks for, what stops it, and where a sent one is |
| `frontend/src/lib/faucetApi.ts` | Faucet claim and status (`/faucet/status`), what it offers on a network, and its amounts for the copy (`faucetAmounts`) |
| `frontend/src/lib/faucetFlask.ts` | The wallet menu's faucet flask: its phase from the offer, the claim, and the balance a sent claim waits to land in |
| `frontend/src/lib/parsing.ts` | `isRecord`, `parseUintString`: the checks a value read from outside (a response, storage, a request) passes before it is trusted |
| `frontend/src/components/ui/toaster.tsx` | Toasts as paper cards with the design's icons, and what sonner's `unstyled` drops put back |
| `frontend/src/lib/brandColors.ts` | Theme colours as hex for what CSS cannot reach (theme colour, Privy's window, the images `ImageResponse` draws) |
| `frontend/src/lib/brandImage.tsx` | The brand mark for `ImageResponse`: the favicon, the home-screen icon and `/logo.png` |
| `frontend/src/lib/ogImage.tsx` | The share image; carries Geologica as WOFF (`src/assets/fonts/`, OFL), since `ImageResponse` cannot read WOFF2 |
| `frontend/src/components/identity/Avatar.tsx` | A player's face: the address's identicon (`lib/identicon.ts`) on their seat's colour |
| `frontend/src/components/identity/ReputationPill.tsx` | A reputation level as a pill with its three-bar meter; `ReputationBadge` reads a player's level and draws it |
| `frontend/src/i18n/intlLocales.ts` | The locale `Intl` formats each language's numbers and dates in |
| `frontend/src/i18n/serverTranslation.ts` | The reader's language on the server, from the cookie, read once per request, and `getTranslation()` for server components |
| `frontend/src/i18n/language.ts` | The language cookie: its name and settings, how it is read back and parsed (anything unknown is English), the site's languages and the switch's route |
| `frontend/src/i18n/translate.ts` | One cached `t` and `plural` per language, the same for server components and the browser's context |
| `frontend/src/i18n/LanguageContext.tsx` | The language in the browser: the layout's, and a refresh when another tab chose another |
| `frontend/src/app/api/language/route.ts` | Sets the language cookie from the switch's JSON post |
| `frontend/src/components/header/LanguageSwitch.tsx` | The language switch: slides its pill, posts the choice, then reloads the page at the same address |
| `frontend/src/styles/__tests__/designGuard.test.ts` | Fails on palette classes and variables, colour values, `dark:`, `font-mono` and unused legacy classes outside what `notYetPorted.ts` lists |
| `frontend/src/i18n/__tests__/translationsGuard.test.ts` | Fails on a translation key nothing uses and on Russian «вы» outside `stillFormalKeys.ts` |
| `frontend/src/lib/__tests__/helpers/sourceFiles.ts` | What the guards read: the shipped source files, the theme's tokens, and `shrinkingList` for lists that may only shrink |
| `frontend/src/lib/constants.ts` | Chain configs, contract addresses, ZERO_ADDRESS, CHAIN_NAMES |
| `frontend/src/components/providers/Providers.tsx` | Privy + wagmi + QueryClient providers, the relayer status and the language the root layout read |
| `frontend/src/hooks/useDuel.ts` | Read single duel, polled until it is over and paid out; a failed poll keeps the last duel |
| `frontend/src/hooks/useDuelReads.ts` | Paged `getDuels` / `getDuelsByIds` readers shared by every listing screen |
| `frontend/src/lib/duel.ts` | `DuelRecord` / `PlayerDuel` shapes, `toPlayerDuel`, claimable-amount and outcome helpers |
| `frontend/src/components/duel/PartialDataNotice.tsx` | The one banner saying a duel list may be short or out of date because a page, or the last read of it, failed to load, with Try again |
| `frontend/src/hooks/useContractConfig.ts` | Reads owner-adjustable on-chain params (minWager, claimTimeout, maxMessageCodepoints, maxMessageBytes), syncs contractConfig store |
| `frontend/src/lib/contractConfig.ts` | Module-level cache of on-chain params for non-hook helpers (fallbacks from constants.ts) |
| `frontend/src/hooks/useDuelActions.ts` | Write actions (join, cancel, claim, refundAndClaimPayouts, etc.) |
| `frontend/src/hooks/useWriteWithGas.ts` | Duel write dispatcher: relayed / resilient / plain routing + merged hash/isPending/error surface |
| `frontend/src/lib/writeReceipt.ts` | Waits for a write's receipt and decides by it: the receipt, `TransactionRevertedError` with the replayed reason, or `TransactionReplacedError` |
| `frontend/src/lib/writeErrors.ts` | The ways a write ends without running (reverted, replaced, wallet not ready), which `lib/flowError.ts` words for the signing window |
| `frontend/src/app/dashboard/page.tsx` | My duels: the title and Create a duel, then `components/dashboard/Dashboard` |
| `frontend/src/components/dashboard/` | The dashboard's parts: `Dashboard` (the guest's invitation, loading, a wallet with no duels, the desk), `TakeSafe` (the navy safe and its one Take; `TakenLine` once emptied), `DuelBoard`s of `MiniDuelCard`s (a small `ArenaStage`), `History` (`FormLine`, the lists' search, filters and pager, `HistoryRow`), `StandingCard` (`StandingReputation` on the landing's `ReputationGauge`, `StandingTotals` on `identity/PlayerTotals`); `TakeFlowDialog` is the one place Take's signing window is rendered |
| `frontend/src/hooks/useDashboard.ts` | The reader's duels filed for the dashboard: on (their move or waiting), finished, the money waiting, totals, each duel's game and the other players' names |
| `frontend/src/hooks/useDashboardTake.ts` | The safe's one Take: `refundAndClaimPayouts` over every duel that holds money for the reader, through `useActionFlow`; what was taken stays out of the safe from the confirmation |
| `frontend/src/lib/dashboard.ts` | A duel as the dashboard files it: whose move, how urgent, its outcome, the signed amount, why it ended without a winner, and the reader's totals |
| `frontend/src/lib/dashboardHistory.ts` | The history's search (spaces ignored), filters with their counts, and pages of 20 |
| `frontend/src/hooks/useDuelMetas.ts` | Duel metadata (the game) by id, read in the backend's batches of 200 and keyed with the contract address |
| `frontend/src/lib/owed.ts` | What the contract keeps for a player — wins, stakes coming back, timed-out claims — and the safe's bars; `useOwed` reads it from the shared `useDuelRange` history and looks again when a claim runs out of time |
| `frontend/src/components/landing/Hero.tsx` | The landing's first screen: the motto, the two ways in, the developer's note (`DevNote`; its last update is the build's time, which `next.config.ts` writes in as `DUELME_BUILT_AT`), the platform's figures and the demo duel |
| `frontend/src/components/landing/DemoDuel.tsx` | The demo duel: stills of a 10 USDT duel from `lib/demoDuel.ts`, moved between by `useDemoDuel` (steps, three endings, one play by itself once in view), stakes flown by `useStakeFlights` |
| `frontend/src/components/landing/OpenDuels.tsx` | The landing's open public duels (`useOpenDuels`): one as a wide card, two or more as a lobby that is a strip to swipe below the `wide:` breakpoint, none as the invitation to make one; the count is every open duel |
| `frontend/src/components/landing/GettingStarted.tsx` | The landing's first-duel quest (`useQuest`): the steps written down (`QuestLog`) beside a phone that acts each out (`QuestPhone`, its screens `QuestScreens` built from `QuestScreenParts`), and what a made wallet leaves in the player's hands (`ControlFacts`); step 3 and the gas line follow `useRelayerStatus` |
| `frontend/src/components/landing/Safety.tsx` | The landing's navy band: the escrow contract to check (`EscrowCard`: its address settling out of noise via `useScrambleReveal`, copy, three explorer tabs) and the four guarantees as badges that unlock (`Guarantees`; the test count and coverage are `lib/contractFacts.ts`) |
| `frontend/src/components/landing/ReputationLab.tsx` | How reputation works, by hand: a sample player (`useReputationSample`) marked honored or abandoned walks the scale (`ReputationGauge`; where on it from `lib/reputationGauge.ts`), with the level reached and what it tells an opponent |
| `frontend/src/lib/contractFacts.ts` | The contract's test count, which a test keeps equal to the `test*`/`invariant*` functions in `contracts/test`, and its measured line coverage with the date: measure again (`forge coverage --profile coverage`) when the tests change much |
| `frontend/src/components/landing/RecentDuels.tsx` | The landing's finished duels (`useWonDuels`, won duels only) beside the popular games that filter them (`useGameFilter`: rows step out, then `useListReflow` slides the rest; a picked game's duels come from that game's own, `useDuelsByGame`); a row is the feed's `DuelRow`, opening into its `DuelReceipt`. The sizes and the pure rules are `lib/landingDuels.ts` |
| `frontend/src/components/arena/` | The table a duel is drawn on, the landing demo's and a real duel's: `Seat`, `Safe`, `Stake`, `Track`, `Match`, `Bubble`, `CountdownRing` (measures a real clock when given `left`), `OpenSeat`, `RepChip`, `MoneyChip`, `GainTag`, `CountedUsdt`; `SafeLock`, the padlock the safe and the wallet menu's `SafeMini` share |
| `frontend/src/app/duel/[id]/page.tsx` | The duel page: takes whole-digit ids only, then `DuelRoom` |
| `frontend/src/components/duel/room/` | The duel page's parts: `DuelRoom` (the duel, its phase, the layout), `DuelArena` (`DuelHead`, `ArenaStage` with its `RoomSeat`s, `DuelSteps`); `RoomGrid` (the arena, the turn panel under it pointing at the reader's seat, the facts and history beside); `DuelTurn` (the "your move" panel and the windows its moves open: join flow, guided window, top-up) on `TurnPanel` (notch, whose pill, swap and 700 ms arming; shared with the create page, as are `DuelFacts` and `InviteLinkBox`) and `TurnBlocks`; `RoomFacts` ("This duel" on `DuelFacts`); `DuelHistory` |
| `frontend/src/lib/duelPhase.ts` | A duel's phase at a moment (`timeout` once the time to answer a reported win ran out), its head label and its five steps |
| `frontend/src/lib/arenaView.ts` | What the duel page's arena shows for a duel in a phase, and the beats a change plays in (players first, then the money) |
| `frontend/src/lib/turnView.ts` | The duel page's "your move" panel as plain data for every phase and reader (whose move, tone, notch, copy keys, blocks); the phases' cases are `lib/turnPhases.ts` |
| `frontend/src/lib/duelHistory.ts` | A duel's history as events, oldest first: who acted, when, and the creator's message |
| `frontend/src/hooks/useDuelTurnActions.ts` | Every move of the turn panel wired: the join window, the signing window for every other answer (`refundAndClaimPayouts` once the time to answer ran out, `claimPayout` after), Privy sign-in |
| `frontend/src/hooks/useStakePurse.ts` | The stake against the wallet of a reader who could join: USDT short, the top-up window, the balance held still while it is open so the cells charge after |
| `frontend/src/hooks/useArenaMotion.ts` | Plays a change of the arena in the landing demo's order, flying the stakes; at once with motion reduced |
| `frontend/src/hooks/useNow.ts` | One clock ticking each second for the whole screen; `useClockValue` re-renders only when a value read off it changes |
| `frontend/src/hooks/useDuelInvite.ts` | A private duel's invite secret: from the link, or the creator's kept in this browser |
| `frontend/src/lib/timeWords.ts` | A contract's duration in words (`durationWords`) and a past day as today, yesterday or days ago |
| `frontend/src/hooks/usePlatformStats.ts` | Landing-page Total Volume / Duels Played stats |
| `frontend/src/hooks/useRecentDuels.ts` | Duels someone joined, newest event first: the recent duels page, and the landing's finished ones |
| `frontend/src/hooks/useReputation.ts` | Wilson Score reputation calculation |
| `frontend/src/hooks/useReputationLevels.ts` | Batch reputation reads for feed/search |
| `frontend/src/lib/invite.ts` | Secure invite-secret generation/storage |
| `frontend/src/lib/duelMessage.ts` | Frontend Unicode duel-message validation; `normalizeDuelMessage`, the one trim the create page's field, counter, check and create call all judge |
| `frontend/src/lib/duelSearch.ts` | Shared visible-field search indexing |
| `frontend/src/lib/actionFlowConfigs.ts` | The signing window's configs for duel actions, the one-transaction answers included |
| `frontend/src/lib/balanceRefresh.ts` | Shared client-side balance refresh event bus |
| `frontend/src/components/topup/TopUpWindow.tsx` | The site's one top-up window, for the `chainId` it is given: QR and grouped address, what to send and not to, the faucet, the balance there; for a duel (`duel`), what it needs, from the flow's own balance read; for a signing window's fees (`eth`), the ETH they need |
| `frontend/src/lib/topup.ts` | The top-up window's words for a network (`topUpCopy`) and the address in groups of four |
| `frontend/src/lib/balanceStatus.ts` | Balance freshness / sufficiency rule: `resolveBalanceReading` for a wallet, `resolveBalanceStatus` where there may be none, `resolveFunding` |
| `frontend/src/hooks/useFlowFunding.ts` | Balance gate on the create and join review steps, and whether the top-up window is open over them; the gate also carries the write's progress (`signing`) to the window |
| `frontend/src/lib/createDuelDraft.ts` | Versioned `sessionStorage` draft of the create form, kept as it is typed so a reload, a sign-in or a top-up brings it back (no invite secret); `useCreateDuelDraftStorage` keeps it and drops it once the create call is under way |
| `frontend/src/lib/clipboard.ts` | `copyText` — the one clipboard write; confirm "Copied" only when it returns `true` |
| `frontend/src/hooks/useCopyFeedback.ts` | Copy-button state on top of `copyText`: "Copied" only for a write that landed, a toast otherwise |
| `frontend/src/lib/addressQr.ts` | QR of a bare string as an SVG path, rendered as plain React markup |
| `frontend/src/hooks/useFaucetClaim.ts` | Testnet faucet claim where the backend's status (`useFaucetStatus`) offers one, shared by the wallet menu (`useFaucetFlask`) and the top-up window |
| `frontend/src/lib/buildTransactionParams.ts` | Builds explicit `gas`/`maxFeePerGas`/`maxPriorityFeePerGas`/`nonce` to bypass Privy auto-populate (see Common Pitfalls) |
| `frontend/src/lib/resilientBroadcast.ts` | Splits writes into sign + broadcast so wagmi fallback transport handles RPC retries; asks the network for a transaction whose broadcast failed |
| `frontend/src/lib/errorDetails.ts` | Flattens an error graph into lowercase detail strings for failure classification; `bestErrorDetail` picks the one worth showing, `isWalletRefusal` tells a request turned down in the wallet |
| `frontend/src/app/api/relay/route.ts` | Gas relayer: admits a signed ERC-2771 request, then signs and sends `ERC2771Forwarder.execute` under the lock (order: "Gasless Duel Actions") |
| `frontend/src/lib/relayRequest.ts` | Relay wire types and error codes, relayable-function allowlist, payload validation, outer gas-limit rule |
| `frontend/src/lib/relayerConfig.ts` | Server-only relayer wiring (key, RPC, budget, viem clients) |
| `frontend/src/lib/relayerBudget.ts` | In-memory per-address daily gas budget (reserve / settle / release) |
| `frontend/src/lib/relayerQueue.ts` | Serializes relayed sends: one transaction is signed and sent at a time; receipts are awaited after the lock |
| `frontend/src/lib/relaySimulation.ts` | `forwarder.verify` and the `execute` simulation, run before the lock and again under it; recovers the inner revert reason |
| `frontend/src/lib/relayerRateLimit.ts` | In-memory per-IP limit on relay POSTs |
| `frontend/src/lib/relayerDedup.ts` | Collapses repeats of one signed request into a single relay |
| `frontend/src/lib/relayerSignerHold.ts` | Holds a signer back until their last relayed transaction has a receipt |
| `frontend/src/lib/forwardRequest.ts` | Signs the EIP-712 ForwardRequest (domain name, gas padding) |
| `frontend/src/lib/permitSignature.ts` | Signs an EIP-2612 permit, rebuilding and verifying the token's EIP-712 domain |
| `frontend/src/lib/relayApi.ts` | `/api/relay` client: posts the same signed request again when an answer is lost; `RelayRequestError` carries the server's code |
| `frontend/src/hooks/useRelayerStatus.ts` | Whether duel writes on a chain can be relayed: the forwarder address and the server's relayer status, handed down with the page by the root layout |
| `frontend/src/lib/testnetGas.ts` | Testnet vs mainnet gas/fee buffers; min-gas constants per duel action |
| `frontend/src/i18n/translations.ts` | Merges the per-area section files into one EN/RU key map — **add keys in `frontend/src/i18n/translations/<section>.ts`**, not here |
| `frontend/src/lib/__tests__/deployedAddresses.test.ts` | Fails the build when `constants.ts` or a backend `application.yml` address (faucet token, `duelme.contracts.duel-me`) drifts from the broadcast artifact |
| `frontend/src/lib/__tests__/contractAddresses.test.ts` | Fails the build when an in-app address map stops agreeing with `constants.ts` |
| `frontend/src/lib/profile.ts` | Profile types and validation constants |
| `frontend/src/lib/profileApi.ts` | Backend profile API client |
| `frontend/src/lib/gameApi.ts` | Backend game-catalog and duel-metadata API client; every duel-metadata call carries the contract address, and `duelMetaBatches` splits ids into the backend's batches of 200 |
| `frontend/src/hooks/useMyProfile.ts` | Current user's profile (read/write) |
| `frontend/src/hooks/useProfile.ts` | Read any player's profile by wallet |
| `frontend/src/hooks/useNicknames.ts` | Batch nickname resolution for duel feeds |
| `frontend/src/components/profile/MyProfile.tsx` | The own profile (`/profile`): the head, `ProfileEditor` (each field edited where it stands; the request rules are `lib/profileEdit.ts`), the linked accounts, the record; signed out, `SignedOutProfile` |
| `frontend/src/app/profile/[walletAddress]/page.tsx` | A player's profile: anything but an address is a 404, an address opens `PlayerProfile` (head, `ReputationCard` on the landing's scale, `RecordCard`, `ProfileAbout`) |
| `frontend/src/components/profile/SocialLinksSection.tsx` | The owner's linked accounts, a `SocialAccountTile` per platform to connect, change or unlink; `SocialAccounts` lists a player's read-only |
| `frontend/src/components/profile/OAuthCallbackHandler.tsx` | Reads `?steam=`/`?telegram=` query and toasts |
| `frontend/src/hooks/useSocialLinks.ts` | Social-link mutations (initiate + set/unlink) |
| `frontend/src/components/feed/` | Duels someone joined as rows: `DuelFeed` (search, state filters with their counts, pages of 20) of `DuelRow`s, each opening into its `DuelReceipt`; the rules are `lib/duelFeed.ts` |
| `frontend/src/components/lists/` | What every list shares, the dashboard's history too: `SearchField`, `FilterPill`, `Pager` (`lib/pages.ts`; the focus moves to the page shown after a turn) |
| `frontend/src/components/duels/` | `/duels/public` (`OpenDuelsBoard`: search, game and stake-band filters, `OpenDuelGrid`) and `/duels/recent` (`RecentDuelsBoard`: the feed beside the popular games, its search kept in `?q=` by `useSearchQuery`) |
| `frontend/src/components/game/GameCatalog.tsx` | `/games`: search, category pills and the games as cards (`CatalogGame`), most played first |
| `frontend/src/components/game/GameDetail.tsx` | `/games/[slug]`: `GameHead`, the game's open duels (`GameOpenDuels`) and its `DuelFeed`; no such game, or a failed read, as a `LostPage` |
| `frontend/src/components/layout/LostPage.tsx` | A page with nothing to show, drawn as the brand mark: `app/not-found.tsx`, `app/error.tsx`, a missing game |
| `frontend/Dockerfile` | Frontend container (multi-stage, Node 22) |
| `frontend/src/app/duel/create/page.tsx` | The create page: `CreateDuelRoom` |
| `frontend/src/components/duel/create/` | The create page's parts: `CreateDuelRoom` (layout, balance, top-up, the way on), `DraftArena` (`DraftHead` until the duel exists, then the duel page's `DuelHead`; `DraftStage` with the stakes outlined in the safe), `SetupPanel` and its `SetupStep`s (`GameStepBody` with `AddGameForm`, `StakeStepBody` with `StakeCharge`, `StakeSum` and `WalletPurse`, `AccessStepBody`, `MessageStepBody`), `WayOnBar`, `CreatedPanel`, `CreateFacts`; `CreateSigning` is the page's one tie to the signing window |
| `frontend/src/hooks/useCreateSetup.ts` | The create page's setup: the form as typed, the open step and the way between the steps, kept in the tab |
| `frontend/src/lib/createSetup.ts` | The setup's rules: which steps are reachable, done or a problem, where to go next, a restored draft's steps, the way on, adding a game (`addedGame`) |
| `frontend/src/lib/wagerInput.ts` | The stake field read the way people type it («4,2» is 4.2), as the decimal string `parseUnits` takes, or why it is refused |
| `frontend/src/lib/stakeScale.ts` | The stake slider's scale: its marks (minimum, presets, end), the steps between them, the detents and the cells |
| `frontend/src/hooks/useChargeMotion.ts` | The stake slider's spring motion (`lib/spring.ts`), drawn straight onto its parts each frame |
| `frontend/src/hooks/useGameNote.ts` | A note players really made a duel of a game with (`lib/gameNote.ts`): the message field's example |
| `frontend/src/components/duel/room/TurnPanel.tsx` | The "your move" panel under a duel's arena, with `WhosePill`; beside it `DuelFacts`, the card of a duel's facts, and `InviteLinkBox`, the link to copy and send |
| `frontend/src/components/sign/` | The signing window: `SigningWindow` (stages, rail, the top-up windows over it), its parts (`SignCheck`, `SignProgress`, `SignResult`, `NeedsList` with `ChargeCells`, `TechnicalDetails`, `ErrorDetails`), the model it takes (`signingModel.ts`) and the three windows that build one from a flow's props |
| `frontend/src/lib/flowSession.ts` | The signing flows' one state and reducer (`reduceFlow`): stage, wallet or chain, failure, fees paid |
| `frontend/src/lib/flowError.ts` | `classifyFlowError`: a failed step as a kind the window words, its raw detail, and whether another go can help |
| `frontend/src/lib/writeRoute.ts` | Relayed or self-paid for a write (`resolveWriteRoute`, shared with `useDuelActions`), the funding call it becomes, and `resolveNeedsApproval` |
| `frontend/src/lib/signPlan.ts` | What a write asks the wallet for, in order: permit, approve, the move; signatures or transactions |
| `frontend/src/lib/signingSteps.ts` | Where a flow stands on the window's rail, and which steps lock the window |
| `frontend/src/lib/signingCopy.ts` | Each action's words in the window, and an error's title and text for it |
| `frontend/src/lib/gasNeeds.ts` | The self-paid path's fees: typical gas per kind, the fee quote, the expected fee and the ETH a wallet must hold |
| `frontend/src/hooks/useFlowLifecycle.ts` | Follows a flow's write in the wallet and on the network until it is confirmed or fails; each flow says what a confirmed write means |
| `frontend/src/hooks/useSignGas.ts` | The fee side of a self-paid window: what each transaction costs, the ETH needed against the ETH held, and the faucet or top-up that fixes a shortfall |

## Environment

- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app ID (frontend)
- `NEXT_PUBLIC_API_URL` — Backend API base URL (default `/api/v1`)
- `NEXT_PUBLIC_ARBITRUM_RPC_URL` — authenticated RPC for Arbitrum One. **Unset since 2026-09-20**, so both environments run on Tenderly Gateway public; the previous provider was disabled upstream and took withdrawals down with it (see the RPC gotcha below). Used as Privy embedded-wallet override + first wagmi fallback. If you set it: check the endpoint answers `eth_chainId`, add its host to `connect-src`, and lock the URL via the provider's "Allowed Origins" — `NEXT_PUBLIC_*` are inlined into the JS bundle.
- `NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL` — same for Arbitrum Sepolia. Optional; Tenderly public works for dev.
- `RELAYER_PRIVATE_KEY` — hot wallet that pays gas for relayed duel actions (frontend container, **runtime** not build-time). Unset, or not a valid private key ⇒ `/api/relay` returns 503 and duel writes stay self-paid. Dedicated key; fund it with only what the daily budgets can spend.
- `RELAYER_RPC_URL` — server-side RPC for the relayer. Optional; defaults to the default chain's public RPC. A browser-origin-locked `NEXT_PUBLIC_*` key will NOT work here — server requests send no `Origin`.
- `RELAYER_DAILY_BUDGET_WEI` — per-address daily gas allowance in wei. Optional; defaults to 0.0005 ETH.
- `RELAYER_GLOBAL_DAILY_BUDGET_WEI` — relayer-wide daily ceiling in wei. Optional; defaults to 0.01 ETH. Addresses are free to create, so this — not the per-address budget — is what bounds a sybil drain.

## Common Pitfalls

- `createConfig` from `wagmi` instead of `@privy-io/wagmi` silently breaks wallet routing.
- `useSetActiveWallet` in `useEffect` is too late — use `setActiveWalletForWagmi` sync callback.
- Invite-only duels rely on the full private link (URL fragment) — never fall back to plain `/duel/{id}`.
- **Top-up details belong to the duel's network, not the wallet's.** `TopUpWindow` takes `chainId` from its caller (the flow's `draft.chainId`, the network picked in the wallet menu), never from `useChainId()` or the connected wallet — a player connected to another network would otherwise be told to send USDT where the duel cannot use it. Its QR encodes the bare address only: no `ethereum:` URI, amount, token or invite secret.
- Wilson Score gives low scores for small samples — players with 0 abandoned duels are never "unreliable".
- **Do NOT use `arbitrum-one-rpc.publicnode.com`** — exposes legacy `eth_fillTransaction`, which viem 2.47+ calls during `prepareTransactionRequest` and gets `gasPrice: "0x0"`, producing signed txs with all-zero gas/fees. Privy surfaces as "HTTP request failed". See [viem#4323](https://github.com/wevm/viem/issues/4323) (open as of May 2026). Use Tenderly/drpc/arb1.arbitrum.io, or an authenticated provider you have verified.
- **Privy embedded wallets** sign with all-zero gas/nonce when SDK auto-populates — bypass by passing `gas` / `maxFeePerGas` / `maxPriorityFeePerGas` / `nonce` explicitly in every `writeContract` call. Centralized in `useWriteWithGas` (used by `useDuelActions`; uses `buildTransactionParams` + `resilientBroadcast`) — never call `writeContract` directly from action functions.
- **`ox` peer clash:** `@privy-io/react-auth` declares an *optional* peer `permissionless@^0.2.x`, which in turn declares an optional peer `ox@^0.8.0` that conflicts with viem 2.47's `ox@0.14.5`. Resolved by pinning `ox` in `frontend/package.json` `overrides`. Don't remove it — `npm ci` will ERESOLVE, even though DuelMe itself no longer depends on `permissionless`.
- **Dependabot never edits `overrides` on a version update**, so it would move `viem` and both `@privy-io/*` packages (each pins viem or ox exactly) while `ox` stays on the override above. `.github/dependabot.yml` ignores their minor/patch updates for that reason — bump the four by hand, in one commit.
- **A dead RPC provider looks like nothing at all.** `resolveRpcUrl` validates the URL's shape, never calls it, and Privy embedded wallets broadcast through one URL with no fallback — so an endpoint that has been disabled upstream surfaces only as "HTTP request failed" in the wallet modal, with the fee estimate rendering fine because that goes through Privy's own RPC. On 2026-09-20 the configured Arbitrum One provider answered `403 App is inactive` and withdrawals were dead; the wallet had ample ETH, and gas was the first thing everyone suspected. Before blaming the chain, `curl` the endpoint with `eth_chainId`.
- **Relayer gas limit must clear `request.gas * 64 / 63` plus forwarder overhead.** `ERC2771Forwarder._checkForwardedGas` triggers `invalid()` — burning the *entire* limit, not just the unused part — when the forwarded call did not get the gas the request promised. On Arbitrum the L1 posting fee is charged out of the same limit and only `eth_estimateGas` knows its size, so `relayGasLimit` adds the floor ON TOP of the estimate; `max(floor, estimate)` would starve the inner call. Measured forwarder overhead beyond the floor is ~25k.
- **`ERC2771Forwarder.execute` does not bubble up the inner revert reason** — a failed forwarded call surfaces as a bare `Errors.FailedCall()`. `/api/relay` re-simulates the inner call directly as the signer to recover the real message.
- **A sent write is decided by its receipt, on the chain it went to.** `useWriteWithGas` reads the
  receipt through `lib/writeReceipt.ts`, not wagmi's `useWaitForTransactionReceipt`, which watches
  the chain the wallet is on now and, on a revert, throws whatever its replay of the call throws.
  A reverted receipt ends the write in a `TransactionRevertedError` (its reason recovered from a
  replay on the block before), a cancel or another call with its nonce in a
  `TransactionReplacedError` — seen only while a watch still holds the pending original, which on
  Arbitrum, with no public mempool, it rarely does. Any other failure to read the receipt, a watch
  that timed out included, is retried for as long as it lasts, and the write counts as confirming
  until the receipt decides, offline included: a write reported as failed that went through is one
  "Try again" away from a second duel and a second wager. For the same reason a Privy broadcast
  that fails asks the network for the transaction before calling the write failed
  (`lib/resilientBroadcast.ts`), unless the node refused the transaction's own funds, gas or fee
  fields, and a relayed write whose answer is lost posts the same signed request again
  (`lib/relayApi.ts`).
- **Whether relaying is on comes with the page, never from a request.** The root layout reads
  `getRelayerStatus()` from the server's relayer config and hands it to `useRelayerStatus` through
  context, so every flow plans and every write routes from the first render. An asynchronous
  probe once did this job: a flow opened before it answered planned the self-paid path, approve
  included, for a player the relayer would carry, and every fix for that (gates, retries,
  timeouts, writes waiting for the answer) added a failure of its own.
- **Nothing in the browser may pick the language before hydration.** A first render that reads
  `localStorage` or `navigator.language` draws other words than the server did from the cookie
  ("i18n" under Standards), and React reports a hydration mismatch on every page; that is why the
  language left `localStorage`.
- **The image build copies root config files by name.** `Dockerfile` lists them in a `COPY`, and a
  pull request's CI does not build the image, so deleting one of them (as with shadcn's
  `components.json`) passes every check and breaks the deploy only after the merge.
  `lib/__tests__/dockerfile.test.ts` fails on a `COPY` whose source is gone.
- **A wallet client taken from a render belongs to the network the wallet was on then.**
  `useWalletClient({ chainId })` fails while the wallet sits on another network, and its query key
  does not change when the wallet moves, so the failure outlasts the switch; and a write called in
  the same callback as `switchChainAsync` holds the client of the render before it. So
  `writeWithGas` reads the embedded wallet's client when it writes (`getWalletClient`), and
  `useSendUsdt` switches and writes in one go. The relayer's signature (`relayWrite`) and the
  permit (`useDuelPermit`) still take the hook's client: the signing flows make the switch a step
  of its own for them.
- **A window that closes because what it shows turned null empties before it is gone.** The window
  plays its closing animation after the value it was opened with (a network, a platform) is already
  null, so its title and body change or vanish on the way out. Show `useLastNonNull(value)` from
  `hooks/` instead, as `TopUpWindow` and `UnlinkConfirmDialog` do.
- **tailwind-merge does not know the theme's own tokens, and a type size clears the line height before it.** Left alone it reads `text-body` as a colour and `font-label` as a font family, so `cn('text-body', 'text-ink')` silently drops the size, and a later shadow or easing does not replace `shadow-menu` or `ease-spring`. `cn()` in `lib/utils.ts` registers the type sizes, weights, shadows, inset shadows, easings, spacing, widths and radii; a new `--text-*`, `--font-weight-*`, `--shadow-*`, `--inset-shadow-*`, `--ease-*`, `--spacing-*`, `--container-*` or `--radius-*` token goes there too (`utils.test.ts` fails until it does). A `text-*` size also drops any `leading-*` that comes before it, so where a variant or a caller sets the size, the line height rides on it: `text-body-sm/[1.1]`, `text-lg/snug`.
- **`collectErrorDetails` returns viem's multi-line dump first.** An error's own `message` is visited before its `shortMessage` / `reason`, so the first entry is the whole "Contract Call / Request Arguments / Version" blob. Use `bestErrorDetail` (shortest non-placeholder detail) whenever the string reaches a person.
- **`fundsViaPermit` has to gate every allowance check, not just the last one.** `handleContinueFlow`, `handleSwitchNetwork` and `handleCreateTransaction` / `handleJoinTransaction` all decide the approve step; a relayed flow that reads the allowance in any of them routes a zero-ETH player into a self-paid `approve`. They share `resolveNeedsApproval` from `lib/writeRoute.ts`.
- **`FORWARDER_NAME` must match on both sides.** `frontend/src/lib/forwardRequest.ts` and `contracts/script/ForwarderConfig.sol` (which both deploy scripts read) both spell `"DuelMe Forwarder"`; it is the EIP-712 domain name, so a mismatch makes every signature fail `verify` with no other symptom.
- **`ForwardRequestData` has no `nonce` field in OpenZeppelin 5.x** — the forwarder reads it from `Nonces` at execution time and folds it into the signed struct hash via the typehash. It must be signed but never sent. `deadline` is a `uint48`, not `uint256` (the EIP-2612 permit deadline is `uint256` — do not mix them up).
- **Mainnet USDT (USD₮0, Arbitrum One) has no ERC-5267 `eip712Domain()`** and its `name()` is `USD₮0` with U+20AE, not an ASCII "T". Build the permit domain from `name()` + version `"1"` and verify it against the token's own `DOMAIN_SEPARATOR()`. `MockUSDT` deliberately mirrors both traits so a mistake fails on dev. Covered by `contracts/test/UsdtPermitFork.t.sol` (skipped without `ARBITRUM_RPC_URL`).
- **USD₮0 validates permit through ERC-1271 whenever the owner address has code**, which an EIP-7702 delegation gives a plain EOA. Such a player's permit can fail (`"Permit failed"`). The contract still accepts the plain `createDuel` / `joinDuel` once an allowance exists, but the UI does not currently offer that route while relaying is on — the approve step is pinned off — and `approve` cannot be relayed anyway, since the token does not trust our forwarder. So this player is blocked in the signing window, which says so (`sign.err.permit`); reaching them needs a product decision, not just ETH.
- **The relayer's budget ledger, per-IP rate limit, repeat memory and signer holds are in-memory**, so they reset on redeploy and are not shared across replicas. Accurate for the current single-container-per-env deployment; more than one replica needs a shared store.
- **The per-IP rate limit trusts the right-most `X-Forwarded-For` entry** because Caddy, with no `trusted_proxies`, overwrites the header with the address it saw, nothing sits in front of Caddy, and the container listens on `127.0.0.1` only. A CDN or another proxy in front of Caddy makes that entry the proxy's, and every player then shares one bucket: change the rule with it.
- Use shared constants from `constants.ts` (`ZERO_ADDRESS`, `CHAIN_NAMES`) and `contracts.ts` (`ACTIVE_STATES`, `balanceOfAbi`, `transferAbi`, `getUsdtAddress`) — never redefine locally.
- **The CI `next build` has no Privy app id.** The `frontend` job builds without secrets, so `NEXT_PUBLIC_PRIVY_APP_ID` is undefined there, and that works only because the root layout is `force-dynamic` and nothing under it is prerendered. Remove `force-dynamic` and the job fails with `Cannot initialize the Privy provider with an invalid Privy app ID`, while the image build, which gets the real id, passes.
- Frontend npm pinned to `^11.12.1` via `frontend/package.json` `engines` + `frontend/.npmrc` `engine-strict=true`. CI and `frontend/Dockerfile` both pin it with `corepack enable npm && corepack prepare npm@11.12.1 --activate` — `corepack enable` alone does **not** shim npm (npm ships with Node), so npm has to be named explicitly or the `packageManager` field is ignored. A mismatch caused `EUSAGE` / `EBADENGINE` in `npm ci`.
- `overrides.eslint-plugin-react-hooks: 7.0.1` is a temporary pin — `7.1.x` adds `react-hooks/set-state-in-effect`, which flags existing patterns in `useCreateDuelFlow.ts`, `useJoinDuelFlow.ts`. Lift only after refactoring those files.
- **CSP `connect-src` must allowlist every external host the frontend calls** — otherwise the browser silently blocks the `fetch` ("Refused to connect ... Content Security Policy"). Set in the `Content-Security-Policy` header in `ops/caddy/{dev.duelme.pro,duelme.pro}.Caddyfile`. Must include the RPC fallback chain from `wagmi.ts` (`https://gateway.tenderly.co`, `https://*.drpc.org`, `arb1.arbitrum.io`, `sepolia-rollup.arbitrum.io`) — plus any custom `NEXT_PUBLIC_*_RPC_URL` host. The Privy wallet-login UI (`loginMethods` includes `'wallet'`) also needs the WalletConnect/Privy set per [Privy's CSP guide](https://docs.privy.io/security/implementation-guide/content-security-policy): `connect-src` += `https://explorer-api.walletconnect.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems`; `frame-src` += `https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com`; `script-src` += `https://challenges.cloudflare.com` (Privy Turnstile). The **live** `/etc/caddy/Caddyfile` is a hand-maintained combined file (other sites too) and is **NOT** auto-deployed by CI — edit it on the host and `sudo systemctl reload caddy` (the repo `ops/caddy/*` files are the reference copy).
- Four frontend rules live in `contracts/CLAUDE.md`, beside the contract they mirror: `duelMeAbi` /
  `DuelState` in `lib/contracts.ts` and the invite-hash formula in `lib/invite.ts` ("ABI sync",
  Common Pitfalls); Join/Decline gate on `invitedOpponent`, not `inviteHash` alone (the
  `inviteHash == bytes32(0)` bullet); the `constants.ts` fallbacks equal the deploy-time defaults
  (the owner-settable params bullet).
- Both health endpoints report `environment` and `release`, and the deploy passes only when both
  match: see Deployment in `ops/CLAUDE.md` before changing either.
- **The ETH a self-paid window asks for is the worst case, not the fee.** A node refuses a
  transaction whose sender holds less than its gas limit times `maxFeePerGas`, after the player
  has already confirmed it in the wallet, so `ethNeeded` (`lib/gasNeeds.ts`) sums each unsent
  transaction's limit at the app's own buffers and floors, and the row says "up to". The figures
  beside each transaction are what it should cost at the network's price now. Compare the
  balance with the expected fee instead and a wallet that looks covered fails at sending.
