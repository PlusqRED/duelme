import type { SetStateAction } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CreateDuelFlowSession } from '@/lib/createDuelFlow';
import { createDuelFlowActions } from '@/lib/createDuelFlowActions';

type CreateDuelFlowActionsOptions = Parameters<typeof createDuelFlowActions>[0];

const WALLET = '0x2222222222222222222222222222222222222222' as const;
const CONTRACT = '0x3333333333333333333333333333333333333333' as const;
const TOKEN = '0x4444444444444444444444444444444444444444' as const;

function setup(overrides: Partial<CreateDuelFlowActionsOptions> = {}) {
  let flow: CreateDuelFlowSession | null = null;
  const setFlow = (update: SetStateAction<CreateDuelFlowSession | null>) => {
    flow = typeof update === 'function' ? update(flow) : update;
  };

  const options: CreateDuelFlowActionsOptions = {
    activeWalletAddress: WALLET,
    amount: '5',
    appToast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), transactionError: vi.fn() },
    authenticated: true,
    chainId: 421614,
    chainName: 'Arbitrum Sepolia',
    connectedChainId: 421614,
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
    setFlow,
    setRedirectTarget: vi.fn(),
    switchChainAsync: vi.fn(async () => undefined),
    t: (key) => key,
    tokenAddress: TOKEN,
    approveToken: vi.fn(),
    ...overrides,
  };

  return { actions: createDuelFlowActions(options), getFlow: () => flow };
}

describe('createDuelFlowActions — the duel message', () => {
  it('sends no message when the player typed only spaces', async () => {
    const { actions, getFlow } = setup({ message: '   \n  ' });

    await actions.handleCreateDuelClick();

    expect(getFlow()?.draft.message).toBe('');
  });

  it('keeps the words and drops the spaces around them', async () => {
    const { actions, getFlow } = setup({ message: '  gg, best of three  ' });

    await actions.handleCreateDuelClick();

    expect(getFlow()?.draft.message).toBe('gg, best of three');
  });
});
