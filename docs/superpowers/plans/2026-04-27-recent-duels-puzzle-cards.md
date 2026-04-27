# Recent Duels Puzzle-Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone `ChevronRight` connector between recent-duel cards with a shape-based interlocking pattern (rounded-arrow tab on the right edge of one card, matching notch on the left edge of the next), only at `lg` breakpoint.

**Architecture:** Pure logic + path generation in `cardShapes.ts` (TDD). A small `DuelCardShapeDefs` component mounts an inline SVG with three `<clipPath>` defs once per grid. `RecentDuelCard` accepts a `shape` prop and applies clip-path / outline-stroke / padding / shadow utilities only at `lg`. The state-accent strip flips from `border-l-*` to `border-t-*` universally — `accentClass` is referenced from a single place (`RecentDuelCard.tsx:50`), so the change is local.

**Tech Stack:** Next.js (App Router), React 18, TypeScript, Tailwind CSS v4, Vitest, lucide-react.

**Reference spec:** `docs/superpowers/specs/2026-04-27-recent-duels-puzzle-cards-design.md`

**Project git policy:** This repo's CLAUDE.md forbids `git add` / `git commit` / `git push` without explicit per-action permission from the user. The "Stage and commit" step at the end is a single batch — wait for the user's explicit go-ahead before staging or committing.

---

## File Structure

| Path                                                                    | Action  | Responsibility                                                          |
|-------------------------------------------------------------------------|---------|-------------------------------------------------------------------------|
| `frontend/src/components/duel/recent/cardShapes.ts`                     | Create  | Pure logic: `DuelCardShape` type, `getCardShapeForIndex`, `getCardShapePath`, `LG_COLUMN_COUNT`. |
| `frontend/src/components/duel/recent/__tests__/cardShapes.test.ts`      | Create  | Vitest unit tests for both pure functions.                              |
| `frontend/src/components/duel/recent/DuelCardShapeDefs.tsx`             | Create  | Hidden inline `<svg><defs>` with three `<clipPath>`s; exports stable IDs. |
| `frontend/src/lib/duelStateColors.ts`                                   | Modify  | Flip every `border-l-*` accent to `border-t-*`.                         |
| `frontend/src/components/duel/recent/RecentDuelCard.tsx`                | Modify  | Accept `shape` prop, apply per-shape classes, render outline overlay, switch base classes to `border-t-4`. |
| `frontend/src/components/duel/recent/RecentDuelsGrid.tsx`               | Modify  | Mount `<DuelCardShapeDefs/>`, compute `shape` per card, pass it down, remove `ChevronRight` connector. |

`LG_COLUMN_COUNT` migrates from `RecentDuelsGrid.tsx` into `cardShapes.ts` so the column count and shape detection share a single source of truth.

---

### Task 1: `cardShapes.ts` — types + `getCardShapeForIndex` (TDD)

**Files:**
- Create: `frontend/src/components/duel/recent/cardShapes.ts`
- Test: `frontend/src/components/duel/recent/__tests__/cardShapes.test.ts`

- [ ] **Step 1.1: Write the failing test for `getCardShapeForIndex`**

Create `frontend/src/components/duel/recent/__tests__/cardShapes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getCardShapeForIndex, LG_COLUMN_COUNT } from '../cardShapes';

describe('LG_COLUMN_COUNT', () => {
  it('exports the canonical column count for the lg grid', () => {
    expect(LG_COLUMN_COUNT).toBe(3);
  });
});

describe('getCardShapeForIndex', () => {
  it('returns "none" when there is only one card overall', () => {
    expect(getCardShapeForIndex(0, 1)).toBe('none');
  });

  it('returns "tab" for the first card of a full row with cards following', () => {
    expect(getCardShapeForIndex(0, 6)).toBe('tab');
  });

  it('returns "tab-notch" for the middle card of a full row', () => {
    expect(getCardShapeForIndex(1, 6)).toBe('tab-notch');
  });

  it('returns "notch" for the last card of a full row when more rows follow', () => {
    expect(getCardShapeForIndex(2, 6)).toBe('notch');
  });

  it('returns "tab" for the first card of a non-final row', () => {
    expect(getCardShapeForIndex(3, 6)).toBe('tab');
  });

  it('returns "notch" for the last card of the grid when its row predecessor had a tab', () => {
    expect(getCardShapeForIndex(5, 6)).toBe('notch');
  });

  it('returns "tab" for index 0 when the row has more cards but the grid stops at the row end', () => {
    expect(getCardShapeForIndex(0, 3)).toBe('tab');
  });

  it('returns "notch" for the last cell of a partial last row', () => {
    expect(getCardShapeForIndex(2, 4)).toBe('notch');
  });

  it('returns "none" for an orphan card alone on the last row', () => {
    expect(getCardShapeForIndex(3, 4)).toBe('none');
  });

  it('returns "notch" for the second of two cards in a single row', () => {
    expect(getCardShapeForIndex(1, 2)).toBe('notch');
  });

  it('respects a custom column count', () => {
    expect(getCardShapeForIndex(1, 4, 2)).toBe('notch');
    expect(getCardShapeForIndex(0, 4, 2)).toBe('tab');
  });
});
```

- [ ] **Step 1.2: Run the test and confirm it fails**

```bash
cd frontend && npx vitest run src/components/duel/recent/__tests__/cardShapes.test.ts
```

Expected: failure with "Cannot find module '../cardShapes'".

- [ ] **Step 1.3: Implement `cardShapes.ts` with the type, constant, and detection function**

Create `frontend/src/components/duel/recent/cardShapes.ts`:

```ts
export const LG_COLUMN_COUNT = 3;

export type DuelCardShape = 'none' | 'tab' | 'notch' | 'tab-notch';

export function getCardShapeForIndex(
  index: number,
  total: number,
  columns: number = LG_COLUMN_COUNT,
): DuelCardShape {
  const hasTab = index < total - 1 && (index + 1) % columns !== 0;
  const hasNotch = index > 0 && index % columns !== 0;
  if (hasTab && hasNotch) return 'tab-notch';
  if (hasTab) return 'tab';
  if (hasNotch) return 'notch';
  return 'none';
}
```

- [ ] **Step 1.4: Run the test and confirm it passes**

```bash
cd frontend && npx vitest run src/components/duel/recent/__tests__/cardShapes.test.ts
```

Expected: all 11 tests pass.

---

### Task 2: `cardShapes.ts` — `getCardShapePath` (TDD)

**Files:**
- Modify: `frontend/src/components/duel/recent/cardShapes.ts`
- Modify: `frontend/src/components/duel/recent/__tests__/cardShapes.test.ts`

- [ ] **Step 2.1: Add failing tests for `getCardShapePath`**

Append to `__tests__/cardShapes.test.ts`:

```ts
import { getCardShapePath } from '../cardShapes';

describe('getCardShapePath', () => {
  it('produces no quadratic Bézier segments for "none"', () => {
    const d = getCardShapePath('none');
    expect(d.match(/Q/g)).toBeNull();
  });

  it('produces exactly one quadratic Bézier segment for "tab"', () => {
    const d = getCardShapePath('tab');
    expect(d.match(/Q/g)?.length).toBe(1);
  });

  it('produces exactly one quadratic Bézier segment for "notch"', () => {
    const d = getCardShapePath('notch');
    expect(d.match(/Q/g)?.length).toBe(1);
  });

  it('produces exactly two quadratic Bézier segments for "tab-notch"', () => {
    const d = getCardShapePath('tab-notch');
    expect(d.match(/Q/g)?.length).toBe(2);
  });

  it('starts with a move-to command and ends with Z', () => {
    const d = getCardShapePath('tab-notch');
    expect(d.startsWith('M ')).toBe(true);
    expect(d.trimEnd().endsWith('Z')).toBe(true);
  });

  it('includes four arc commands (one per rounded corner) for every shape', () => {
    for (const shape of ['none', 'tab', 'notch', 'tab-notch'] as const) {
      const d = getCardShapePath(shape);
      expect(d.match(/A /g)?.length).toBe(4);
    }
  });
});
```

Update the existing import line so `getCardShapePath` is included with the others (consolidate into one import):

```ts
import {
  getCardShapeForIndex,
  getCardShapePath,
  LG_COLUMN_COUNT,
} from '../cardShapes';
```

- [ ] **Step 2.2: Run the new tests and confirm they fail**

```bash
cd frontend && npx vitest run src/components/duel/recent/__tests__/cardShapes.test.ts
```

Expected: failures referencing `getCardShapePath` is not exported.

- [ ] **Step 2.3: Implement `getCardShapePath`**

Append to `frontend/src/components/duel/recent/cardShapes.ts`:

```ts
const RX = 0.045;
const RY = 0.06;
const TAB_ZONE = 0.06;
const NOTCH_ZONE = 0.06;
const OPENING_TOP = 0.41;
const OPENING_BOT = 0.59;

export function getCardShapePath(shape: DuelCardShape): string {
  const hasTab = shape === 'tab' || shape === 'tab-notch';
  const hasNotch = shape === 'notch' || shape === 'tab-notch';

  const left = hasNotch ? NOTCH_ZONE : 0;
  const right = hasTab ? 1 - TAB_ZONE : 1;

  const segments: string[] = [];

  segments.push(`M ${left + RX} 0`);
  segments.push(`L ${right - RX} 0`);
  segments.push(`A ${RX} ${RY} 0 0 1 ${right} ${RY}`);

  if (hasTab) {
    segments.push(`L ${right} ${OPENING_TOP}`);
    segments.push(`Q ${1 + TAB_ZONE} 0.5 ${right} ${OPENING_BOT}`);
  }
  segments.push(`L ${right} ${1 - RY}`);
  segments.push(`A ${RX} ${RY} 0 0 1 ${right - RX} 1`);

  segments.push(`L ${left + RX} 1`);
  segments.push(`A ${RX} ${RY} 0 0 1 ${left} ${1 - RY}`);

  if (hasNotch) {
    segments.push(`L ${left} ${OPENING_BOT}`);
    segments.push(`Q ${-NOTCH_ZONE} 0.5 ${left} ${OPENING_TOP}`);
  }
  segments.push(`L ${left} ${RY}`);
  segments.push(`A ${RX} ${RY} 0 0 1 ${left + RX} 0`);

  segments.push('Z');

  return segments.join(' ');
}
```

- [ ] **Step 2.4: Run all tests in `cardShapes.test.ts` and confirm they pass**

```bash
cd frontend && npx vitest run src/components/duel/recent/__tests__/cardShapes.test.ts
```

Expected: every test passes (~17 total: 1 const + 11 detection + 6 path).

---

### Task 3: `DuelCardShapeDefs.tsx`

**Files:**
- Create: `frontend/src/components/duel/recent/DuelCardShapeDefs.tsx`

- [ ] **Step 3.1: Write the component**

Create `frontend/src/components/duel/recent/DuelCardShapeDefs.tsx`:

```tsx
import { getCardShapePath } from './cardShapes';

export const DUEL_CARD_CLIP_IDS = {
  tab: 'duel-card-clip-tab',
  notch: 'duel-card-clip-notch',
  'tab-notch': 'duel-card-clip-tab-notch',
} as const;

export function DuelCardShapeDefs() {
  return (
    <svg
      width="0"
      height="0"
      className="absolute"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath
          id={DUEL_CARD_CLIP_IDS.tab}
          clipPathUnits="objectBoundingBox"
        >
          <path d={getCardShapePath('tab')} />
        </clipPath>
        <clipPath
          id={DUEL_CARD_CLIP_IDS.notch}
          clipPathUnits="objectBoundingBox"
        >
          <path d={getCardShapePath('notch')} />
        </clipPath>
        <clipPath
          id={DUEL_CARD_CLIP_IDS['tab-notch']}
          clipPathUnits="objectBoundingBox"
        >
          <path d={getCardShapePath('tab-notch')} />
        </clipPath>
      </defs>
    </svg>
  );
}
```

- [ ] **Step 3.2: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

---

### Task 4: `duelStateColors.ts` — flip every accent direction

**Files:**
- Modify: `frontend/src/lib/duelStateColors.ts:14,19,24,29,34,39,44,49,54,59,66`

- [ ] **Step 4.1: Replace each `border-l-*` accent with `border-t-*` (colours unchanged)**

Apply the following 11 edits to `frontend/src/lib/duelStateColors.ts`. Each edit is a one-line substitution; string contents in quotes are exact:

| Line | Before                            | After                            |
|------|-----------------------------------|----------------------------------|
| 14   | `accentClass: 'border-l-blue-300',`    | `accentClass: 'border-t-blue-300',`    |
| 19   | `accentClass: 'border-l-indigo-400',`  | `accentClass: 'border-t-indigo-400',`  |
| 24   | `accentClass: 'border-l-amber-300',`   | `accentClass: 'border-t-amber-300',`   |
| 29   | `accentClass: 'border-l-emerald-400',` | `accentClass: 'border-t-emerald-400',` |
| 34   | `accentClass: 'border-l-slate-300',`   | `accentClass: 'border-t-slate-300',`   |
| 39   | `accentClass: 'border-l-slate-300',`   | `accentClass: 'border-t-slate-300',`   |
| 44   | `accentClass: 'border-l-rose-300',`    | `accentClass: 'border-t-rose-300',`    |
| 49   | `accentClass: 'border-l-orange-400',`  | `accentClass: 'border-t-orange-400',`  |
| 54   | `accentClass: 'border-l-violet-300',`  | `accentClass: 'border-t-violet-300',`  |
| 59   | `accentClass: 'border-l-sky-300',`     | `accentClass: 'border-t-sky-300',`     |
| 66   | `accentClass: 'border-l-red-400',`     | `accentClass: 'border-t-red-400',`     |

Easiest approach: a single repo-wide search-and-replace inside this one file from `border-l-` to `border-t-`. Verify after the edit that no `border-l-` remains in `duelStateColors.ts`:

```bash
cd frontend && grep -n 'border-l-' src/lib/duelStateColors.ts
```

Expected: no matches.

- [ ] **Step 4.2: Type-check and re-run the existing test suite**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```

Expected: type-check clean; all tests still pass.

---

### Task 5: `RecentDuelCard.tsx` — accept shape, render outline, switch base classes

**Files:**
- Modify: `frontend/src/components/duel/recent/RecentDuelCard.tsx`

- [ ] **Step 5.1: Add the shape prop, imports, and `SHAPE_CLASSES` lookup**

Update the imports at the top of the file (the existing imports stay; add the two new ones at the bottom of the import block):

```ts
import { type DuelCardShape, getCardShapePath } from './cardShapes';
import { DUEL_CARD_CLIP_IDS } from './DuelCardShapeDefs';
```

Replace the `RecentDuelCardProps` interface:

```ts
interface RecentDuelCardProps {
  duel: RecentDuel;
  gameName?: string | null;
  gameSlug?: string | null;
  resolveDisplay: (address: string) => string;
  nicknameByAddress: Record<string, string | null>;
  shape: DuelCardShape;
}
```

Add a static class lookup just below the interface (still above the component) — Tailwind v4's JIT scanner only picks up class strings that appear literally in the source, so every utility variant must be present as a static substring:

```ts
const SHAPE_CLASSES: Record<DuelCardShape, string> = {
  none: '',
  tab: 'lg:[clip-path:url(#duel-card-clip-tab)] lg:pr-6 lg:border-x-0 lg:border-b-0 lg:shadow-none lg:drop-shadow-sm lg:hover:drop-shadow-md',
  notch: 'lg:[clip-path:url(#duel-card-clip-notch)] lg:pl-6 lg:border-x-0 lg:border-b-0 lg:shadow-none lg:drop-shadow-sm lg:hover:drop-shadow-md',
  'tab-notch': 'lg:[clip-path:url(#duel-card-clip-tab-notch)] lg:px-6 lg:border-x-0 lg:border-b-0 lg:shadow-none lg:drop-shadow-sm lg:hover:drop-shadow-md',
};
```

Note: the IDs here MUST match the constants in `DuelCardShapeDefs.tsx`. They are duplicated literally (instead of interpolated) because Tailwind's class scanner cannot resolve template literals.

- [ ] **Step 5.2: Destructure the new prop and rewrite the root `<Link>` className + outline overlay**

Update the function signature destructure and the body. The new `RecentDuelCard` body (replace lines 25–131 of the original):

```tsx
export function RecentDuelCard({
  duel,
  gameName,
  gameSlug,
  resolveDisplay,
  nicknameByAddress,
  shape,
}: RecentDuelCardProps) {
  const { t, language } = useTranslation();
  const timeAgo = useTimeAgo();

  const isTimedOut =
    duel.state === DuelState.WinnerClaimed && isDuelClaimTimedOut(duel.claimTimestamp);
  const stateConfig = isTimedOut ? TIMED_OUT_CONFIG : DUEL_STATE_CONFIG[duel.state];
  const hasWinner = duel.state === DuelState.Resolved;
  const isPlayer1Winner =
    hasWinner && duel.winner.toLowerCase() === duel.player1.toLowerCase();
  const isPlayer2Winner = hasWinner && !isPlayer1Winner;
  const showMessage = hasVisibleDuelMessage(duel.message);

  return (
    <Link
      href={`/duel/${duel.id}`}
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border border-t-4 border-slate-200 bg-white shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md',
        stateConfig.accentClass,
        SHAPE_CLASSES[shape],
      )}
    >
      {shape !== 'none' && (
        <svg
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
        >
          <path
            d={getCardShapePath(shape)}
            fill="none"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            className="stroke-slate-200 transition-colors group-hover:stroke-indigo-200"
          />
        </svg>
      )}

      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700"
            title={`Duel #${duel.id}`}
          >
            <Link2 className="h-3 w-3" aria-hidden="true" />
            #{duel.id}
          </span>
          {gameName ? (
            <GameBadge gameName={gameName} gameSlug={gameSlug ?? undefined} />
          ) : (
            <Badge variant="outline" className="text-xs">
              {duel.chainName}
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end leading-tight">
          <span className="text-base font-bold text-slate-900">
            {duel.wager} <span className="text-xs font-medium text-slate-400">USDT</span>
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <PlayerRow
          address={duel.player1}
          chainId={duel.chainId}
          isWinner={isPlayer1Winner}
          isLoser={isPlayer2Winner}
          resolveDisplay={resolveDisplay}
          nicknameByAddress={nicknameByAddress}
        />

        <div className="flex items-center justify-center" aria-hidden="true">
          <span className="vs-badge">VS</span>
        </div>

        <PlayerRow
          address={duel.player2}
          chainId={duel.chainId}
          isWinner={isPlayer2Winner}
          isLoser={isPlayer1Winner}
          resolveDisplay={resolveDisplay}
          nicknameByAddress={nicknameByAddress}
        />

        {showMessage && (
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="line-clamp-2 text-xs italic text-slate-600">
              &ldquo;{truncateUnicode(duel.message, 80)}&rdquo;
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
            stateConfig.colorClass,
          )}
        >
          {t(stateConfig.key)}
        </span>
        <span
          className="text-xs text-slate-500"
          title={formatDateTime(duel.lastEventAt, language)}
        >
          {timeAgo(duel.lastEventAt)}
        </span>
        <ArrowRight
          className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
```

Notable changes vs. the original:
- Root `<Link>` className: `border border-l-4` → `border border-t-4`. `hover:border-indigo-200` is preserved (it has no visible effect on shaped cards at `lg` because their CSS border-x and border-b are turned off, but it keeps the hover indication on `<lg` and on `shape === 'none'` cards intact).
- Added `relative` to enable absolutely positioned outline SVG.
- Added the conditional outline `<svg>` block immediately inside `<Link>`.
- All other JSX inside the body is unchanged from the original.

- [ ] **Step 5.3: Type-check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors. (`shape` is now required by the type, so `RecentDuelsGrid.tsx` will surface a TS error — that is fixed in Task 6.)

If the type-check error is **only** the missing `shape` prop on `RecentDuelCard` callers in `RecentDuelsGrid.tsx`, that is expected. Move on; do not silence it.

---

### Task 6: `RecentDuelsGrid.tsx` — wire up shape and remove the chevron connector

**Files:**
- Modify: `frontend/src/components/duel/recent/RecentDuelsGrid.tsx`

- [ ] **Step 6.1: Replace the file contents**

Overwrite `frontend/src/components/duel/recent/RecentDuelsGrid.tsx` with:

```tsx
'use client';

import type { RecentDuel } from '@/hooks/useRecentDuels';
import { useTranslation } from '@/i18n/useTranslation';
import type { DuelMeta } from '@/lib/game';
import { getCardShapeForIndex } from './cardShapes';
import { DuelCardShapeDefs } from './DuelCardShapeDefs';
import { RecentDuelCard } from './RecentDuelCard';

interface RecentDuelsGridProps {
  duels: RecentDuel[];
  isLoading: boolean;
  metaByDuelId: Record<number, DuelMeta>;
  resolveDisplay: (address: string) => string;
  nicknameByAddress: Record<string, string | null>;
}

export function RecentDuelsGrid({
  duels,
  isLoading,
  metaByDuelId,
  resolveDisplay,
  nicknameByAddress,
}: RecentDuelsGridProps) {
  const { t } = useTranslation();

  if (isLoading && duels.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (duels.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">{t('recent.noActivity')}</p>
      </div>
    );
  }

  return (
    <>
      <DuelCardShapeDefs />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-x-7">
        {duels.map((duel, index) => {
          const meta = metaByDuelId[duel.id];
          const shape = getCardShapeForIndex(index, duels.length);
          return (
            <RecentDuelCard
              key={duel.id}
              duel={duel}
              gameName={meta?.gameName}
              gameSlug={meta?.gameSlug}
              resolveDisplay={resolveDisplay}
              nicknameByAddress={nicknameByAddress}
              shape={shape}
            />
          );
        })}
      </div>
    </>
  );
}
```

Removed vs. the original:
- `import { ChevronRight } from 'lucide-react';` (no longer used)
- The local `LG_COLUMN_COUNT` constant (now imported from `cardShapes.ts` via `getCardShapeForIndex`)
- The wrapping `<div className="relative h-full">` and the `{showConnector && <span>…<ChevronRight/>…</span>}` block — `RecentDuelCard` is now a direct grid child and the connector is gone.

- [ ] **Step 6.2: Type-check, lint, and run the test suite**

```bash
cd frontend && npx tsc --noEmit && npm run lint && npx vitest run
```

Expected: type-check clean, lint clean, all tests pass.

---

### Task 7: Manual visual verification

**Files:** none (browser-side check only)

- [ ] **Step 7.1: Start the dev server**

```bash
cd frontend && npm run dev
```

Wait for "Ready in …" log, then open the listed URL (typically `http://localhost:3000`).

- [ ] **Step 7.2: Verify the homepage teaser at `lg+`**

Open `/`, scroll to the "Recent duels" section, set the viewport width to ≥1024 px (e.g. desktop browser at full width). Confirm:
- Cards in the same row interlock visually: card 0 and card 3 carry a tab on the right; card 2 and card 5 carry a notch on the left; card 1 and card 4 carry both.
- The previous round chevron icon is gone.
- Hover on a shaped card transitions the SVG outline from slate-200 to indigo-200 smoothly along the curve, and the card lifts with a soft drop-shadow that follows the puzzle contour (no clipped halo).
- The state-colour strip is on the **top** edge of every card.

- [ ] **Step 7.3: Verify `/duels/recent` at `lg+` with varying card counts**

Open `/duels/recent`. With infinite scroll, the grid will grow. Confirm at total counts 1, 2, 3, 4, 5, 6, 7, 12 cards (use search/filters to constrain if needed):
- Single card → no tab, no notch, no outline overlay.
- Last card of any partial row → no tab.
- First card of any row → no notch.
- Cards in the middle of any 3-wide row → both.

- [ ] **Step 7.4: Verify mobile and `sm` regressions**

Resize the viewport to 360 px and 768 px. Confirm:
- No clip-path applied — cards are plain rounded rectangles.
- CSS border on all four sides; the state colour now shows on the **top** edge (regression vs. the previous left-edge accent — this is intentional per the spec).
- No SVG outline overlay visible.
- Tap targets unchanged (the `<Link>` covers the whole card).

- [ ] **Step 7.5: Verify accessibility**

In DevTools:
- Inspect the `<svg>` overlay — confirm `aria-hidden="true"` and `pointer-events-none`.
- Tab to a card with the keyboard; the focus ring should land on the `<Link>` and the card should remain a single accessible link.

If any check fails, fix the issue (most likely a missing static class string Tailwind didn't pick up — confirm SHAPE_CLASSES strings exactly match the IDs in `DUEL_CARD_CLIP_IDS`) and re-verify.

---

### Task 8: Stage and commit (REQUIRES EXPLICIT USER PERMISSION)

**Do not run `git add` or `git commit` until the user explicitly authorises this step in the current message.** This repo's CLAUDE.md forbids unprompted git commands; permission is per-action, not session-wide.

When the user says "commit" / "go ahead and commit" / equivalent:

- [ ] **Step 8.1: Review the diff one last time**

```bash
git status
git diff
```

Confirm the diff matches the spec — six files touched (5 source + 1 test), no incidental changes.

- [ ] **Step 8.2: Stage exactly the files in the plan**

```bash
git add \
  frontend/src/components/duel/recent/cardShapes.ts \
  frontend/src/components/duel/recent/__tests__/cardShapes.test.ts \
  frontend/src/components/duel/recent/DuelCardShapeDefs.tsx \
  frontend/src/components/duel/recent/RecentDuelCard.tsx \
  frontend/src/components/duel/recent/RecentDuelsGrid.tsx \
  frontend/src/lib/duelStateColors.ts
```

- [ ] **Step 8.3: Commit with a single message**

```bash
git commit -m "feat(recent-duels): replace chevron connector with puzzle-shaped cards

At lg breakpoint, recent-duel cards now interlock via a rounded-arrow tab on
the right edge and a matching notch on the left, replacing the standalone
ChevronRight icon between cards. State accent strip moves from border-l to
border-t universally."
```

(Per CLAUDE.md, **no `Co-Authored-By` line, no AI attribution.**)

- [ ] **Step 8.4: Verify the commit landed**

```bash
git log -1 --stat
```

Expected: 6 files changed; new files include `cardShapes.ts`, `cardShapes.test.ts`, `DuelCardShapeDefs.tsx`.

---

## Out of scope

- Tab depth / opening height customisation (single shape for the whole grid).
- Visual changes on `<lg` beyond accent direction.
- Connector concepts on dashboard, profile, duel detail, or any non-recent surface.
- JS-driven dynamic geometry (no `ResizeObserver`, no fixed-pixel tab heights).
- Tests for React components (only pure logic in `cardShapes.ts` is unit-tested; everything else is verified manually in Task 7).
