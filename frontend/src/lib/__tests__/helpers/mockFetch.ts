import { vi } from 'vitest';

/**
 * Stubs `globalThis.fetch` with a single canned Response and returns the spy.
 *
 * `json` is invoked as a method on the overrides object so a test can write
 * `json: async () => ({ … })` and still have `this` be its own literal; the
 * `?? {}` keeps a body-less response from throwing when something parses it.
 *
 * Not named `*.test.ts`, so vitest's `include` glob does not collect it.
 */
export function mockFetch(response: Partial<Response> = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.json?.call(response) ?? {},
    ...response,
  } as Response);
  vi.stubGlobal('fetch', fn);
  return fn;
}
