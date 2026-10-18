import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHAIN } from '@/lib/constants';
import type { CreateDuelFlowSession } from '@/lib/createDuelFlow';
import { createDuelFlowActions } from '@/lib/createDuelFlowActions';
import { captureFlowState, mockAppToast } from './helpers/flowHarness';

type CreateDuelFlowActionsOptions = Parameters<typeof createDuelFlowActions>[0];

const WALLET = '0x2222222222222222222222222222222222222222' as const;
const CONTRACT = '0x3333333333333333333333333333333333333333' as const;
const TOKEN = '0x4444444444444444444444444444444444444444' as const;

function setup(overrides: Partial<CreateDuelFlowActionsOptions> = {}) {
  const state = captureFlowState<CreateDuelFlowSession>();

  const options: CreateDuelFlowActionsOptions = {
    activeWalletAddress: WALLET,
    amount: '5',
    appToast: mockAppToast(),
    authenticated: true,
    chainId: DEFAULT_CHAIN.id,
    chainName: DEFAULT_CHAIN.name,
    connectedChainId: DEFAULT_CHAIN.id,
    contractAddress: CONTRACT,
    createDuel: vi.fn(),
    fundsViaPermit: true,
    gameName: 'Chess',
    isPublic: true,
    isValidAmount: true,
    isValidMessage: true,
    login: vi.fn(),
    message: '',
    ready: true,
    reset: vi.fn(),
    readLatestAllowance: vi.fn(async () => 0n),
    setFlow: state.setFlow,
    setRedirectTarget: vi.fn(),
    switchChainAsync: vi.fn(async () => undefined),
    t: (key) => key,
    tokenAddress: TOKEN,
    approveToken: vi.fn(),
    ...overrides,
  };

  return { actions: createDuelFlowActions(options), state };
}

describe('createDuelFlowActions — the duel message', () => {
  it('sends no message when the player typed only spaces', async () => {
    const { actions, state } = setup({ message: '   \n  ' });

    await actions.handleCreateDuelClick();

    expect(state.flow?.draft.message).toBe('');
  });

  it('keeps the words and drops the spaces around them', async () => {
    const { actions, state } = setup({ message: '  gg, best of three  ' });

    await actions.handleCreateDuelClick();

    expect(state.flow?.draft.message).toBe('gg, best of three');
  });
});
