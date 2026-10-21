// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translations } from '@/i18n/translations';
import type { BalanceRead } from '@/lib/balanceStatus';
import type { Game } from '@/lib/game';

const WALLET = '0x4BFa1486661d6FAa5300923bd684F261AE4776a5';
const CHESS: Game = { slug: 'chess', name: 'Chess', iconUrl: null, category: 'STRATEGY', duelCount: 1, createdAt: null, updatedAt: null };

const state = vi.hoisted(() => ({
  authenticated: false,
  createdDuelPath: null as string | null,
  balanceRaw: null as bigint | null,
  handleCreateDuelClick: vi.fn(),
  flowArgs: [] as Record<string, unknown>[],
  topUpChainId: undefined as number | null | undefined,
}));

vi.mock('@/hooks/useCreateDuelFlow', () => ({
  useCreateDuelFlow: (args: Record<string, unknown>) => {
    state.flowArgs.push(args);
    return {
      authenticated: state.authenticated,
      createdDuelPath: state.createdDuelPath,
      flow: null,
      handleCreateDuelClick: state.handleCreateDuelClick,
    };
  },
}));
vi.mock('@/components/duel/create/CreateSigning', () => ({ CreateSigning: () => null }));
vi.mock('@/components/topup/TopUpWindow', () => ({
  TopUpWindow: ({ chainId }: { chainId: number | null }) => {
    state.topUpChainId = chainId;
    return null;
  },
}));
vi.mock('@/hooks/useGameCatalog', () => ({ useGameCatalog: () => ({ games: [CHESS], isLoading: false }) }));
vi.mock('@/hooks/useContractConfig', () => ({
  useContractConfig: () => ({ minWager: 0.3, claimTimeout: 3600, maxMessageCharacters: 32, maxMessageBytes: 128 }),
}));
vi.mock('@/hooks/useGameNote', () => ({ useGameNote: () => null }));
vi.mock('@/hooks/useReputationLevels', () => ({ useReputationLevels: () => ({ reputationStatsByAddress: {} }) }));
vi.mock('@/hooks/useActiveWallet', () => ({
  useActiveWallet: () =>
    state.authenticated
      ? { activeWallet: { address: WALLET }, walletAddress: WALLET.toLowerCase() }
      : { activeWallet: undefined, walletAddress: undefined },
}));
vi.mock('@/hooks/useUsdtBalance', () => ({
  useUsdtBalance: (chainId: number, walletAddress: `0x${string}` | undefined) => {
    const read: BalanceRead | null =
      walletAddress && state.balanceRaw !== null
        ? {
            key: { chainId, walletAddress },
            status: 'success',
            data: state.balanceRaw,
            dataUpdatedAt: 1,
            isFetchedAfterMount: true,
            isPlaceholderData: false,
            isFetching: false,
          }
        : null;
    return { read, refetch: vi.fn() };
  },
}));

const { CreateDuelRoom } = await import('@/components/duel/create/CreateDuelRoom');

const en = translations.en;
const lastFlowArgs = () => state.flowArgs[state.flowArgs.length - 1];
/** The way on in the panel; the side's copy is the same bar for a wide screen. */
const wayOn = (name: string) => screen.getAllByRole('button', { name })[0] as HTMLButtonElement;

function setUpChess(stake: string) {
  render(<CreateDuelRoom />);
  fireEvent.click(screen.getByRole('button', { name: /Chess/ }));
  act(() => vi.advanceTimersByTime(320));
  fireEvent.change(screen.getByRole('textbox', { name: en['create.stake.label'] }), { target: { value: stake } });
}

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  Object.assign(state, { authenticated: false, createdDuelPath: null, balanceRaw: null, flowArgs: [], topUpChainId: undefined });
  state.handleCreateDuelClick.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CreateDuelRoom', () => {
  it('asks for a game before anything else', () => {
    render(<CreateDuelRoom />);

    expect(screen.getAllByText(en['create.bar.game'])).toHaveLength(2);
    expect(wayOn(en['create.cta']).disabled).toBe(true);
  });

  it('hands the flow the stake as the contract takes it and the game with its category', () => {
    setUpChess('4,2');

    expect(lastFlowArgs()).toMatchObject({ amount: '4.2', gameName: 'Chess', gameCategory: 'STRATEGY', isValidAmount: true, isPublic: false });
  });

  it('lets a visitor set the whole duel up and sign in only to create it', () => {
    setUpChess('5');

    fireEvent.click(wayOn(en['nav.connectWallet']));

    expect(state.handleCreateDuelClick).toHaveBeenCalledOnce();
  });

  it('creates the duel once nothing is missing', () => {
    Object.assign(state, { authenticated: true, balanceRaw: 46_700_000n });
    setUpChess('5');

    fireEvent.click(wayOn(en['create.cta']));

    expect(state.handleCreateDuelClick).toHaveBeenCalledOnce();
  });

  it('tops up a wallet short of the stake, right from the way on', () => {
    Object.assign(state, { authenticated: true, balanceRaw: 1_000_000n });
    setUpChess('5');

    fireEvent.click(wayOn(en['topup.action']));

    expect(state.topUpChainId).toBe(421614);
  });

  it('hands over the link to send once the duel is created', () => {
    Object.assign(state, { authenticated: true, balanceRaw: 46_700_000n, createdDuelPath: '/duel/7#0xabc' });

    render(<CreateDuelRoom />);

    expect(screen.getByRole('heading', { name: en['room.created.creator.title'] })).toBeTruthy();
    expect(screen.getByRole('link', { name: en['create.goToDuel'] }).getAttribute('href')).toBe('/duel/7#0xabc');
    expect(screen.queryByRole('button', { name: en['create.cta'] })).toBeNull();
  });

  it('sets up another duel from scratch', () => {
    Object.assign(state, { authenticated: true, createdDuelPath: '/duel/7' });
    render(<CreateDuelRoom />);
    act(() => vi.advanceTimersByTime(700));

    fireEvent.click(screen.getByRole('button', { name: en['create.again'] }));

    expect(screen.getByRole('heading', { name: en['create.title'] })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en['create.head.new']);
  });
});
