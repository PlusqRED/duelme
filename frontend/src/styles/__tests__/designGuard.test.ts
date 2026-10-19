import { describe, expect, it } from 'vitest';
import { shrinkingList, sourceFile, sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';
import { STILL_ON_PALETTE, STILL_RAW_COLOURS } from './notYetPorted';

const files = sourceFiles(['.ts', '.tsx', '.css']);

/** Where colour values are written down: the theme, and its copies for places CSS cannot reach. */
const COLOUR_SOURCES = new Set(['styles/theme.css', 'lib/brandColors.ts']);

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

function pathsMatching(pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(file.text)).map((file) => file.path);
}

const palette = shrinkingList(pathsMatching(PALETTE_CLASS), STILL_ON_PALETTE);
const rawColours = shrinkingList(
  pathsMatching(RAW_COLOUR).filter((path) => !COLOUR_SOURCES.has(path)),
  STILL_RAW_COLOURS
);

describe('design guard', () => {
  it('colours with the theme outside the files still waiting for their screen', () => {
    expect(palette.unlisted).toEqual([]);
  });

  it('lists only files that still use the palette, so the list only shrinks', () => {
    expect(palette.stale).toEqual([]);
  });

  it('writes colour values only in the theme', () => {
    expect(rawColours.unlisted).toEqual([]);
  });

  it('lists only files that still hold colour values, so the list only shrinks', () => {
    expect(rawColours.stale).toEqual([]);
  });

  it('has no dark variant, since there is no dark theme', () => {
    expect(pathsMatching(/(?<![\w-])dark:/)).toEqual([]);
  });

  it('sets figures with tabular-nums rather than a monospace face', () => {
    expect(pathsMatching(/(?<![\w-])font-mono(?![\w-])/)).toEqual([]);
  });

  it('keeps only legacy classes that a screen still uses', () => {
    const legacyClasses = [...sourceFile('styles/legacy.css').matchAll(/^\.([a-z0-9-]+)/gm)].map((match) => match[1]);
    const usedWords = new Set(
      files.filter((file) => !file.path.endsWith('.css')).flatMap((file) => file.text.match(/[\w-]+/g) ?? [])
    );

    expect([...new Set(legacyClasses)].filter((name) => !usedWords.has(name))).toEqual([]);
  });
});
