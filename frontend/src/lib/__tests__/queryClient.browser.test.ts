// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { getQueryClient } from '@/lib/queryClient';

describe('getQueryClient in the browser', () => {
  it('keeps one client for the tab', () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });
});
