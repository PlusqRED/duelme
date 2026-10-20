import type { Page } from '@playwright/test';

/**
 * Collects what the page throws. React reports a first render in the browser that differs from the
 * server's as one of these too.
 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}
