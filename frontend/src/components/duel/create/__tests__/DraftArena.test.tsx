// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { DEFAULT_CHAIN } from '@/lib/constants';
import type { Game } from '@/lib/game';

vi.mock('@/hooks/useReputationLevels', () => ({ useReputationLevels: () => ({ reputationStatsByAddress: {} }) }));

const { DraftArena } = await import('@/components/duel/create/DraftArena');

afterEach(cleanup);

const en = translations.en;
const CREATOR = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const CHESS: Game = { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 1, createdAt: null, updatedAt: null };

function arena(overrides: Partial<Parameters<typeof DraftArena>[0]> = {}) {
  return render(
    <DraftArena
      game={null}
      created={null}
      address={null}
      chainId={DEFAULT_CHAIN.id}
      stakeRaw={null}
      stakeLabel="?"
      message=""
      isPublic={false}
      balanceLabel={null}
      bumpKey={0}
      creatorFace={createRef()}
      {...overrides}
    />
  );
}

describe('DraftArena', () => {
  it('names a duel without a game a new duel, drawn as a draft', () => {
    arena();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en['create.head.new']);
    expect(screen.getByText(en['create.state.draft'])).toBeTruthy();
    expect(screen.getByText(en['room.vault.draft'])).toBeTruthy();
  });

  it('keeps the creator’s seat for a visitor until they sign in', () => {
    arena();

    expect(screen.getByText(en['create.seat.signIn']).className).toContain('text-red-deep');
  });

  it('seats the signed-in creator with what is in their wallet', () => {
    arena({ address: CREATOR, balanceLabel: '46.7' });

    expect(screen.getByText(en['room.you'])).toBeTruthy();
    expect(screen.getByText('0x4BFa...76a5')).toBeTruthy();
    expect(screen.getByText(/46\.7/).textContent).toBe('46.7\u00a0USDT');
  });

  it('says what the creator’s seat will say', () => {
    arena({ message: 'best of 3' });

    expect(screen.getByText('“best of 3”')).toBeTruthy();
  });

  it.each([
    [false, 'create.seat.link'],
    [true, 'create.seat.anyone'],
  ] as const)('says who may take the open seat when public is %s', (isPublic, key) => {
    arena({ isPublic });

    expect(screen.getByText(en[key])).toBeTruthy();
  });

  it('shows the game picked', () => {
    arena({ game: CHESS });

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Chess');
    expect(screen.getByText(en['category.STRATEGY'])).toBeTruthy();
  });

  it('becomes the duel page’s own once the duel is created, waiting for an opponent', () => {
    arena({ game: CHESS, created: { id: 7 }, address: CREATOR, stakeRaw: 5_000_000n, stakeLabel: '5' });

    expect(screen.getByText(en['duel.waiting'])).toBeTruthy();
    expect(screen.getByText(en['room.vault.waiting'])).toBeTruthy();
    expect(screen.queryByText(en['create.seat.link'])).toBeNull();
    expect(screen.getByText(en['duel.title'].replace('{id}', '7'))).toBeTruthy();
  });
});
