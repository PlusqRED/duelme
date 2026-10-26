import { describe, expect, it } from 'vitest';
import { getQueryClient } from '@/lib/queryClient';

describe('getQueryClient on the page server', () => {
  it('makes a fresh client for every page it renders, so no request reads another’s data', () => {
    expect(getQueryClient()).not.toBe(getQueryClient());
  });
});
