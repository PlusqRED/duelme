import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../..');

export interface SourceFile {
  /** Relative to `src/`, with forward slashes. */
  path: string;
  text: string;
}

/** Every file under `src/` that ships with one of these extensions; tests and their helpers are left out. */
export function sourceFiles(extensions: readonly string[]): SourceFile[] {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .map((path) => path.split('\\').join('/'))
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .filter((path) => !path.split('/').includes('__tests__'))
    .map((path) => ({ path, text: readFileSync(join(SRC, path), 'utf8') }));
}
