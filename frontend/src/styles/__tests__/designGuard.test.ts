import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { sourceFile, sourceFiles, themeTokens } from '@/lib/__tests__/helpers/sourceFiles';

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

const PALETTE_COLOUR = `(?:(?:${PALETTES.join('|')})-\\d{2,3}|white|black)(?![\\w-])`;

/**
 * A colour from Tailwind's own palette instead of a role from the theme: as a class (`bg-slate-50`,
 * `hover:text-white`) or as its variable (`bg-(--color-slate-50)`).
 */
const PALETTE_CLASS = new RegExp(
  `(?<![\\w-])(?:${COLOUR_UTILITIES.join('|')})-${PALETTE_COLOUR}|--color-${PALETTE_COLOUR}`
);

/**
 * A colour value: `#eef2ff` (also inside an arbitrary class), any CSS colour function, or white and
 * black by name as a value (`bg-[white]`, `[--keycap-edge:black]`, `color: 'white'`).
 */
const RAW_COLOUR =
  /#[0-9a-f]{3,8}(?![0-9a-z-])|(?<![a-z-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(|(?:[[:]\s*|['"])(?:white|black)(?=\s*[\]'";)}])/i;

/** Each `@theme` block of a stylesheet, plain or inline (with any other options too), with its body up to its own closing brace. */
function themeBlocks(css: string): { isInline: boolean; body: string }[] {
  return [...css.matchAll(/@theme\b([^{;]*)\{/g)].map((match) => {
    const start = match.index + match[0].length;
    let depth = 1;
    let end = start;
    for (; end < css.length && depth > 0; end++) {
      if (css[end] === '{') depth++;
      if (css[end] === '}') depth--;
    }
    return { isInline: /\binline\b/.test(match[1]), body: css.slice(start, end - 1) };
  });
}

/**
 * The moves of a plain `@theme` that read a variable no theme declares, such as a length the
 * element playing them sets. A plain theme variable resolves on `:root`, where that variable does
 * not exist, so the move is silently dropped; it belongs in `@theme inline`.
 */
function movesReadingElementVariables(css: string[]): string[] {
  const blocks = css.flatMap(themeBlocks);
  const declared = new Set(blocks.flatMap(({ body }) => [...body.matchAll(/^\s*(--[\w-]+):/gm)].map(([, name]) => name)));
  return blocks
    .filter(({ isInline }) => !isInline)
    .flatMap(({ body }) => [...body.matchAll(/(--animate-[\w-]+):([^;]+);/g)])
    .filter(([, , value]) => [...value.matchAll(/var\((--[\w-]+)/g)].some(([, name]) => !declared.has(name)))
    .map(([, name]) => name);
}

function pathsMatching(pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(file.text)).map((file) => file.path);
}

const COLOUR_EXAMPLES = [
  'bg-slate-50',
  'hover:text-white',
  'bg-(--color-slate-50)',
  'bg-[#eef2ff]',
  'rgb(4 8 31 / 0.5)',
  'bg-[white]',
  '[--keycap-edge:black]',
  "style={{ background: 'white' }}",
];
const NOT_COLOUR_EXAMPLES = ['bg-canvas', 'text-ink-3', 'font-black', 'not a black box', 'shadow-menu'];

describe('design guard', () => {
  it.each(COLOUR_EXAMPLES)('sees a colour outside the theme in %s', (text) => {
    expect(PALETTE_CLASS.test(text) || RAW_COLOUR.test(text)).toBe(true);
  });

  it.each(NOT_COLOUR_EXAMPLES)('sees no colour outside the theme in %s', (text) => {
    expect(PALETTE_CLASS.test(text) || RAW_COLOUR.test(text)).toBe(false);
  });

  it('colours with the theme only', () => {
    expect(pathsMatching(PALETTE_CLASS)).toEqual([]);
  });

  it('writes colour values only in the theme', () => {
    expect(pathsMatching(RAW_COLOUR).filter((path) => !COLOUR_SOURCES.has(path))).toEqual([]);
  });

  it('knows every palette Tailwind ships', () => {
    const tailwindTheme = createRequire(import.meta.url).resolve('tailwindcss/theme.css');
    const shipped = [...readFileSync(tailwindTheme, 'utf8').matchAll(/--color-([a-z]+)-50:/g)];

    expect(shipped.map((match) => match[1]).sort()).toEqual([...PALETTES].sort());
  });

  it('names no colour like a type size, since `text-<name>` would then paint the text in it', () => {
    const sizes = new Set(themeTokens('text').keys());

    expect([...themeTokens('color').keys()].filter((colour) => sizes.has(colour))).toEqual([]);
  });

  it('has no dark variant, since there is no dark theme', () => {
    expect(pathsMatching(/(?<![\w-])dark:/)).toEqual([]);
  });

  it('sets figures with tabular-nums rather than a monospace face', () => {
    expect(pathsMatching(/(?<![\w-])font-mono(?![\w-])/)).toEqual([]);
  });

  it('sees a move in a plain theme that reads a length its element sets', () => {
    const css = '@theme {\n  --ease-x: ease;\n  --animate-ok: ok 1s var(--ease-x);\n  --animate-fill: fill var(--dwell) linear;\n}';

    expect(movesReadingElementVariables([css])).toEqual(['--animate-fill']);
  });

  it('reads a theme on one line and an inline theme with more options', () => {
    const css = '@theme { --animate-fill: fill var(--dwell) linear; }\n@theme static inline { --animate-leave: leave var(--leave) ease-in; }';

    expect(movesReadingElementVariables([css])).toEqual(['--animate-fill']);
  });

  it('keeps every move that reads a length its element sets in an inline theme', () => {
    const css = files.filter((file) => file.path.endsWith('.css')).map((file) => file.text);

    expect(movesReadingElementVariables(css)).toEqual([]);
  });

  it('puts every move in its final place at once with motion reduced, a delayed one too', () => {
    const reduced = sourceFile('styles/motion.css').match(/@media \(prefers-reduced-motion: reduce\) \{[^@]*/)?.[0] ?? '';

    expect(['animation-delay', 'transition-delay'].filter((delay) => !reduced.includes(`${delay}: 0s !important`))).toEqual([]);
  });
});
