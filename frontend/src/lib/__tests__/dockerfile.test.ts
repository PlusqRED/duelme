import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FRONTEND = join(__dirname, '../../..');

const dockerfile = readFileSync(join(FRONTEND, 'Dockerfile'), 'utf8');
const dockerignore = readFileSync(join(FRONTEND, '.dockerignore'), 'utf8');

/** What COPY and ADD take from the build context; copies from an earlier stage are left out. */
function copiedFromContext(text: string): string[] {
  return text
    .replace(/\\\n/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^(?:COPY|ADD)\s/i.test(line) && !line.includes('--from='))
    .flatMap((line) => {
      const args = line.replace(/^(?:COPY|ADD)\s+/i, '').replace(/--\S+\s+/g, '').trim();
      const parts: string[] = args.startsWith('[') ? JSON.parse(args) : args.split(/\s+/);
      return parts.slice(0, -1).map((path) => path.replace(/^\.\//, '').replace(/\/$/, ''));
    });
}

/** Whether a `.dockerignore` line keeps a path, or a folder it sits in, out of the build context. */
function isIgnored(path: string, pattern: string): boolean {
  const glob = pattern.replace(/\/$/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${glob}(?:/|$)`).test(path);
}

const copied = copiedFromContext(dockerfile);
const ignorePatterns = dockerignore
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

// A pull request's CI does not build the image, so each of these would pass every check and stop
// the image build only after the merge.
describe('frontend Dockerfile', () => {
  it('copies only files that exist', () => {
    expect(copied.filter((path) => !existsSync(join(FRONTEND, path)))).toEqual([]);
  });

  it('copies nothing that .dockerignore keeps out of the build context', () => {
    expect(copied.filter((path) => ignorePatterns.some((pattern) => isIgnored(path, pattern)))).toEqual([]);
  });

  it('copies public/ exactly when there is one, or its files would go missing in the image', () => {
    expect(copied.includes('public')).toBe(existsSync(join(FRONTEND, 'public')));
  });

  it('reads continued lines, JSON form and ADD', () => {
    expect(copiedFromContext('COPY a \\\n  b ./\nCOPY ["c", "./"]\nADD d.tar /x\nCOPY --from=build /e ./')).toEqual([
      'a',
      'b',
      'c',
      'd.tar',
    ]);
  });
});
