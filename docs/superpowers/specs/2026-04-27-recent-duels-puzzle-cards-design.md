# Recent Duels — Puzzle-Card Connectors (Design)

**Date:** 2026-04-27
**Surfaces affected:** `/` (RecentDuelsTeaser), `/duels/recent` (RecentDuelsGrid)
**Status:** Draft → pending user approval

## Goal

Replace the standalone `ChevronRight` connector currently rendered between cards
in the `lg` 3-column grid with a shape-based interlocking pattern: each card in
the middle of a row carries a rounded-arrow tab on its right edge and a matching
notch on its left edge. The result reads as a directional sequence ("next →
next → next") and feels like loosely-fitting puzzle pieces with a visible gap.

## Decisions (locked)

1. **Tab shape:** rounded-arrow ("bell") via single quadratic Bézier — option B.
2. **Spacing:** preserve existing horizontal gap (`lg:gap-x-7`) — tab and notch
   are visible separately with breathing room (no zero-gap interlock).
3. **State accent:** moved from `border-l-4` to `border-t-4` **universally**.
   Verified: `accentClass` is referenced only in
   `frontend/src/components/duel/recent/RecentDuelCard.tsx:50`, so strategy (i)
   is fully local — no other surfaces are affected.
4. **Breakpoint scope:** clip-path / outline / padding adjustments apply only at
   `lg` (≥1024px). Mobile (`<sm`) and `sm` keep ordinary rectangular cards with
   CSS `border`.
5. **Implementation:** SVG `<clipPath clipPathUnits="objectBoundingBox">` for the
   shape + sibling `<svg>` overlay drawing the same `<path>` as a stroke
   (replacement for `border`).

## Architecture

```
frontend/src/components/duel/recent/
├── cardShapes.ts          [NEW]  shape detection + SVG path generator
├── DuelCardShapeDefs.tsx  [NEW]  hidden <svg><defs> with three <clipPath>
├── RecentDuelsGrid.tsx    [EDIT] mount defs once, compute shape per card,
│                                  remove ChevronRight connector
└── RecentDuelCard.tsx     [EDIT] accept `shape` prop, apply clip-path class +
                                   padding + outline overlay; switch accent to top
frontend/src/lib/duelStateColors.ts  [EDIT] border-l-* → border-t-*
```

Data flow:

1. `RecentDuelsGrid` renders `<DuelCardShapeDefs />` once, then maps duels to
   `<RecentDuelCard>` passing a computed `shape` prop.
2. `RecentDuelCard` applies `lg:[clip-path:url(#...)]` + `lg:pl-6` / `lg:pr-6` +
   removes its `border` / `border-l-4` (replaced by SVG outline). Accent is
   always `border-t-4 border-{stateColor}`.

## Geometry

In `objectBoundingBox` (coords 0–1, scale with the card):

| Constant     | Value | Notes                                              |
|--------------|-------|----------------------------------------------------|
| `rx`         | 0.045 | corner radius, x-axis                              |
| `ry`         | 0.06  | corner radius, y-axis                              |
| `tabZone`    | 0.06  | width reserved on the right for the tab            |
| `notchZone`  | 0.06  | width reserved on the left for the notch           |
| `openingTop` | 0.41  | top y of tab/notch opening                         |
| `openingBot` | 0.59  | bottom y of tab/notch opening                      |
| `tipX` (tab)   | 1.0  | tab tip at right edge of bounding box              |
| `tipX` (notch) | 0.0  | notch deepest point at left edge of bounding box   |

A tab is a single quadratic Bézier whose vertex sits at the right edge of the
bounding box. For a Bézier with endpoints at `(a, openingTop)` and
`(a, openingBot)` and control point at `(c, 0.5)`, the vertex sits at
`x = (a + c) / 2`. To place the vertex at `x = 1` with `a = 1 - tabZone`,
the control point is `c = 1 + tabZone`. Coords > 1 are valid in
`objectBoundingBox` — they describe the curve's control geometry; the curve
itself stays within the box.

```
M (1 - tabZone, openingTop)
Q (1 + tabZone, 0.5) (1 - tabZone, openingBot)
```

A notch mirrors the curve inward, vertex at `x = 0`:

```
Q (- notchZone, 0.5)   // control point at -notchZone, endpoints at notchZone
```

`getCardShapePath(shape)` returns the full path string for one of four variants:
`'none'`, `'tab'`, `'notch'`, `'tab-notch'`.

## Shape detection

```ts
// cardShapes.ts
export const LG_COLUMN_COUNT = 3;

export type DuelCardShape = 'none' | 'tab' | 'notch' | 'tab-notch';

export function getCardShapeForIndex(
  index: number,
  total: number,
  columns = LG_COLUMN_COUNT,
): DuelCardShape {
  const hasTab   = index < total - 1 && (index + 1) % columns !== 0;
  const hasNotch = index > 0          && index       % columns !== 0;
  if (hasTab && hasNotch) return 'tab-notch';
  if (hasTab)             return 'tab';
  if (hasNotch)           return 'notch';
  return 'none';
}
```

## Clip-path defs

`DuelCardShapeDefs` renders a single hidden SVG once per grid:

```tsx
<svg width="0" height="0" className="absolute" aria-hidden="true">
  <defs>
    <clipPath id="duel-card-clip-tab"       clipPathUnits="objectBoundingBox">
      <path d={getCardShapePath('tab')} />
    </clipPath>
    <clipPath id="duel-card-clip-notch"     clipPathUnits="objectBoundingBox">
      <path d={getCardShapePath('notch')} />
    </clipPath>
    <clipPath id="duel-card-clip-tab-notch" clipPathUnits="objectBoundingBox">
      <path d={getCardShapePath('tab-notch')} />
    </clipPath>
  </defs>
</svg>
```

(No `<clipPath>` for `'none'` — those cards skip clip-path entirely.)

## Card outline overlay

Inside each shaped card:

```tsx
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
```

Why `strokeWidth={2}`: the path is centered on the contour and the parent's
clip-path cuts the outer half, so a 2px stroke renders as ~1px visible inside —
matching the original `border` thickness.

## Card class changes

Current root classes (RecentDuelCard.tsx:47-51):

```
'group flex h-full flex-col rounded-2xl border border-l-4 border-slate-200
 bg-white shadow-sm transition-all',
'hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md',
stateConfig.accentClass,   // currently border-l-{color}
```

New (conceptual; final Tailwind syntax may consolidate via `cn()`):

```
// base — all breakpoints
'group relative flex h-full flex-col rounded-2xl bg-white transition-all',
'hover:-translate-y-0.5',
'border border-t-4 border-slate-200',     // CSS border + thicker top accent strip
stateConfig.accentClass,                  // overrides border-t color

// shadow handling — see §"Shadow handling"
'shadow-sm hover:shadow-md',
shape !== 'none' && 'lg:shadow-none lg:drop-shadow-sm lg:hover:drop-shadow-md',

// shaped variants at lg — drop CSS side/bottom borders (SVG outline supplies
// the contour) and apply clip-path + padding for the tab/notch zone
shape !== 'none' && 'lg:border-x-0 lg:border-b-0',
shape === 'tab'       && 'lg:[clip-path:url(#duel-card-clip-tab)]       lg:pr-6',
shape === 'notch'     && 'lg:[clip-path:url(#duel-card-clip-notch)]     lg:pl-6',
shape === 'tab-notch' && 'lg:[clip-path:url(#duel-card-clip-tab-notch)] lg:px-6',
```

The `border-t-4` accent applies at every breakpoint (strategy (i)). The CSS
`border` (sides + bottom) stays at `<lg` and on `shape === 'none'` cards at `lg`;
it is dropped on shaped cards at `lg` because clip-path would render it
incorrectly along the curved tab/notch contour. The SVG outline overlay
(see §"Card outline overlay") supplies that contour visually.

## State accent (duelStateColors.ts)

Each `accentClass` switches direction only — colours unchanged:

| State                    | Before                  | After                  |
|--------------------------|-------------------------|------------------------|
| `Created`                | `border-l-blue-300`     | `border-t-blue-300`    |
| `Funded`                 | `border-l-indigo-400`   | `border-t-indigo-400`  |
| `WinnerClaimed`          | `border-l-amber-300`    | `border-t-amber-300`   |
| `Resolved`               | `border-l-emerald-400`  | `border-t-emerald-400` |
| `Refunded`               | `border-l-slate-300`    | `border-t-slate-300`   |
| `Cancelled`              | `border-l-slate-300`    | `border-t-slate-300`   |
| `Declined`               | `border-l-rose-300`     | `border-t-rose-300`    |
| `Disputed`               | `border-l-orange-400`   | `border-t-orange-400`  |
| `MutualCancelRequested`  | `border-l-violet-300`   | `border-t-violet-300`  |
| `MutuallyCancelled`      | `border-l-sky-300`      | `border-t-sky-300`     |
| `TIMED_OUT_CONFIG`       | `border-l-red-400`      | `border-t-red-400`     |

## Below `lg` (mobile / sm)

- `shape` resolves to whatever the formula yields, but no clip-path / no outline
  / no padding adjustment is applied (every shape utility is `lg:`-prefixed).
- Accent is `border-t-4 border-{state}` universally (strategy (i)).
- Card keeps ordinary CSS `border border-slate-200` for sides + bottom.

## Shadow handling

`box-shadow` is computed from the border-box and then clipped by `clip-path`,
so on shaped cards at `lg` the halo would be cut along the puzzle contour and
the card would appear to lose its shadow. Replace with `filter: drop-shadow()`
on shaped cards only — `drop-shadow` follows the actual rendered shape and
produces a soft halo around the tab and notch:

- `<lg` and `shape === 'none'` at `lg`: keep `shadow-sm hover:shadow-md`
  (matches today, no visual regression).
- shaped variants at `lg`: switch to
  `lg:shadow-none lg:drop-shadow-sm lg:hover:drop-shadow-md`.

Tailwind ships `drop-shadow-{sm,md}` utilities, so no custom CSS is needed.

## Connector removal

`RecentDuelsGrid.tsx:62-69` — delete the entire `{showConnector && <span>…
<ChevronRight/>…</span>}` block and the `ChevronRight` import. `LG_COLUMN_COUNT`
moves to `cardShapes.ts` (single source of truth) and is re-exported.

## Edge cases

| Index / total / columns | Result        | Why                                    |
|-------------------------|---------------|----------------------------------------|
| `0 / 1 / 3`             | `none`        | only card overall                      |
| `0 / 6 / 3`             | `tab`         | first of full row, has next            |
| `1 / 6 / 3`             | `tab-notch`   | middle of row                          |
| `2 / 6 / 3`             | `notch`       | last of full row                       |
| `3 / 6 / 3`             | `tab`         | first of next row, has next            |
| `5 / 6 / 3`             | `notch`       | last of grid, prev was a tab           |
| `0 / 4 / 3`             | `tab`         | first of row 1                         |
| `2 / 4 / 3`             | `notch`       | last of row 1                          |
| `3 / 4 / 3`             | `none`        | sole card on row 2                     |
| `1 / 2 / 3`             | `notch`       | only row, second card                  |

## Tests

`frontend/src/components/duel/recent/cardShapes.test.ts` (new):

- `getCardShapeForIndex` covers the table above
- `getCardShapePath('none')` contains no `Q` command (no curves beyond corner arcs)
- `getCardShapePath('tab')` contains exactly one `Q` command
- `getCardShapePath('notch')` contains exactly one `Q` command
- `getCardShapePath('tab-notch')` contains exactly two `Q` commands
- `LG_COLUMN_COUNT` exported as `3`

Manual verification:

- Run `npm run dev`, view `/` and `/duels/recent` at viewport widths
  360 / 768 / 1280 / 1536, with grid sizes 1, 2, 3, 4, 5, 6, 7, 12 duels.
- Confirm hover transitions stroke colour smoothly.
- Confirm card click area is unchanged (SVG has `pointer-events-none`).
- Confirm screen-reader still treats card as a single link (SVG `aria-hidden`).

## Out of scope

- Tab-depth / opening-height customisation (single shape for all).
- Visual changes on `<lg` beyond the accent direction.
- New connector concepts on the dashboard, profile, or any other surface.
- JS-driven dynamic geometry (e.g., `ResizeObserver`-based fixed-pixel tab).

## Resolved decisions

- Strategy (i) — top accent at every breakpoint. No `border-l-4` survives.
- `accentClass` field name kept as-is (semantically still "accent"); only its
  string values flip from `border-l-*` to `border-t-*`.
- `accentClass` is referenced exactly once
  (`RecentDuelCard.tsx:50`) — no other surface needs to change.
