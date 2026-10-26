import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const OPS = join(__dirname, '../../../../ops');

/** One service's block of a compose file: its lines up to the next service or top-level key. */
function serviceBlock(compose: string, service: string): string {
  const start = compose.indexOf(`\n  ${service}:\n`);
  const rest = compose.slice(start + 1);
  const end = rest.slice(1).search(/\n(?: {2})?[a-z]/);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

// Without the variable the game pages fall back to reading in the browser, with no error anywhere:
// search engines would get the empty page again, and nothing would say so.
describe.each(['dev', 'prod'])('the %s stack', (environment) => {
  const compose = readFileSync(join(OPS, `docker-compose.${environment}.yml`), 'utf8');

  it('tells the page server where the backend is', () => {
    expect(serviceBlock(compose, 'frontend')).toContain('API_INTERNAL_URL: http://backend:8080/api/v1');
  });

  it('puts the backend on the page server’s network, on that port', () => {
    const backend = serviceBlock(compose, 'backend');

    expect(backend).toMatch(/networks:\n(?:\s+- \w+\n)*\s+- frontend\n/);
    expect(backend).toMatch(/:8080"/);
  });
});
