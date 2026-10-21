// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DuelArena } from '@/components/duel/room/DuelArena';
import type { DuelHistory } from '@/components/duel/room/DuelHistory';
import type { DuelTurn } from '@/components/duel/room/DuelTurn';
import type { StakePurse } from '@/hooks/useStakePurse';
import { DuelState } from '@/lib/contracts';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const seen = vi.hoisted(() => ({
  arena: null as ComponentProps<typeof DuelArena> | null,
  turn: null as ComponentProps<typeof DuelTurn> | null,
  history: null as ComponentProps<typeof DuelHistory> | null,
  purse: null as StakePurse | null,
  run: vi.fn(),
  isBusy: false,
}));

vi.mock('@/components/duel/room/DuelArena', () => ({
  DuelArena: (props: ComponentProps<typeof DuelArena>) => {
    seen.arena = props;
    return null;
  },
}));
vi.mock('@/components/duel/room/DuelTurn', () => ({
  DuelTurn: (props: ComponentProps<typeof DuelTurn>) => {
    seen.turn = props;
    return null;
  },
}));
vi.mock('@/components/duel/room/DuelHistory', () => ({
  DuelHistory: (props: ComponentProps<typeof DuelHistory>) => {
    seen.history = props;
    return null;
  },
}));
vi.mock('@/components/duel/room/RoomFacts', () => ({ RoomFacts: () => <p>facts</p> }));
vi.mock('@/hooks/useRelayerStatus', () => ({ useRelayerStatus: () => ({ isRelayEnabled: true }) }));
vi.mock('@/hooks/useStakePurse', () => ({ useStakePurse: () => seen.purse }));
vi.mock('@/hooks/useDuelTurnActions', () => ({ useDuelTurnActions: () => ({ run: seen.run, isBusy: seen.isBusy }) }));

const { RoomGrid } = await import('@/components/duel/room/RoomGrid');

afterEach(() => {
  cleanup();
  seen.purse = null;
  seen.run.mockClear();
  seen.isBusy = false;
});

const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const READER = '0x111111111111111111111111111111111111abcd' as const;

function purse(overrides: Partial<StakePurse> = {}): StakePurse {
  return {
    balance: { kind: 'ready', raw: 2_000_000n },
    shown: { kind: 'ready', raw: 2_000_000n },
    fromRaw: undefined,
    shortRaw: 3_000_000n,
    isCovered: false,
    isTopUpOpen: false,
    openTopUp: vi.fn(),
    closeTopUp: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  };
}

function grid(overrides: Partial<ComponentProps<typeof RoomGrid>> = {}) {
  seen.purse ??= purse();
  return render(
    <RoomGrid
      duelId={3}
      duel={duelView({ creator: CREATOR })}
      phase="created"
      game={{ name: 'Chess', category: null }}
      inviteSecret={null}
      walletAddress={undefined}
      isSignedIn={false}
      claimTimeout={3600}
      refetch={vi.fn(async () => undefined)}
      {...overrides}
    />
  );
}

describe('RoomGrid', () => {
  it('asks a signed-out reader to sign in, the open seat answering them', () => {
    grid();

    expect(seen.turn?.view.blocks.at(-1)).toEqual({ type: 'actions', actions: [{ id: 'signIn' }] });
    expect(seen.arena?.openSeat).toMatchObject({ isTaking: false, purse: null });
  });

  it('signs a signed-out reader in at a press on the open seat, as the panel’s button does', () => {
    grid();

    seen.arena?.openSeat?.onTake?.();

    expect(seen.run).toHaveBeenCalledWith('signIn');
  });

  it('tops up at a press on the open seat while the wallet is short of the stake', () => {
    seen.purse = purse();
    grid({ walletAddress: READER, isSignedIn: true });

    seen.arena?.openSeat?.onTake?.();

    expect(seen.run).toHaveBeenCalledWith('topUp');
  });

  it('joins at a press on the open seat once the wallet holds the stake', () => {
    seen.purse = purse({ shortRaw: 0n, balance: { kind: 'ready', raw: 9_000_000n }, shown: { kind: 'ready', raw: 9_000_000n } });
    grid({ walletAddress: READER, isSignedIn: true });

    seen.arena?.openSeat?.onTake?.();

    expect(seen.run).toHaveBeenCalledWith('join');
  });

  it('takes no press on the open seat while a move is under way', () => {
    seen.isBusy = true;
    grid();

    expect(seen.arena?.openSeat?.onTake).toBeNull();
  });

  it('hands the panel the page’s moves', () => {
    grid();

    expect(seen.turn?.actions.run).toBe(seen.run);
  });

  it('holds the stake against the wallet of a reader who could join', () => {
    seen.purse = purse();
    grid({ walletAddress: READER, isSignedIn: true });

    expect(seen.turn?.view.blocks.some((block) => block.type === 'purse')).toBe(true);
    expect(seen.arena?.openSeat?.purse).toEqual({ text: '2 USDT', isShort: true });
  });

  it('offers a top-up for the stake the wallet lacks', () => {
    seen.purse = purse();
    grid({ walletAddress: READER, isSignedIn: true });

    const actions = seen.turn?.view.blocks.find((block) => block.type === 'actions');
    expect(actions).toEqual({ type: 'actions', actions: [{ id: 'topUp', amountRaw: 3_000_000n }] });
  });

  it('leaves the creator’s own duel without an open seat to take', () => {
    grid({ walletAddress: CREATOR.toLowerCase() as `0x${string}`, isSignedIn: true });

    expect(seen.arena?.openSeat).toBeUndefined();
    expect(seen.arena?.viewerSide).toBe('creator');
  });

  it('bars the creator from their own duel’s open seat', () => {
    grid({ walletAddress: CREATOR.toLowerCase() as `0x${string}`, isSignedIn: true });

    expect(seen.arena?.isOwnOpenSeat).toBe(true);
  });

  it('bars nobody else from the open seat', () => {
    grid({ walletAddress: READER, isSignedIn: true });

    expect(seen.arena?.isOwnOpenSeat).toBe(false);
  });

  it('offers no seat once the duel is under way', () => {
    grid({ duel: duelView({ creator: CREATOR, opponent: READER, fundedAt: 2n, state: DuelState.Funded }), phase: 'funded' });

    expect(seen.arena?.openSeat).toBeUndefined();
  });

  it('lets the history call only a signed-in reader You', () => {
    grid({ walletAddress: READER, isSignedIn: false });

    expect(seen.history?.walletAddress).toBeUndefined();
  });

  it('puts the duel’s facts beside the arena', () => {
    grid();

    expect(screen.getByText('facts')).toBeTruthy();
  });
});
