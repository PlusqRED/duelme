import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/duels/RecentDuelsBoard', () => ({ RecentDuelsBoard: () => null }));

const { default: RecentDuelsPage } = await import('@/app/duels/recent/page');

describe('RecentDuelsPage', () => {
  it('opens searched for the `q` the site’s search action sends', async () => {
    const page = await RecentDuelsPage({ searchParams: Promise.resolve({ q: 'chess' }) });

    expect(page.props.initialQuery).toBe('chess');
  });

  it('opens unsearched without one', async () => {
    const page = await RecentDuelsPage({ searchParams: Promise.resolve({}) });

    expect(page.props.initialQuery).toBe('');
  });
});
