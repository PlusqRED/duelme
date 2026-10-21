import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/duel/room/DuelRoom', () => ({ DuelRoom: () => null }));
vi.mock('@/components/duel/room/DuelNotFound', () => ({ DuelNotFound: () => null }));

const { default: DuelPage } = await import('../page');
const { DuelRoom } = await import('@/components/duel/room/DuelRoom');
const { DuelNotFound } = await import('@/components/duel/room/DuelNotFound');

function open(id: string) {
  return DuelPage({ params: Promise.resolve({ id }) });
}

describe('the duel page', () => {
  it('opens the duel its address names', async () => {
    const page = await open('6');

    expect(page.type).toBe(DuelRoom);
    expect(page.props).toEqual({ duelId: 6 });
  });

  it.each(['abc', '6x', '-1', '1.5', '', ' 6', '9007199254740993'])('says %j names no duel', async (id) => {
    const page = await open(id);

    expect(page.type).toBe(DuelNotFound);
  });
});
