import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FRONTEND = join(__dirname, '../../..');

/** What the image build copies from the build context; copies from an earlier stage are left out. */
function copiedFromContext(dockerfile: string): string[] {
  return dockerfile
    .split('\n')
    .filter((line) => /^COPY\s/.test(line) && !line.includes('--from='))
    .flatMap((line) =>
      line
        .replace(/^COPY\s+/, '')
        .replace(/--\S+\s+/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, -1)
    );
}

describe('frontend Dockerfile', () => {
  it('copies only files that exist, since a missing one stops the image build after the merge', () => {
    const dockerfile = readFileSync(join(FRONTEND, 'Dockerfile'), 'utf8');

    expect(copiedFromContext(dockerfile).filter((path) => !existsSync(join(FRONTEND, path)))).toEqual([]);
  });
});
