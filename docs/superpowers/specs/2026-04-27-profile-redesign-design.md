# Profile Redesign — Design Spec

**Date:** 2026-04-27
**Status:** Approved by user, ready for implementation plan
**Stage:** Pre-launch (no users, schema/API changes are free; this spec does not touch the smart contract)

## 1. Motivation

Current profile pages (`/profile`, `/profile/[walletAddress]`) read like a generic SaaS user form: nickname, status, first name, last name, gender, about, games, socials. The visual identity is a placeholder `User` icon even when Steam/Telegram avatars are linked. Reputation hides at the bottom as a small badge. There is no humor, no fight identity, no inline duel history, no "I'm available right now" signal.

DuelMe's audience is gamers, streamers, and people who duel friends online or offline. The profile must:

- Respect anonymity (every text field optional, no first/last name, no gender)
- Lead with **fight identity** — record, history, trust signals
- Carry a tone of light humor and arena flavor
- Encourage discovery & challenge
- Work mobile-first (≤640px is the baseline, tab-less stacked layout)
- Keep operational simplicity — no avatar uploads, no streaming-API integrations, no NFT pulls

## 2. Scope

### In scope

- Backend schema reshape (`Profile` document, DTOs, validation)
- Frontend redesign of `/profile` (owner edit) and `/profile/[walletAddress]` (public view)
- New auto-titles engine on the frontend, computed from on-chain duel history
- Avatar cascade resolution (Steam → Telegram → identicon)
- New copy + i18n keys (EN + RU)
- Inline animation layer with `framer-motion`
- Sticky mobile "Challenge to a duel" CTA on public profiles

### Out of scope (explicitly)

- Custom avatar / banner uploads (no storage/moderation)
- Twitch/YouTube live indicators (only static social links)
- NFT-based avatars or PFP integrations
- Friends list / blocked list
- Tip jar / donation address
- Theming (color/font customization)
- Achievement engine beyond the auto-titles defined here
- Discovery feed (lookingForDuel toggle is recorded; the discovery surface is a separate future project)

### Pre-launch context

DuelMe has not shipped, has no users, no production data. This spec assumes the freedom to make breaking changes to MongoDB schema, REST DTOs, and frontend types without migration paths. Tests still pass, types still clean — but no "keep old field for backwards compat" patterns.

## 3. Data model

### 3.1 Profile document (MongoDB)

| Field | Type | Notes |
|---|---|---|
| `walletAddress` | `String`, indexed unique | unchanged |
| `nickname` | `String`, max 30 | unchanged |
| `battleCry` | `String`, max 100 | **renamed from `status`**, semantic shift to "signature line"; was 140 chars |
| `aboutMe` | `String`, max 500 | unchanged |
| `pronouns` | `String`, max 16, optional | **new** — replaces `gender` |
| `region` | `String`, max 30, optional | **new** — free-text (e.g. "EU evenings") |
| `lookingForDuel` | `boolean`, default `false` | **new** — toggle for "I'm available" signal |
| `games` | `List<String>`, max 20 items, each max 30 | unchanged |
| `socialLinks` | `SocialLinks` (Steam / Telegram / Instagram) | unchanged |
| `createdAt` | `Instant` | unchanged (display label changes to "Took up arms") |
| `updatedAt` | `Instant` | unchanged but no longer surfaced in UI |

**Removed fields:** `firstName`, `lastName`, `gender`, `status`. No backwards compat — drop the fields from the record, the DTOs, and the Mongo schema. Local dev databases get re-initialized.

### 3.2 Backend changes

- `backend/.../model/Profile.java` — record signature changes
- `backend/.../dto/ProfileRequest.java` — remove old fields, add `battleCry`, `pronouns`, `region`, `lookingForDuel` with Jakarta Bean Validation:
  - `@Size(max = 100) String battleCry`
  - `@Size(max = 16) String pronouns`
  - `@Size(max = 30) String region`
  - `Boolean lookingForDuel` (no validation; null treated as `false`)
- `backend/.../dto/ProfileResponse.java` — same shape, mirror the new fields
- `backend/.../service/ProfileService.java` — update mappings from request → entity
- `backend/.../controller/ProfileControllerTest` (or equivalent) — rewrite assertions for new field set, drop tests that exercised removed fields

### 3.3 Frontend type changes

- `frontend/src/lib/profile.ts`:
  - `Profile` interface — remove `firstName`/`lastName`/`gender`, rename `status` → `battleCry`, add `pronouns`/`region`/`lookingForDuel`
  - `ProfileRequest` — same diff
  - `PROFILE_LIMITS` — drop old keys, add `battleCry: 100`, `pronouns: 16`, `region: 30`. Drop `firstName`, `lastName`, `gender`
- `frontend/src/lib/profileApi.ts` — verify request shape matches new DTO; payload type re-derived from `ProfileRequest`
- `frontend/src/hooks/useMyProfile.ts` / `useProfile.ts` — type follow-through, no logic changes

### 3.4 Derived data (computed, not stored)

- **Avatar URL** — derived per render: `socialLinks.steam.avatarUrl ?? socialLinks.telegram.photoUrl ?? identicon(walletAddress)`. Identicon is a deterministic SVG generated client-side.
- **Stats strip** (W-L, total volume, reputation %) — from `usePlayerDuels` + `useReputation`. Already available.
- **Auto-titles** — computed from `usePlayerDuels` data + profile snapshot (see §6).
- **Recent battles inline** — slice of `[...activeDuels, ...historyDuels]` already returned by `usePlayerDuels`, sorted by latest activity, top 5.

## 4. Public profile UX

Single page renders for both owner and viewer. Owner-only affordances appear conditionally.

### 4.1 Hero (always at the top)

```
                                                  [Share]
[avatar 80×80]  Nickname (or 0xa3...f912 if no nickname)
                "Battle cry — italic, slate-600"
                🟢 Open for duels        ← if lookingForDuel = true

                ┌──────┬───────┬──────┐
                │ 12-3 │ 450 ◆ │ 89%  │   ← stats strip
                │ W-L  │ Volume│ Rep  │
                └──────┴───────┴──────┘

                🏆 First Blood · Iron Hand · The Whale   ← top-3 trophies

                0xa3...f912 [copy]

                [⚔️ Challenge to a duel]   ← public viewer
                [✏️ Edit profile]           ← owner
```

- Avatar size: 80×80 desktop, 64×64 mobile
- Stats strip: when player has 0 duels, replaced by "🆕 Fresh meat — no duels yet"
- Top-3 trophies: sorted by `weight desc`, see §6
- One CTA button at a time — owner sees Edit, viewer sees Challenge
- Share button: copies `${origin}/profile/${walletAddress}` to clipboard, fires success toast

### 4.2 Tabs / sections under hero

Four tabs on desktop, four stacked sections on mobile (≤ `md` breakpoint). Default tab: **Battles**.

| Tab | Content |
|---|---|
| **Battles** | Last 5 duels — opponent (with profile link), result (W/L/abandoned), wager, completion date. Footer link "View all battles →" goes to `/dashboard` for owner or `/duels/public?player=0x...` for viewer (the filter is added to the public-duels page in this same project — see §10) |
| **About** | `aboutMe` paragraph; `games[]` chips; `pronouns` and `region` if set; "Took up arms" with `createdAt` formatted to month + year |
| **Reach out** | Existing `SocialLinksDisplay` component. Hidden tab if no socials connected AND viewer is not owner |
| **Trophies** | Earned + not-yet sections, see §6 |

Empty section copy is in §8.

### 4.3 Mobile layout

- No tab bar; each section is a stacked block with its own bold heading
- Hero compact: avatar 64×64, smaller stats, top-3 trophies wrap to 2 lines if needed
- Sticky bottom bar `[⚔️ Challenge to a duel]` for public viewer only — `position: fixed`, `inset-x-0`, `bottom-0`, with `padding-bottom: env(safe-area-inset-bottom)` and elevation on scroll-up. Owner does not see this; their Edit affordances are inline

### 4.4 Empty profile (no Mongo doc)

The "No profile yet" banner is **removed**. When a wallet has no profile document, render the page anyway:

- Nickname → `truncatedAddress(walletAddress)`
- battleCry / about / pronouns / region → empty (hidden on public, edit-prompt on owner)
- Avatar → identicon
- Stats / trophies / battles → on-chain (works fine)
- About-tab placeholder: "Identity classified. Some duelists prefer it that way."

Anonymous-style profile is a feature, not a missing-data state.

## 5. Owner edit experience

### 5.1 Routing

- `/profile` — owner's own profile, edit-mode display
- `/profile/[walletAddress]` — anyone's profile, view-mode. If `walletAddress === viewer`, hero shows "✏️ Edit profile" button → routes to `/profile`

### 5.2 Inline edit

Keeps the per-field inline edit pattern from the current code, but polished:

- Pencil affordance: hover-prominent on desktop, always-visible on mobile
- Keyboard shortcuts: `Enter` saves single-line, `Cmd+Enter` saves multiline, `Esc` cancels
- Save success: 400ms green outline pulse + transient checkmark (§7)
- **Optimistic UI** — value updates immediately; on error, shake animation 300ms + revert. Implemented via React Query's `onMutate` / `onError`

### 5.3 `lookingForDuel` toggle

Distinct switch control (not pencil edit). Located directly under hero in owner mode:

```
┌─────────────────────────────────────────────────┐
│  🟢  Open for duels                  [ ●ON ]    │
│  Other duelists will see you're up for a fight. │
└─────────────────────────────────────────────────┘
```

- ARIA `role="switch"`, `aria-checked`
- Spring physics on handle
- When ON, the hero green dot pulses; when OFF, hidden

### 5.4 What's editable vs derived

Editable: `nickname`, `battleCry`, `aboutMe`, `pronouns`, `region`, `games[]`, `lookingForDuel`, social links (existing flow).

Derived (no edit): avatar (auto-resolved), stats strip, trophies, recent battles, `walletAddress`, `createdAt`.

## 6. Auto-titles engine

### 6.1 Architecture

New file `frontend/src/lib/profileTitles.ts`. Pure function, zero I/O:

```ts
interface TitleContext {
  address: string;
  duels: PlayerDuel[];      // from usePlayerDuels
  stats: PlayerStats;       // wins, losses, totalWagered, totalWithdrawn
  profile: Profile | null;
}

interface Title {
  id: string;
  weight: number;            // higher = ranked sooner in top-3
  category: 'milestone' | 'behavior' | 'volume' | 'streak' | 'vanity';
  earnedBy: (ctx: TitleContext) => boolean;
  progressOf?: (ctx: TitleContext) => { current: number; target: number } | null;
  isNegative?: boolean;      // suppresses progress hint, swaps to humorous tone
}

export function computeTitles(ctx: TitleContext): {
  earned: Title[];
  unearned: Title[];
  top3: Title[];
}
```

`earnedBy` is data-only. Labels and descriptions live in i18n via `trophy.<id>.label/desc/hint` (see §8). The pure function does not return strings — UI fetches them by ID.

New hook `useProfileTitles(address)` wraps `usePlayerDuels` + `useProfile` + `computeTitles`, returns memoized `{ earned, unearned, top3 }`. Pulled by both the hero (top-3) and the Trophies tab (earned + unearned).

### 6.2 Catalog (16 titles)

| ID | Category | Weight | Earn condition (sketch) | Negative? |
|---|---|---|---|---|
| `first_blood` | milestone | 90 | wins ≥ 1 | — |
| `cardinal_sin` | milestone | 50 | losses ≥ 1 | yes |
| `rookie` | milestone | 30 | totalDuels < 5 (downgrades when veteran applies) | — |
| `veteran` | milestone | 95 | totalDuels ≥ 50 | — |
| `legend` | milestone | 100 | totalDuels ≥ 200 | — |
| `iron_hand` | behavior | 85 | resolved-and-won duels with 100% claimed | — |
| `the_brave` | behavior | 70 | as opponent, accepted ≥ 80% of ≥ 5 invites | — |
| `stage_fright` | behavior | 40 | as opponent, declined ≥ 5 invites | yes |
| `the_coward` | behavior | 35 | abandoned ≥ 5 (timed-out claim or no-funding) | yes |
| `friendly_fire` | behavior | 60 | ≥ 50% of duels with the same single opponent (min 6 duels) | — |
| `the_whale` | volume | 90 | totalWagered ≥ 1000 USDT | — |
| `the_penny` | volume | 50 | average wager < 1 USDT, totalDuels ≥ 5 | — |
| `hot_streak` | streak | 80 | latest 5+ duels all won | — |
| `cold_streak` | streak | 75 | latest 5+ duels all lost | yes |
| `the_mysterious` | vanity | 45 | profile null OR (no nickname AND no aboutMe AND no socialLinks) | — |
| `the_influencer` | vanity | 55 | all three social platforms linked | — |

Earn-condition logic is in `profileTitles.ts`. Implementation reuses fields already in `PlayerDuel` (state, claimedWinner, opponent, creatorClaimed/opponentClaimed, claimTimestamp).

### 6.3 Top-3 selection

```
top3 = earned
  .sort((a, b) => b.weight - a.weight)
  .slice(0, 3)
```

Ties broken by stable sort (definition order). When earned set has fewer than 3, render whatever exists.

### 6.4 Trophies tab layout

```
EARNED
🏆 First Blood        Won your first duel.
🏆 Iron Hand          100% claim-rate.
🏆 The Whale          Total volume over 1000 USDT.

NOT YET
🔒 Veteran            Play 50+ duels.            (12 / 50)   ← progress
🔒 Hot Streak         5 wins in a row.           (2 / 5)
🔒 The Coward         (probably for the best, eh?)             ← isNegative=true
```

For non-negative unearned trophies with a numeric threshold, display the progress hint. For negative trophies (`isNegative=true`), display a humorous deflection — never a progress bar.

## 7. Animations

### 7.1 Library

Add `framer-motion` (`^11.x`) to `frontend/package.json`. ~12kb gzipped, supports `AnimatePresence`, `layoutId`, spring physics, gesture utilities. No alternative gives us cross-fade tab switches and stagger/layout animations cleanly.

### 7.2 Catalog

| Element | Animation | Trigger |
|---|---|---|
| Profile card | Fade-up 12px on mount, children stagger 50ms | mount |
| Avatar | Scale 1.0 → 1.02 (200ms) on hover, public profile only | hover |
| `Open for duels` green dot | Gentle pulse, 2s loop, opacity 0.6 ↔ 1.0 | always when ON |
| Stats strip numbers | Count-up over 300ms, ease-out, single-shot per session | first viewport intersect |
| Top-3 trophies | Stagger fade-in 60ms each | mount |
| Challenge CTA | Subtle ambient pulse every 4s, scale 1.0 → 1.025 | always (public viewer only) |
| Tab switch | Old: fade-out 120ms + slide-up 4px / New: fade-in 150ms + slide-down 4px | tab change |
| Active tab indicator | Spring slide via `layoutId` | tab change |
| Trophies in tab | Stagger fade-in 30ms each | tab open |
| Trophy hover | Scale 1.03 + 1° tilt | hover |
| Inline edit transition | 200ms morph text ↔ input via `layoutId` | enter/exit edit |
| Save success | 400ms green ring pulse + checkmark fade | mutation success |
| Optimistic error | 300ms shake + revert | mutation error |
| `lookingForDuel` toggle | Spring physics on handle | flip |
| Sticky mobile CTA | Slide-up from bottom 200ms | mount |
| Sticky CTA shadow | Box-shadow intensifies on scroll-up | scroll |
| Buttons (general) | Hover scale 1.02 + shadow lift; active scale 0.97 | hover/tap |

### 7.3 Accessibility

`prefers-reduced-motion: reduce` MUST disable all of the following:
- Count-up (numbers appear at final value)
- Ambient pulses (Open dot, Challenge CTA)
- Hover scales (no transform)
- Stagger entries (everything appears immediately)
- Optimistic shake (still revert, just no animation)

Page enter, tab switch, and toggle still happen but without spring/stagger — they're functional cues, not decorative.

## 8. Copywriting / i18n

### 8.1 New / changed keys

```
# Hero / fields
profile.battleCry              "Battle cry"                                         / "Боевой клич"
profile.battleCryPlaceholder   "Add a battle cry..."                                / "Добавь боевой клич..."
profile.tookUpArms             "Took up arms"                                       / "Вышел на арену"
profile.openForDuels           "Open for duels"                                     / "Открыт к дуэлям"
profile.openForDuelsHint       "Other duelists will see you're up for a fight."    / "Другие увидят, что ты готов биться."
profile.freshMeat              "🆕 Fresh meat — no duels yet"                       / "🆕 Свежее мясо — дуэлей ещё не было"
profile.pronouns               "Pronouns"                                           / "Местоимения"
profile.pronounsPlaceholder    "she/her · he/him · they/them..."                    / "она/её · он/его · они/их..."
profile.region                 "Region"                                             / "Регион"
profile.regionPlaceholder      "EU evenings · PST nights..."                        / "EU вечером · MSK ночью..."
profile.aboutMePlaceholder     "Tell the world who you are (or don't, that's cool too)" / "Расскажи миру, кто ты (или нет, это тоже норм)"

# Tabs
profile.tabs.battles           "Battles"        / "Бои"
profile.tabs.about             "About"          / "О себе"
profile.tabs.reachOut          "Reach out"      / "Связаться"
profile.tabs.trophies          "Trophies"       / "Трофеи"

# Empty states
profile.empty.battles          "No duels yet — fresh meat 🆕"                       / "Дуэлей пока нет — свежее мясо 🆕"
profile.empty.about            "Identity classified. Some duelists prefer it that way." / "Личность засекречена. Некоторые дуэлянты предпочитают так."
profile.empty.reachOut         "No connected accounts. Anonymity respected."        / "Нет привязанных аккаунтов. Анонимность уважается."
profile.empty.trophies         "No trophies yet. The arena awaits."                 / "Трофеев пока нет. Арена ждёт."

# Stats
profile.stats.recordLabel      "W-L"            / "П-П"
profile.stats.volumeLabel      "Volume"         / "Объём"
profile.stats.repLabel         "Rep"            / "Реп"

# CTAs
profile.cta.challenge          "⚔️ Challenge to a duel"        / "⚔️ Вызвать на дуэль"
profile.cta.edit               "✏️ Edit profile"                / "✏️ Редактировать профиль"
profile.cta.share              "Share"                          / "Поделиться"
profile.cta.viewAllBattles     "View all battles →"             / "Все бои →"

# Trophies tab
profile.trophies.earned        "EARNED"                         / "ПОЛУЧЕНО"
profile.trophies.notYet        "NOT YET"                        / "ПОКА НЕТ"
profile.trophies.cowardlyHint  "(probably for the best, eh?)"   / "(оно и к лучшему, согласен?)"
profile.trophies.progress      "{current} / {target}"           / "{current} / {target}"

# Removed (delete from translations.ts):
profile.firstName, profile.lastName, profile.gender, profile.status, profile.statusPlaceholder
```

### 8.2 Trophy strings (16 × {label, desc, hint})

```
trophy.firstBlood.label    "First Blood"        / "Первая кровь"
trophy.firstBlood.desc     "Won your first duel. Auspicious start." / "Выиграл первую дуэль. Благоприятное начало."
trophy.firstBlood.hint     "Win your first duel." / "Выиграй первую дуэль."

trophy.cardinalSin.label   "Cardinal Sin"       / "Смертный грех"
trophy.cardinalSin.desc    "Lost your first duel. We've all been there." / "Слил первую дуэль. Все мы с этого начинали."

trophy.rookie.label        "Rookie"             / "Новобранец"
trophy.rookie.desc         "Less than 5 duels. Just getting started." / "Меньше 5 дуэлей. Только начинаешь."

trophy.veteran.label       "Veteran"            / "Ветеран"
trophy.veteran.desc        "Over 50 duels. The arena knows your name." / "Больше 50 дуэлей. Арена знает твоё имя."
trophy.veteran.hint        "Play 50+ duels." / "Сыграй 50+ дуэлей."

trophy.legend.label        "Legend"             / "Легенда"
trophy.legend.desc         "Over 200 duels. Reserved for those who never put down the sword." / "Больше 200 дуэлей. Только для тех, кто не выпускает меча."
trophy.legend.hint         "Play 200+ duels." / "Сыграй 200+ дуэлей."

trophy.ironHand.label      "Iron Hand"          / "Железная рука"
trophy.ironHand.desc       "100% claim-rate. Never leaves a USDT behind." / "100% claim-rate. Не оставляешь USDT в контракте."
trophy.ironHand.hint       "Claim every win you've earned." / "Забирай каждый честно выигранный USDT."

trophy.theBrave.label      "The Brave"          / "Храбрец"
trophy.theBrave.desc       "Accepts more than 80% of incoming challenges." / "Принимает больше 80% входящих вызовов."
trophy.theBrave.hint       "Accept 80%+ of incoming duels (5+ invites)." / "Принимай 80%+ входящих дуэлей (минимум 5)."

trophy.stageFright.label   "Stage Fright"       / "Сценический страх"
trophy.stageFright.desc    "Declined 5+ incoming duels. Not every fight is your fight." / "Отказался от 5+ боёв. Не каждый бой — твой бой."

trophy.theCoward.label     "The Coward"         / "Трус"
trophy.theCoward.desc      "Abandoned 5+ duels by timeout. Maybe try chess?" / "Бросил 5+ дуэлей по таймауту. Может, лучше шахматы?"

trophy.friendlyFire.label  "Friendly Fire"      / "Дружеский огонь"
trophy.friendlyFire.desc   "Half your duels are with the same opponent. Brothers in arms." / "Половина дуэлей — с одним оппонентом. Братья по оружию."
trophy.friendlyFire.hint   "Duel the same friend over and over." / "Дуэлься с одним и тем же чаще остальных."

trophy.theWhale.label      "The Whale"          / "Кит"
trophy.theWhale.desc       "Total volume over 1000 USDT. Respect." / "Прокрутил больше 1000 USDT. Уважение."
trophy.theWhale.hint       "Wager 1000+ USDT total." / "Накрути 1000+ USDT суммарного банка."

trophy.thePenny.label      "The Penny"          / "Копейка"
trophy.thePenny.desc       "Average wager under 1 USDT. Humble bettor." / "Средний банк меньше 1 USDT. Скромно и со вкусом."
trophy.thePenny.hint       "Keep average wagers under 1 USDT (5+ duels)." / "Держи средний банк ниже 1 USDT (минимум 5 дуэлей)."

trophy.hotStreak.label     "Hot Streak"         / "Горячая серия"
trophy.hotStreak.desc      "5+ wins in a row. On fire." / "5+ побед подряд. В ударе."
trophy.hotStreak.hint      "Win 5 duels in a row." / "Выиграй 5 дуэлей подряд."

trophy.coldStreak.label    "Cold Streak"        / "Холодная серия"
trophy.coldStreak.desc     "5+ losses in a row. It's just variance, surely." / "5+ поражений подряд. Это просто дисперсия, конечно."

trophy.theMysterious.label "The Mysterious"     / "Незнакомец"
trophy.theMysterious.desc  "No nickname, no bio, no socials. Respect the silence." / "Ни ника, ни био, ни соц-линков. Уважаем тишину."
trophy.theMysterious.hint  "Leave nickname, bio, and socials all empty." / "Оставь ник, био и соц-линки пустыми."

trophy.theInfluencer.label "The Influencer"     / "Инфлюэнсер"
trophy.theInfluencer.desc  "All three social accounts connected. Out and about." / "Все три соц-аккаунта подключены. Открытая книга."
trophy.theInfluencer.hint  "Connect Steam, Telegram, and Instagram." / "Привяжи Steam, Telegram и Instagram."
```

## 9. File-level changes

### 9.1 Backend (Java)

| File | Change |
|---|---|
| `model/Profile.java` | Drop firstName/lastName/gender/status; add battleCry/pronouns/region/lookingForDuel |
| `dto/ProfileRequest.java` | Same shape, validation annotations |
| `dto/ProfileResponse.java` | Same shape, mirror new fields in `from(Profile)` |
| `service/ProfileService.java` | Update mappings request → entity |
| `controller/ProfileController.java` | Verify OpenAPI annotations still describe responses correctly (only field-level changes) |
| `controller/ProfileControllerTest.java` (or equivalent) | Rewrite assertions, drop tests for removed fields, add tests for new fields and validation rules |
| `service/ProfileServiceTest.java` (or equivalent) | Same |

No migration script — pre-launch, drop the Mongo collection in dev.

### 9.2 Frontend types & API

| File | Change |
|---|---|
| `lib/profile.ts` | Field changes in `Profile`, `ProfileRequest`, `PROFILE_LIMITS` |
| `lib/profileApi.ts` | No structural change, type follows new interface |
| `hooks/useMyProfile.ts`, `hooks/useProfile.ts` | Type changes only, no logic |

### 9.3 Frontend components — owner profile

| File | Change |
|---|---|
| `app/profile/page.tsx` | Rebuild around new layout (hero with stats/trophies, tabs/sections, edit mode, looking-for-duel toggle) — current 387 lines splits into multiple components per CLAUDE.md "no file > 300 lines" rule |
| `components/profile/ProfileHero.tsx` (new) | Avatar + name + battleCry + open-pill + stats-strip + top-3 trophies + address + CTA |
| `components/profile/ProfileTabs.tsx` (new) | Desktop tabs / mobile stacked sections wrapper |
| `components/profile/BattlesTab.tsx` (new) | Recent battles list + view-all link |
| `components/profile/AboutTab.tsx` (new) | aboutMe / games / pronouns / region / tookUpArms |
| `components/profile/TrophiesTab.tsx` (new) | Earned + not-yet sections |
| `components/profile/LookingForDuelToggle.tsx` (new) | Switch component, owner only |
| `components/profile/InlineEditField.tsx` (new) | Reusable inline-edit for nickname/battleCry/pronouns/region/aboutMe — replaces the inline `renderField` in current page |
| `components/profile/InlineGamesEditor.tsx` (new) | Tag-list editor for games[] |
| `components/profile/StatsStrip.tsx` (new) | W-L / Volume / Rep card |
| `components/profile/TrophyChip.tsx` (new) | Single trophy display, used in hero top-3 and Trophies tab |
| `components/profile/Identicon.tsx` (new) | Deterministic SVG identicon from address |
| `components/profile/ChallengeCta.tsx` (new) | "Challenge to a duel" button + sticky mobile variant |
| `components/profile/ShareProfileButton.tsx` (new) | Copy link button |

### 9.4 Frontend components — public profile

| File | Change |
|---|---|
| `app/profile/[walletAddress]/page.tsx` | Same redesign — reuses `ProfileHero`, `ProfileTabs` with `viewerMode='public'` prop |

### 9.5 New library code

| File | Purpose |
|---|---|
| `lib/profileTitles.ts` | Title definitions, `computeTitles` pure function |
| `lib/identicon.ts` | Hand-rolled deterministic identicon SVG generator (no external dep — see §9.8) |
| `hooks/useProfileTitles.ts` | Wraps `usePlayerDuels` + `useProfile` + `computeTitles` |
| `hooks/useAvatarUrl.ts` | Resolves Steam → Telegram → identicon |

### 9.6 Public-duels filter (small adjacent change)

`/duels/public?player=0x...` filter: BattlesTab "View all battles" link points here for public viewers. If the page does not already accept `?player=`, add the parameter and a simple address filter on the public-duels query. Estimated: <30 lines of change in `app/duels/public/page.tsx` and the related hook.

### 9.7 i18n

`i18n/translations.ts` — add all keys from §8, remove `profile.firstName`, `profile.lastName`, `profile.gender`, `profile.status`, `profile.statusPlaceholder`.

### 9.8 Dependencies

- `frontend/package.json` — add `framer-motion: ^11.x`
- Optionally `@dicebear/core` + `@dicebear/collection` for identicon. If we ship a hand-rolled identicon (one small SVG generator from sha256 of address), no extra dep needed. Decision: hand-roll a tiny identicon to keep deps minimal — it's ~50 lines of code and the design only needs deterministic 8×8 pixel-art-style avatars.

### 9.9 CLAUDE.md

- Update "Key Files" table — remove deleted profile fields, add new components and hooks.
- Add `framer-motion` to dep notes if relevant.

## 10. Testing strategy

### 10.1 Backend

- `ProfileControllerTest`: full CRUD round-trip with new fields; validation tests for over-limit `battleCry`, `pronouns`, `region`; missing-required-fields stays nullable; auth rules unchanged
- `ProfileServiceTest`: new field mapping tests
- Drop tests covering `firstName`/`lastName`/`gender`/`status`

### 10.2 Frontend — unit tests (Vitest)

- `lib/profileTitles.test.ts` — every title's `earnedBy` tested with both true and false inputs (canonical fixture of 1–3 fake duel arrays)
- `lib/identicon.test.ts` — same input always produces same SVG; different inputs produce different SVGs
- `lib/profile.test.ts` — `PROFILE_LIMITS` regression test (smoke check exports)

### 10.3 Frontend — component tests / Playwright e2e

- `e2e/profile.spec.ts`: own profile loads, fields editable, save success toast appears, looking-for-duel toggle persists across reload
- `e2e/profile-public.spec.ts`: public profile loads for a wallet with duels, hero stats render, tabs switch, sticky mobile CTA appears below `md` breakpoint
- Mobile viewport screenshot capture per CLAUDE.md UI verification workflow (≤640px)

### 10.4 Reduced-motion

- Verify via Chrome DevTools "Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`" (or Playwright's `page.emulateMedia({ reducedMotion: 'reduce' })`) that ambient pulses, count-up, and hover scales disappear

## 11. Risk + open items

### Resolved during brainstorm

- Audience priority — A+B+C equal
- Streamer support depth — A (just-another-link)
- Avatar source — A (auto-OAuth + identicon, no uploads)
- Layout variant — Hybrid (hero + tabs/sections)
- Default tab — Battles
- Sticky mobile CTA — keep
- "No profile yet" banner — remove
- Trophy taxonomy — 16-item catalog approved
- battleCry vs status — single field (`battleCry`)
- Optimistic UI — yes
- `framer-motion` — yes, add
- Trophy color accent — amber-500 (gold)

### To monitor during implementation

- **Bundle size**: `framer-motion` adds ~12kb; identicon hand-roll keeps total dep weight low. Verify in build report
- **Title computation cost**: 16 titles × N duels per profile load. Multicall already returns all duels; computation is `O(N)` and memoized. Should be a non-issue but profile worth checking on a wallet with 200+ duels
- **Sticky CTA on iOS Safari**: safe-area handling, address-bar collapse interaction. Verify in Playwright + manual iOS Safari pass
- **Identicon accessibility**: needs `aria-label="Avatar generated from wallet address"`
- **Game tag chips on mobile**: long lists wrap correctly, no horizontal scroll
- **Reduced-motion regression**: easy to forget to gate ambient animations — test pass before merge

### Non-goals worth restating

- No discovery feed in this project (lookingForDuel value is recorded only)
- No avatar upload UI
- No trophy notifications / earned-since-last-visit detection (a future polish)
- No friend system, no DM, no comments
- No streaming live indicators

## 12. Implementation phasing (sketch — full plan written separately)

The implementation plan (next step in writing-plans skill) will phase work as:

1. **Backend schema reshape** — Profile entity, DTOs, validation, tests. Smallest unit.
2. **Frontend types + i18n** — `lib/profile.ts`, translations, no UI yet
3. **Identicon + avatar resolution** — `lib/identicon.ts`, `hooks/useAvatarUrl.ts` + tests
4. **Auto-titles engine** — `lib/profileTitles.ts`, `hooks/useProfileTitles.ts` + tests
5. **Building blocks** — `ProfileHero`, `StatsStrip`, `TrophyChip`, `InlineEditField`, `LookingForDuelToggle`, `Identicon`, `ChallengeCta`, `ShareProfileButton`
6. **Tab components** — `BattlesTab`, `AboutTab`, `TrophiesTab`, `ProfileTabs` wrapper
7. **Page rewrites** — `/profile` (owner) + `/profile/[walletAddress]` (public) using the new components
8. **Animations layer** — wire framer-motion across hero/tabs/trophies, plus reduced-motion gates
9. **Public-duels `?player=` filter** — small adjacent change to support View all battles
10. **CLAUDE.md updates + Playwright e2e + screenshots + final lint/build/typecheck**

End of design.
