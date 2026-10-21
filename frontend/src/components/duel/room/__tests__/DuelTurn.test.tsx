// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, type ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDuelTurnActions } from '@/hooks/useDuelTurnActions';
import { translations } from '@/i18n/translations';
import { DuelState } from '@/lib/contracts';
import type { DuelPhase } from '@/lib/duelPhase';
import { turnView, type TurnViewer } from '@/lib/turnView';
import { duelView } from '@/lib/__tests__/helpers/duelView';

const reads = vi.hoisted(() => ({
  activeWallet: null as { address: string } | null,
  run: vi.fn(),
}));

vi.mock('@/components/sign/ActionSigningWindow', () => ({
  ActionSigningWindow: ({ open }: { open: boolean }) => <div data-testid="action-flow" data-open={String(open)} />,
}));
vi.mock('@/components/sign/JoinSigningWindow', () => ({
  JoinSigningWindow: ({ open }: { open: boolean }) => <div data-testid="join-flow" data-open={String(open)} />,
}));
vi.mock('@/components/topup/TopUpWindow', () => ({
  TopUpWindow: ({ chainId }: { chainId: number | null }) => <div data-testid="top-up" data-chain={String(chainId)} />,
}));
vi.mock('@/hooks/useActiveWallet', () => ({ useActiveWallet: () => ({ activeWallet: reads.activeWallet }) }));
vi.mock('@/hooks/useDuelTurnActions', () => ({
  useDuelTurnActions: () => ({
    run: reads.run,
    isBusy: false,
    joinFlow: { flow: null, review: null },
    actionFlow: { flow: null, activeConfig: null },
    summaryContext: {},
  }),
}));
vi.mock('@/hooks/useNicknames', () => ({
  useNicknames: () => ({ resolveDisplay: (address: string) => (address.startsWith('0xAa') ? 'Ace' : 'Bo') }),
}));
vi.mock('@/hooks/useReputationLevels', () => ({ useReputationLevels: () => ({ reputationStatsByAddress: {} }) }));
vi.mock('@/hooks/useCopyFeedback', () => ({ useCopyFeedback: () => ({ copied: false, copy: vi.fn() }) }));

const { DuelTurn } = await import('@/components/duel/room/DuelTurn');

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  reads.activeWallet = null;
  reads.run.mockClear();
});

const en = translations.en;
const CREATOR = '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa' as const;
const OPPONENT = '0x111111111111111111111111111111111111abcd' as const;
const PRIVATE_HASH = `0x${'12'.repeat(32)}` as const;
const SECRET = `0x${'34'.repeat(32)}` as const;
const GUEST: TurnViewer = { side: null, isSignedIn: false, hasKey: true, canJoin: false, shortRaw: 0n, isRelayed: true };
const CREATOR_VIEW: TurnViewer = { ...GUEST, side: 'creator', isSignedIn: true };

const purse: ComponentProps<typeof DuelTurn>['purse'] = {
  balance: { kind: 'ready', raw: 0n },
  shown: { kind: 'ready', raw: 0n },
  fromRaw: undefined,
  shortRaw: 0n,
  isCovered: false,
  isTopUpOpen: false,
  openTopUp: vi.fn(),
  closeTopUp: vi.fn(),
  retry: vi.fn(),
};

type TurnProps = ComponentProps<typeof DuelTurn>;

/** The panel with the page's moves, which the page holds (the mocked hook's). */
function TurnWithMoves(props: Omit<TurnProps, 'actions'> & { phase: DuelPhase }) {
  const { phase, ...rest } = props;
  const actions = useDuelTurnActions({
    duelId: rest.duelId,
    duel: rest.duel,
    phase,
    inviteSecret: rest.inviteSecret,
    walletAddress: rest.walletAddress,
    refetch: async () => undefined,
    openTopUp: purse.openTopUp,
  });
  return <DuelTurn {...rest} actions={actions} />;
}

function turn(overrides: Partial<Omit<TurnProps, 'actions'>> = {}, viewer = GUEST, phase: DuelPhase = 'created') {
  const duel = overrides.duel ?? duelView({ creator: CREATOR });
  return (
    <TurnWithMoves
      duelId={3}
      duel={duel}
      phase={phase}
      view={turnView(duel, phase, viewer)}
      gameName="Chess"
      inviteSecret={null}
      walletAddress={undefined}
      claimTimeout={3600}
      purse={purse}
      faces={{ creator: createRef(), opponent: createRef() }}
      onPreviewJoin={vi.fn()}
      {...overrides}
    />
  );
}

describe('DuelTurn', () => {
  it('names the players in the panel', () => {
    render(turn());

    expect(screen.getByRole('heading', { name: en['room.created.guest.title'].replace('{name}', 'Ace') })).toBeTruthy();
  });

  it('makes the move pressed once the panel has settled', () => {
    render(turn());
    act(() => vi.advanceTimersByTime(700));

    fireEvent.click(screen.getByRole('button', { name: en['room.action.signIn'] }));

    expect(reads.run).toHaveBeenCalledWith('signIn');
  });

  it('gives the creator of a public duel its plain link', () => {
    render(turn({}, CREATOR_VIEW));

    expect(screen.getByLabelText<HTMLInputElement>(en['room.share.label']).value).toBe(`${window.location.host}/duel/3`);
  });

  it('gives the creator of a private duel the link with its key', () => {
    render(turn({ duel: duelView({ creator: CREATOR, inviteHash: PRIVATE_HASH }), inviteSecret: SECRET }, CREATOR_VIEW));

    expect(screen.getByLabelText<HTMLInputElement>(en['room.share.label']).value).toBe(`${window.location.host}/duel/3#${SECRET}`);
  });

  it('never hands out a private duel’s link without its key', () => {
    render(turn({ duel: duelView({ creator: CREATOR, inviteHash: PRIVATE_HASH }) }, CREATOR_VIEW));

    expect(screen.getByLabelText<HTMLInputElement>(en['room.share.label']).value).toBe(en['room.share.unavailable']);
  });

  it('opens the top-up window on the duel’s network when asked', () => {
    reads.activeWallet = { address: OPPONENT };
    render(turn({ walletAddress: OPPONENT, purse: { ...purse, isTopUpOpen: true } }));

    expect(screen.getByTestId('top-up').dataset.chain).not.toBe('null');
  });

  it('keeps the join and action windows closed until a move opens them', () => {
    const duel = duelView({ creator: CREATOR, opponent: OPPONENT, fundedAt: 2n, state: DuelState.Funded });
    render(turn({ duel }, { ...GUEST, side: 'opponent', isSignedIn: true }, 'funded'));

    expect(screen.getByTestId('join-flow').dataset.open).toBe('false');
    expect(screen.getByTestId('action-flow').dataset.open).toBe('false');
  });
});
