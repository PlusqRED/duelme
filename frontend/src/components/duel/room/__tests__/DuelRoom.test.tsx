// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import { DuelState, type Duel } from '@/lib/contracts';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa';
const reads = vi.hoisted(() => ({
  duel: undefined as Duel | undefined,
  isLoading: false,
  isError: false,
  authenticated: false,
  wallet: undefined as string | undefined,
  meta: null as { gameName: string; category: null } | null,
}));

vi.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ authenticated: reads.authenticated }) }));
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ walletAddress: reads.wallet }) }));
vi.mock('@/hooks/useContractConfig', () => ({ useContractConfig: () => ({ claimTimeout: 3600 }) }));
vi.mock('@/hooks/useDuel', () => ({
  useDuel: () => ({ duel: reads.duel, isLoading: reads.isLoading, isError: reads.isError, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useDuelMeta', () => ({ useDuelMeta: () => ({ meta: reads.meta, isLoading: false }) }));
vi.mock('@/components/duel/room/RoomGrid', () => ({
  RoomGrid: (props: { phase: string; isSignedIn: boolean; walletAddress?: string; game: { name: string } | null }) => (
    <p data-testid="grid">{`${props.phase}|${props.isSignedIn}|${props.walletAddress ?? 'no wallet'}|${props.game?.name ?? 'no game'}`}</p>
  ),
}));

const { DuelRoom } = await import('@/components/duel/room/DuelRoom');

const en = translations.en;

beforeEach(() => {
  Object.assign(reads, { duel: duelView(), isLoading: false, isError: false, authenticated: false, wallet: undefined, meta: null });
});

afterEach(cleanup);

describe('DuelRoom', () => {
  it('waits for the duel', () => {
    reads.isLoading = true;

    render(<DuelRoom duelId={6} />);

    expect(screen.queryByTestId('grid')).toBeNull();
    expect(document.querySelector('.animate-spin')).not.toBeNull();
  });

  it.each([
    ['an id nobody issued', () => (reads.duel = duelView({ state: DuelState.Nonexistent }))],
    ['a duel that never loaded', () => Object.assign(reads, { duel: undefined, isError: true })],
  ])('says the duel was not found for %s', (_, arrange) => {
    arrange();

    render(<DuelRoom duelId={6} />);

    expect(screen.getByText(en['duel.notFound'])).toBeTruthy();
    expect(screen.queryByTestId('grid')).toBeNull();
  });

  it('lays out the duel in its phase, with its game', () => {
    reads.meta = { gameName: 'Chess', category: null };

    render(<DuelRoom duelId={6} />);

    expect(screen.getByTestId('grid').textContent).toBe('created|false|no wallet|Chess');
  });

  it('leads a passer-by back to the public duels', () => {
    render(<DuelRoom duelId={6} />);

    expect(screen.getByRole('link', { name: en['room.back.public'] }).getAttribute('href')).toBe('/duels/public');
  });

  it('leads a signed-in player back to their duels, from their seat', () => {
    Object.assign(reads, { authenticated: true, wallet: CREATOR.toLowerCase() });

    render(<DuelRoom duelId={6} />);

    expect(screen.getByRole('link', { name: en['room.back.mine'] }).getAttribute('href')).toBe('/dashboard');
    expect(screen.getByTestId('grid').textContent).toBe(`created|true|${CREATOR.toLowerCase()}|no game`);
  });

  it('reads a reported win whose time ran out as timed out', () => {
    reads.duel = duelView({ state: DuelState.WinnerClaimed, claimTimestamp: 1n });

    render(<DuelRoom duelId={6} />);

    expect(screen.getByTestId('grid').textContent).toMatch(/^timeout\|/);
  });
});
