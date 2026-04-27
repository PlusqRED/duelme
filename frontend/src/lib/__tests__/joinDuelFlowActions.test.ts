import type { SetStateAction } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TranslationKey, TranslationParams } from '@/i18n/translations';
import { translations } from '@/i18n/translations';
import type { JoinDuelFlowSession } from '@/lib/joinDuelFlow';
import { joinDuelFlowActions } from '@/lib/joinDuelFlowActions';
import { hashInviteSecret } from '@/lib/invite';

type JoinDuelFlowActionsOptions = Parameters<typeof joinDuelFlowActions>[0];

const CREATOR = '0x1111111111111111111111111111111111111111' as const;
const VIEWER = '0x2222222222222222222222222222222222222222' as const;
const CONTRACT = '0x3333333333333333333333333333333333333333' as const;
const TOKEN = '0x4444444444444444444444444444444444444444' as const;
const INVITE_SECRET = `0x${'5'.repeat(64)}` as const;
const INVITE_HASH = hashInviteSecret(INVITE_SECRET);

function t(key: TranslationKey, params?: TranslationParams) {
  let value = String(translations.en[key]);

  if (!params) {
    return value;
  }

  for (const [paramKey, paramValue] of Object.entries(params)) {
    value = value.replaceAll(`{${paramKey}}`, String(paramValue));
  }

  return value;
}

function setup(overrides: Partial<JoinDuelFlowActionsOptions> = {}) {
  let flow: JoinDuelFlowSession | null = null;
  const setFlow = (update: SetStateAction<JoinDuelFlowSession | null>) => {
    flow = typeof update === 'function'
      ? update(flow)
      : update;
  };

  const appToast = {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    transactionError: vi.fn(),
  };

  const options: JoinDuelFlowActionsOptions = {
    appToast,
    chainId: 421614,
    chainName: 'Arbitrum Sepolia',
    connectedChainId: 421614,
    contractAddress: CONTRACT,
    duelId: 7,
    inviteSecret: INVITE_SECRET,
    joinDuel: vi.fn(),
    readLatestAllowance: vi.fn(async () => 1000n),
    reset: vi.fn(),
    setFlow,
    switchChainAsync: vi.fn(async () => undefined),
    t,
    tokenAddress: TOKEN,
    approveToken: vi.fn(),
    wagerAmount: 100n,
    creatorAddress: CREATOR,
    viewerAddress: VIEWER,
    duelInviteHash: INVITE_HASH,
    ...overrides,
  };

  return {
    actions: joinDuelFlowActions(options),
    appToast,
    options,
    get flow() {
      return flow;
    },
    setFlowDirect(nextFlow: JoinDuelFlowSession | null) {
      flow = nextFlow;
    },
  };
}

describe('joinDuelFlowActions', () => {
  it('does not open the join flow for the duel creator', () => {
    const harness = setup({ viewerAddress: CREATOR });

    harness.actions.handleOpenJoinFlow();

    expect(harness.appToast.error).toHaveBeenCalledWith('duel.cannotJoinOwnDuel');
    expect(harness.options.reset).not.toHaveBeenCalled();
    expect(harness.flow).toBeNull();
  });

  it('does not open the join flow before the wallet address is ready', () => {
    const harness = setup({ viewerAddress: undefined });

    harness.actions.handleOpenJoinFlow();

    expect(harness.appToast.error).toHaveBeenCalledWith('toast.walletNotReady');
    expect(harness.options.reset).not.toHaveBeenCalled();
    expect(harness.flow).toBeNull();
  });

  it('blocks the final join step if the active wallet switches to the creator', async () => {
    const initial = setup();
    initial.actions.handleOpenJoinFlow();
    expect(initial.flow).not.toBeNull();

    const switched = setup({ viewerAddress: CREATOR });
    switched.setFlowDirect(initial.flow);

    await switched.actions.handleJoinTransaction(initial.flow);

    expect(switched.options.readLatestAllowance).not.toHaveBeenCalled();
    expect(switched.options.joinDuel).not.toHaveBeenCalled();
    expect(switched.flow?.actionState).toBe('error');
    expect(switched.flow?.errorMessage).toBe('You cannot join your own duel.');
  });

  it('opens the join flow for a non-creator with a valid invite secret', () => {
    const harness = setup();

    harness.actions.handleOpenJoinFlow();

    expect(harness.appToast.error).not.toHaveBeenCalled();
    expect(harness.options.reset).toHaveBeenCalledOnce();
    expect(harness.flow?.stage).toBe('review');
  });
});
