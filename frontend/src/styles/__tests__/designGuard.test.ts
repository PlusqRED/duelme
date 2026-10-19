import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { shrinkingList, sourceFile, sourceFiles } from '@/lib/__tests__/helpers/sourceFiles';
import { STILL_ON_PALETTE, STILL_RAW_COLOURS } from './notYetPorted';

const files = sourceFiles(['.ts', '.tsx', '.css']);

/** Where colour values are written down: the theme, and its copies for places CSS cannot reach. */
const COLOUR_SOURCES = new Set(['styles/theme.css', 'lib/brandColors.ts']);

/** Every palette Tailwind ships, as `--color-<name>-50` in tailwindcss/theme.css; a test below keeps this in step. */
const PALETTES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'mauve', 'olive', 'mist', 'taupe', 'red', 'orange', 'amber',
  'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
];
const COLOUR_UTILITIES = [
  'bg', 'text', 'border', 'border-[trblxyse]', 'ring', 'ring-offset', 'inset-ring', 'shadow', 'inset-shadow',
  'drop-shadow', 'text-shadow', 'from', 'via', 'to', 'fill', 'stroke', 'outline', 'decoration', 'divide',
  'placeholder', 'caret', 'accent',
];

/** A colour from Tailwind's own palette (`bg-slate-50`, `hover:text-white`) instead of a role from the theme. */
const PALETTE_CLASS = new RegExp(
  `(?<![\\w-])(?:${COLOUR_UTILITIES.join('|')})-(?:(?:${PALETTES.join('|')})-\\d{2,3}|white|black)(?![\\w-])`
);

/** A colour value: `#eef2ff` (also inside an arbitrary class), or any CSS colour function. */
const RAW_COLOUR = /#[0-9a-f]{3,8}(?![0-9a-z-])|(?<![a-z-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(/i;

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

  it('knows every palette Tailwind ships', () => {
    const tailwindTheme = createRequire(import.meta.url).resolve('tailwindcss/theme.css');
    const shipped = [...readFileSync(tailwindTheme, 'utf8').matchAll(/--color-([a-z]+)-50:/g)];

    expect(shipped.map((match) => match[1]).sort()).toEqual([...PALETTES].sort());
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
