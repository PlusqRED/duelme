import { describe, expect, it } from 'vitest';
import { sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';
import { STILL_ON_PALETTE, STILL_RAW_COLOURS } from './notYetPorted';

const files = sourceFiles(['.ts', '.tsx', '.css']);
const code = files.filter((file) => !file.path.endsWith('.css'));

/** Where colour values are written down: the theme, and its copies for places CSS cannot reach. */
const COLOUR_SOURCES = ['styles/theme.css', 'lib/brandColors.ts'];

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COLOUR_UTILITIES =
  'bg|text|border|border-[trblxy]|ring|ring-offset|from|via|to|fill|stroke|shadow|outline|decoration|divide|placeholder|caret|accent';

/** A colour from Tailwind's own palette (`bg-slate-50`, `hover:text-white`) instead of a role from the theme. */
const PALETTE_CLASS = new RegExp(
  `(?<![\\w-])(?:${COLOUR_UTILITIES})-(?:(?:${PALETTE})-\\d{2,3}|white|black)(?![\\w-])`
);

/** A colour value: `#eef2ff` (also inside an arbitrary class), `rgba(…)`, `hsl(…)`, `oklch(…)`. */
const RAW_COLOUR = /#[0-9a-f]{3,8}(?![0-9a-z-])|(?<![a-z])(?:rgba?|hsla?|oklch)\(/i;

function pathsMatching(pattern: RegExp, among = files): string[] {
  return among.filter((file) => pattern.test(file.text)).map((file) => file.path);
}

describe('design guard', () => {
  it('colours with the theme outside the files still waiting for their screen', () => {
    const waiting = new Set(STILL_ON_PALETTE);

    expect(pathsMatching(PALETTE_CLASS).filter((path) => !waiting.has(path))).toEqual([]);
  });

  it('lists only files that still use the palette, so the list only shrinks', () => {
    const onPalette = new Set(pathsMatching(PALETTE_CLASS));

    expect(STILL_ON_PALETTE.filter((path) => !onPalette.has(path))).toEqual([]);
  });

  it('writes colour values only in the theme', () => {
    const allowed = new Set([...COLOUR_SOURCES, ...STILL_RAW_COLOURS]);

    expect(pathsMatching(RAW_COLOUR).filter((path) => !allowed.has(path))).toEqual([]);
  });

  it('lists only files that still hold colour values, so the list only shrinks', () => {
    const holding = new Set(pathsMatching(RAW_COLOUR));

    expect(STILL_RAW_COLOURS.filter((path) => !holding.has(path))).toEqual([]);
  });

  it('has no dark variant, since there is no dark theme', () => {
    expect(pathsMatching(/(?<![\w-])dark:/)).toEqual([]);
  });

  it('sets figures with tabular-nums rather than a monospace face', () => {
    expect(pathsMatching(/(?<![\w-])font-mono(?![\w-])/)).toEqual([]);
  });

  it('keeps only legacy classes that a screen still uses', () => {
    const legacy = files.find((file) => file.path === 'styles/legacy.css')?.text ?? '';
    const classes = new Set([...legacy.matchAll(/^\.([a-z0-9-]+)/gm)].map((match) => match[1]));

    expect(
      [...classes].filter((name) => !pathsMatching(new RegExp(`(?<![\\w-])${name}(?![\\w-])`), code).length)
    ).toEqual([]);
  });
});
