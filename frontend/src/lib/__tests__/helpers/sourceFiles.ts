import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../..');

export interface SourceFile {
  /** Relative to `src/`, with forward slashes. */
  path: string;
  text: string;
}

/** One file under `src/`, by its path relative to `src/`. */
export function sourceFile(path: string): string {
  return readFileSync(join(SRC, path), 'utf8');
}

/** Every file under `src/` that ships with one of these extensions; tests and their helpers are left out. */
export function sourceFiles(extensions: readonly string[]): SourceFile[] {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .map((path) => path.split('\\').join('/'))
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .filter((path) => !path.split('/').includes('__tests__'))
    .map((path) => ({ path, text: sourceFile(path) }));
}

/** The theme's tokens in one namespace (`color`, `text`, `font-weight`), by name, from `styles/theme.css`. */
export function themeTokens(namespace: string): Map<string, string> {
  const pattern = new RegExp(`--${namespace}-([a-z0-9-]+?):\\s*([^;]+);`, 'g');
  return new Map(
    [...sourceFile('styles/theme.css').matchAll(pattern)]
      .filter(([, name]) => !name.includes('--'))
      .map(([, name, value]) => [name, value.trim()])
  );
}
