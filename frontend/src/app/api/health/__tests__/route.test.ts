import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports the environment and release the container was given', async () => {
    vi.stubEnv('APP_ENV', 'dev');
    vi.stubEnv('APP_RELEASE', 'abc');

    const body = await (await GET()).json();

    expect(body).toEqual({ status: 'ok', environment: 'dev', release: 'abc' });
  });

  it('reports unknown when the variables are unset or blank', async () => {
    vi.stubEnv('APP_ENV', undefined);
    vi.stubEnv('APP_RELEASE', ' ');

    const body = await (await GET()).json();

    expect(body).toEqual({ status: 'ok', environment: 'unknown', release: 'unknown' });
  });
});
