# How It Works Section Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-heavy HowItWorks + TrustSection with a single visual section featuring 3 compact steps, an animated fund-flow diagram, and 3 security facts.

**Architecture:** Rewrite `HowItWorks.tsx` with three zones (steps row, flow diagram, security facts). Delete `TrustSection.tsx` entirely. Update translations (EN/RU), page layout, and side nav. Pure CSS animations — no new dependencies.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, lucide-react icons

---

### Task 1: Update translations — replace old keys with new content

**Files:**
- Modify: `frontend/src/i18n/translations.ts` — lines 49–73 (EN howItWorks + trust) and lines 695–719 (RU howItWorks + trust)

- [ ] **Step 1: Replace EN howItWorks keys (lines 49–61)**

Replace the entire EN `howItWorks.*` block with:

```typescript
    // Landing — How it works
    'howItWorks.title': 'How It Works',
    'howItWorks.step1.title': 'Create a duel',
    'howItWorks.step1.desc': 'Pick a game, set your wager, send the link to your opponent.',
    'howItWorks.step2.title': 'Bets are locked',
    'howItWorks.step2.desc': 'Both players\' funds go into a smart contract. No one can withdraw early.',
    'howItWorks.step3.title': 'Winner takes all',
    'howItWorks.step3.desc': 'Both confirm the result — winnings are available instantly.',
    'howItWorks.flow.caption': 'Funds are held by code — not a server, not a person. Only the winner can claim them.',
    'howItWorks.flow.playerA': 'Player A',
    'howItWorks.flow.playerB': 'Player B',
    'howItWorks.flow.contract': 'Smart Contract',
    'howItWorks.flow.winner': 'Winner',
    'howItWorks.flow.resultConfirmed': 'Result confirmed',
    'howItWorks.security.code.title': 'Code, not a person',
    'howItWorks.security.code.desc': 'Funds are controlled by a program on the blockchain. We have no access to your money.',
    'howItWorks.security.fees.title': '0% fees',
    'howItWorks.security.fees.desc': 'Winner takes all. The platform takes nothing.',
    'howItWorks.security.open.title': 'Open source',
    'howItWorks.security.open.desc': 'The contract is public. Every transaction is verifiable on the blockchain.',
```

- [ ] **Step 2: Remove EN trust keys (lines 63–73)**

Delete the entire `// Landing — Trust` block:

```typescript
    // Landing — Trust
    'trust.title': 'Built on honesty',
    'trust.subtitle': ...
    'trust.noFees.title': ...
    'trust.noFees.desc': ...
    'trust.openSource.title': ...
    'trust.openSource.desc': ...
    'trust.selfCustody.title': ...
    'trust.selfCustody.desc': ...
    'trust.honor.title': ...
    'trust.honor.desc': ...
```

- [ ] **Step 3: Remove EN sidenav.trust key (line 14)**

Delete:
```typescript
    'sidenav.trust': 'Trust',
```

- [ ] **Step 4: Replace RU howItWorks keys (lines 695–707)**

Replace the entire RU `howItWorks.*` block with:

```typescript
    // Landing — How it works
    'howItWorks.title': 'Как это работает',
    'howItWorks.step1.title': 'Создай дуэль',
    'howItWorks.step1.desc': 'Выбери игру, поставь сумму, скинь ссылку сопернику.',
    'howItWorks.step2.title': 'Ставки заблокированы',
    'howItWorks.step2.desc': 'Деньги обоих игроков уходят в смарт-контракт. Никто не может их забрать досрочно.',
    'howItWorks.step3.title': 'Победитель забирает всё',
    'howItWorks.step3.desc': 'Оба подтвердили результат — выигрыш доступен мгновенно.',
    'howItWorks.flow.caption': 'Деньги хранит программный код — не сервер, не человек. Забрать их может только победитель.',
    'howItWorks.flow.playerA': 'Игрок A',
    'howItWorks.flow.playerB': 'Игрок B',
    'howItWorks.flow.contract': 'Смарт-контракт',
    'howItWorks.flow.winner': 'Победитель',
    'howItWorks.flow.resultConfirmed': 'Результат подтверждён',
    'howItWorks.security.code.title': 'Код, а не человек',
    'howItWorks.security.code.desc': 'Деньги контролирует программа на блокчейне. У нас нет доступа к вашим средствам.',
    'howItWorks.security.fees.title': '0% комиссия',
    'howItWorks.security.fees.desc': 'Победитель забирает всё. Платформа не берёт ничего.',
    'howItWorks.security.open.title': 'Открытый код',
    'howItWorks.security.open.desc': 'Контракт публичный. Каждую транзакцию можно проверить в блокчейне.',
```

- [ ] **Step 5: Remove RU trust keys (lines 710–719)**

Delete the entire RU `// Landing — Trust` block.

- [ ] **Step 6: Remove RU sidenav.trust key**

Delete:
```typescript
    'sidenav.trust': 'Доверие',
```

- [ ] **Step 7: Verify type-check passes**

Run: `cd frontend && npx tsc --noEmit`

This will fail with errors about `trust.*` keys still being used in `TrustSection.tsx` and `SideNav.tsx`. That's expected — we'll fix those in the next tasks. Note the errors and move on.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/i18n/translations.ts
git commit -m "feat: update translations for how-it-works redesign, remove trust section keys"
```

---

### Task 2: Rewrite HowItWorks.tsx — three-zone layout

**Files:**
- Rewrite: `frontend/src/app/HowItWorks.tsx`

This is the core task. The component has three zones:
1. Steps row (3 compact cards)
2. Animated flow diagram
3. Security facts row (3 cards)

- [ ] **Step 1: Rewrite the full component**

Replace the entire content of `frontend/src/app/HowItWorks.tsx` with:

```tsx
'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { Swords, Lock, Trophy, ShieldCheck, BadgePercent, Eye, User } from 'lucide-react';

const steps = [
  {
    icon: Swords,
    titleKey: 'howItWorks.step1.title' as const,
    descKey: 'howItWorks.step1.desc' as const,
    color: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    number: '01',
  },
  {
    icon: Lock,
    titleKey: 'howItWorks.step2.title' as const,
    descKey: 'howItWorks.step2.desc' as const,
    color: 'bg-violet-100 text-violet-600 border-violet-200',
    number: '02',
  },
  {
    icon: Trophy,
    titleKey: 'howItWorks.step3.title' as const,
    descKey: 'howItWorks.step3.desc' as const,
    color: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    number: '03',
  },
];

const securityFacts = [
  {
    icon: ShieldCheck,
    titleKey: 'howItWorks.security.code.title' as const,
    descKey: 'howItWorks.security.code.desc' as const,
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: BadgePercent,
    titleKey: 'howItWorks.security.fees.title' as const,
    descKey: 'howItWorks.security.fees.desc' as const,
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Eye,
    titleKey: 'howItWorks.security.open.title' as const,
    descKey: 'howItWorks.security.open.desc' as const,
    color: 'bg-blue-100 text-blue-600',
  },
];

function FlowDiagram() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto mt-16 max-w-2xl">
      {/* Players → Contract */}
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        {/* Player A */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 ring-2 ring-indigo-200 sm:h-16 sm:w-16">
            <User className="h-6 w-6 text-indigo-600 sm:h-7 sm:w-7" />
          </div>
          <span className="text-xs font-medium text-slate-600 sm:text-sm">
            {t('howItWorks.flow.playerA')}
          </span>
        </div>

        {/* Arrow A → Contract */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-semibold text-slate-400">$10</span>
          <div className="flow-arrow h-px w-full" />
        </div>

        {/* Smart Contract */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg sm:h-20 sm:w-20">
            <Lock className="h-7 w-7 text-white sm:h-8 sm:w-8" />
            <div className="absolute inset-0 rounded-2xl ring-2 ring-slate-700 animate-pulse-slow" />
          </div>
          <span className="text-xs font-medium text-slate-600 sm:text-sm">
            {t('howItWorks.flow.contract')}
          </span>
        </div>

        {/* Arrow Contract ← B */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-semibold text-slate-400">$10</span>
          <div className="flow-arrow flow-arrow-reverse h-px w-full" />
        </div>

        {/* Player B */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 ring-2 ring-violet-200 sm:h-16 sm:w-16">
            <User className="h-6 w-6 text-violet-600 sm:h-7 sm:w-7" />
          </div>
          <span className="text-xs font-medium text-slate-600 sm:text-sm">
            {t('howItWorks.flow.playerB')}
          </span>
        </div>
      </div>

      {/* Vertical connector */}
      <div className="mx-auto flex w-px flex-col items-center py-4">
        <div className="h-10 w-px bg-gradient-to-b from-slate-300 to-emerald-400" />
        <span className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {t('howItWorks.flow.resultConfirmed')}
        </span>
        <div className="mt-2 h-10 w-px bg-gradient-to-b from-emerald-400 to-emerald-500" />
        <div className="h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-emerald-500" />
      </div>

      {/* Winner */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-2 ring-emerald-300 sm:h-20 sm:w-20">
          <Trophy className="h-7 w-7 text-emerald-600 sm:h-8 sm:w-8" />
        </div>
        <div className="text-center">
          <span className="text-lg font-bold text-emerald-600">$20 USDT</span>
          <p className="text-xs font-medium text-slate-600 sm:text-sm">
            {t('howItWorks.flow.winner')}
          </p>
        </div>
      </div>

      {/* Caption */}
      <p className="mx-auto mt-8 max-w-md text-center text-sm leading-relaxed text-slate-500">
        {t('howItWorks.flow.caption')}
      </p>
    </div>
  );
}

export function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="relative bg-white py-16 sm:py-24">
      <div className="section-divider absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Title */}
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          {t('howItWorks.title')}
        </h2>

        {/* Zone 1: Steps */}
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="card-glow group relative flex flex-col items-center rounded-2xl border border-slate-100 bg-slate-50/50 p-8 text-center transition-all duration-300 hover:bg-white"
              >
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-1/2 hidden h-px w-8 translate-x-full bg-slate-200 sm:block" />
                )}
                <div className="relative">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${step.color} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white shadow-sm">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">
                  {t(step.titleKey)}
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
                  {t(step.descKey)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Zone 2: Flow Diagram */}
        <FlowDiagram />

        {/* Zone 3: Security Facts */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {securityFacts.map((fact) => {
            const Icon = fact.icon;
            return (
              <div
                key={fact.titleKey}
                className="card-glow group flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 transition-all duration-300 hover:bg-white"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${fact.color} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {t(fact.titleKey)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {t(fact.descKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/HowItWorks.tsx
git commit -m "feat: rewrite HowItWorks with flow diagram and security facts"
```

---

### Task 3: Add flow-arrow CSS animations

**Files:**
- Modify: `frontend/src/app/globals.css` — add after the existing `.card-glow` block (around line 130)

- [ ] **Step 1: Add flow-arrow styles**

Add these styles after the `.card-glow:hover` block:

```css
/* Flow diagram arrows */
.flow-arrow {
  background: linear-gradient(90deg, transparent, #a5b4fc 30%, #818cf8 50%, #a5b4fc 70%, transparent);
  position: relative;
}
.flow-arrow::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid #818cf8;
}
.flow-arrow-reverse::after {
  right: auto;
  left: 0;
  border-left: none;
  border-right: 7px solid #818cf8;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat: add flow-arrow CSS for how-it-works diagram"
```

---

### Task 4: Delete TrustSection and update page layout

**Files:**
- Delete: `frontend/src/app/TrustSection.tsx`
- Modify: `frontend/src/app/page.tsx` — remove TrustSection import and usage
- Modify: `frontend/src/app/SideNav.tsx` — remove trust nav entry

- [ ] **Step 1: Delete TrustSection.tsx**

```bash
rm frontend/src/app/TrustSection.tsx
```

- [ ] **Step 2: Update page.tsx — remove TrustSection**

Remove the import line:
```typescript
import { TrustSection } from './TrustSection';
```

Remove from JSX:
```tsx
      <TrustSection />
```

The resulting page order should be:
```tsx
<SideNav />
<HeroSection />
<PublicDuelsSection />
<HowItWorks />
<RecentDuelsSection />
<PopularGamesSection />
<OnboardingSection />
<HonorSection />
<ReputationSection />
<CtaSection />
```

- [ ] **Step 3: Update SideNav.tsx — remove trust entry**

Remove this entry from the `sections` array:
```typescript
  { id: 'trust', labelKey: 'sidenav.trust' },
```

- [ ] **Step 4: Run type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS — no type errors. All `trust.*` references are removed, all new `howItWorks.*` keys exist.

- [ ] **Step 5: Run lint**

Run: `cd frontend && npm run lint`
Expected: PASS — no lint errors.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src/app/TrustSection.tsx frontend/src/app/page.tsx frontend/src/app/SideNav.tsx
git commit -m "feat: remove TrustSection, merge into HowItWorks"
```

---

### Task 5: Visual QA in browser

**Files:** None — this is a review task.

- [ ] **Step 1: Start dev server**

Run: `cd frontend && npm run dev`

- [ ] **Step 2: Check desktop layout (>1280px)**

Open `http://localhost:3000` and scroll to "How It Works":
- 3 step cards in a row with connector lines
- Flow diagram centered: two players → contract → winner
- Flow arrows have arrowheads pointing inward (toward contract)
- Vertical connector from contract down to winner with "Result confirmed" label
- 3 security fact cards in a row below
- Side nav: no "Trust" entry, "How it works" still present

- [ ] **Step 3: Check mobile layout (<640px)**

Resize browser to mobile width:
- Step cards stack vertically (1 column)
- Flow diagram stacks properly — players and contract all visible, not clipped
- Security fact cards stack vertically
- All text readable, nothing overflows

- [ ] **Step 4: Check both languages**

Switch to RU language — all strings should be translated. Switch back to EN — same.

- [ ] **Step 5: Verify no regressions**

- Hero section "See How It Works" button still scrolls to the section
- Side nav dot highlights correctly when scrolling to the section
- No console errors
- Sections above and below (PublicDuels, RecentDuels) render correctly

- [ ] **Step 6: Final commit (if any tweaks needed)**

If visual QA reveals issues, fix them and commit:
```bash
git add -A
git commit -m "fix: visual tweaks for how-it-works section"
```
